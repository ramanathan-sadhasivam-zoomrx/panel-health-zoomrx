const database = require('../config/database');
const sentimentAnalyzer = require('../utils/sentimentAnalyzer');
const experienceScoreCalculator = require('../utils/experienceScoreCalculator');

class SurveyModel {
  constructor() {
    // Cache for survey data to prevent multiple queries
    this.surveyCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes cache
  }

  // Get all surveys
  async getAllSurveys() {
    const cacheKey = 'allSurveys';
    const now = Date.now();
    
    // Check cache first
    if (this.surveyCache.has(cacheKey)) {
      const cached = this.surveyCache.get(cacheKey);
      if (now - cached.timestamp < this.cacheExpiry) {
        return cached.data;
      }
    }

    try {
      // Query 1: Get all surveys with basic info and most recent active project wave
      const surveysQuery = `
        SELECT 
          s.id,
          lsl.surveyls_title as surveyTitle,
          recent_pw.crm_element_id as crmId,
          s.status,
          s.type as survey_type,
          w.id as wave_id,
          pw.id as project_wave_id,
          p.id as project_id,
          recent_pw.id as recent_project_wave_id,
          last_wave.id as last_wave_id
        FROM surveys s
        LEFT JOIN lime_surveys_languagesettings lsl ON lsl.surveyls_survey_id = s.id
        LEFT JOIN waves w ON s.id = w.survey_id
        LEFT JOIN project_waves_waves pww ON w.id = pww.wave_id
        LEFT JOIN project_waves pw ON pww.project_wave_id = pw.id
        LEFT JOIN projects p ON pw.project_id = p.id
        LEFT JOIN (
          SELECT 
            survey_id,
            MAX(id) as id
          FROM waves 
          WHERE status = 1
          GROUP BY survey_id
        ) last_wave ON s.id = last_wave.survey_id
        LEFT JOIN (
          SELECT 
            s2.id as survey_id,
            pw2.id as id,
            pw2.project_id,
            pw2.crm_element_id,
            ROW_NUMBER() OVER (PARTITION BY s2.id ORDER BY pw2.id DESC) as rn
          FROM surveys s2
          LEFT JOIN waves w2 ON s2.id = w2.survey_id AND w2.status = 1
          LEFT JOIN project_waves_waves pww2 ON w2.id = pww2.wave_id
          LEFT JOIN project_waves pw2 ON pww2.project_wave_id = pw2.id
          WHERE pw2.id IS NOT NULL
        ) recent_pw ON s.id = recent_pw.survey_id AND recent_pw.rn = 1
        WHERE s.active = 1
        ORDER BY s.id DESC
      `;
      
      // Query 2: Get all user ratings, drop-off, and screen-out data in one query
      const metricsQuery = `
        SELECT 
          s.id as survey_id,
          AVG(uwd.feedback_rating) as average_rating,
          COUNT(uwd.id) as feedback_count,
          COUNT(*) as total_users,
          SUM(CASE WHEN uw.status = 0 THEN 1 ELSE 0 END) as partial_users,
          SUM(CASE WHEN uw.status = 1 THEN 1 ELSE 0 END) as completed_users,
          SUM(CASE WHEN uw.status = 2 THEN 1 ELSE 0 END) as wave_screened_out,
          SUM(CASE WHEN uw.status = 3 THEN 1 ELSE 0 END) as panel_screened_out,
          SUM(CASE WHEN uw.status = 4 THEN 1 ELSE 0 END) as quota_screened_out,
          SUM(CASE WHEN uw.status IN (2, 3, 4) THEN 1 ELSE 0 END) as screened_out_users,
          ROUND((SUM(CASE WHEN uw.status = 0 THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as dropoff_percentage,
          ROUND((SUM(CASE WHEN uw.status IN (2, 3, 4) THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as screenout_percentage
        FROM surveys s
        LEFT JOIN waves w ON s.id = w.survey_id 
        LEFT JOIN users_waves uw ON w.id = uw.wave_id AND uw.start_date IS NOT NULL
        LEFT JOIN users_wave_details uwd ON uw.id = uwd.id AND uwd.feedback_rating > 0
        WHERE s.active = 1
          AND uw.start_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY s.id
      `;
      
      // Query 3: Get screener questions data (corrected)
      const screenerQuery = `
        SELECT 
          s.id as survey_id,
          COUNT(DISTINCT group_data.gid) as screener_group_count,
          SUM(group_data.questions_in_group) as total_screener_questions
        FROM surveys s
        LEFT JOIN (
            SELECT 
                all_q.sid,
                all_q.gid,
                COUNT(DISTINCT all_q.qid) as questions_in_group
            FROM lime_questions screener_q
            JOIN lime_question_attributes qa ON screener_q.qid = qa.qid
            JOIN lime_questions all_q ON all_q.sid = screener_q.sid AND all_q.gid = screener_q.gid
            WHERE qa.attribute IN ('screener_failure', 'panel_screener_failure', 'wave_prescreener')
                AND screener_q.parent_qid = 0
                AND all_q.parent_qid = 0
            GROUP BY all_q.sid, all_q.gid
        ) group_data ON s.id = group_data.sid
        WHERE s.active = 1
        GROUP BY s.id
      `;
      
      // Query 4: Get all qualitative comments for sentiment analysis
      const commentsQuery = `
        SELECT 
          s.id as survey_id,
          uwd.feedback_rating,
          uwd.feedback_comment
        FROM surveys s
        LEFT JOIN waves w ON s.id = w.survey_id AND w.status = 1
        LEFT JOIN users_waves uw ON w.id = uw.wave_id AND uw.start_date IS NOT NULL
        LEFT JOIN users_wave_details uwd ON uw.id = uwd.id
        WHERE s.active = 1
          AND s.enable_feedback = 1
          AND uwd.feedback_comment IS NOT NULL
          AND uwd.feedback_comment != ''
          AND uw.start_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        ORDER BY s.id
      `;

      // Execute all queries in parallel
      const [surveys, metrics, screenerData, commentsData] = await Promise.all([
        database.query(surveysQuery),
        database.query(metricsQuery),
        database.query(screenerQuery),
        database.query(commentsQuery)
      ]);

      // Process all data in code
      const surveysWithMetrics = await this.processAllSurveyData(surveys, metrics, screenerData, commentsData);

      // Cache the results
      this.surveyCache.set(cacheKey, {
        data: surveysWithMetrics,
        timestamp: now
      });

      return surveysWithMetrics;
    } catch (error) {
      console.error('Error in getAllSurveys:', error);
      throw error;
    }
  }

  // Process all survey data in code
  async processAllSurveyData(surveys, metrics, screenerData, commentsData) {
    // Create lookup maps for faster processing
    const metricsMap = new Map(metrics.map(m => [m.survey_id, m]));
    const screenerMap = new Map(screenerData.map(s => [s.survey_id, s]));
    const commentsMap = new Map();
    
    // Group comments by survey
    commentsData.forEach(comment => {
      if (!commentsMap.has(comment.survey_id)) {
        commentsMap.set(comment.survey_id, []);
      }
      commentsMap.get(comment.survey_id).push(comment);
    });

    // Process each survey
    const surveysWithMetrics = await Promise.all(surveys.map(async (survey) => {
      const surveyMetrics = metricsMap.get(survey.id) || {};
      const surveyScreener = screenerMap.get(survey.id) || {};
      const surveyComments = commentsMap.get(survey.id) || [];

      // Calculate sentiment from comments
      const userSentiment = surveyComments.length > 0 
        ? sentimentAnalyzer.calculateAverageSentiment(surveyComments.map(c => c.feedback_comment))
        : 0;

      // Calculate experience score
      const experienceScore = this.calculateExperienceScoreFromData({
        userRating: surveyMetrics.average_rating || 0,
        userSentiment,
        dropoffRate: surveyMetrics.dropoff_percentage || 0,
        screenoutRate: surveyMetrics.screenout_percentage || 0,
        screenerQuestionCount: surveyScreener.total_screener_questions || 0
      });

      return {
        ...survey,
        userRating: surveyMetrics.average_rating || 0,
        userSentiment,
        dropOffPercent: surveyMetrics.dropoff_percentage || 0,
        screenOutPercent: surveyMetrics.screenout_percentage || 0,
        questionsInScreener: surveyScreener.total_screener_questions || 0,
        qualitativeComments: surveyComments.length,
        experienceScore: experienceScore.experienceScore,
        experienceCategory: experienceScore.category,
        experienceColor: experienceScore.color,
        experienceBreakdown: experienceScore.breakdown,
        adminPortalLink: `https://ap.zoomrx.com/#/projects/view/${survey.project_id}?pw-id=${survey.recent_project_wave_id}&s-id=${survey.id}&wave-id=${survey.last_wave_id}`,
        calculationDetails: {
          dropoff: {
            total_users: surveyMetrics.total_users || 0,
            partial_users: surveyMetrics.partial_users || 0,
            completed_users: surveyMetrics.completed_users || 0
          },
          screenout: {
            total_users: surveyMetrics.total_users || 0,
            wave_screened_out: surveyMetrics.wave_screened_out || 0,
            panel_screened_out: surveyMetrics.panel_screened_out || 0,
            quota_screened_out: surveyMetrics.quota_screened_out || 0,
            total_screened_out: surveyMetrics.screened_out_users || 0
          }
        }
      };
    }));

    return surveysWithMetrics;
  }

  // Calculate experience score from data (without database query)
  calculateExperienceScoreFromData(data) {
    const { userRating, userSentiment, dropoffRate, screenoutRate, screenerQuestionCount } = data;
    
    // Use raw values as specified in requirements document with minimum user rating of 1
    const rawData = {
      userRating: Math.max(1, userRating || 0), // Minimum user rating of 1
      userSentiment: userSentiment || 0,
      dropoffRate: dropoffRate || 0,
      screenoutRate: screenoutRate || 0,
      screenerQuestionCount: screenerQuestionCount || 0
    };
    
    try {
      // Use the experience score calculator with raw values
      const experienceScore = experienceScoreCalculator.calculateExperienceScore(rawData);

      // The experience score calculator already handles 0-100 clamping
      return {
        experienceScore: experienceScore.score,
        category: experienceScoreCalculator.getScoreCategory(experienceScore.score),
        color: experienceScoreCalculator.getScoreColor(experienceScore.score),
        breakdown: experienceScore.breakdown
      };
    } catch (error) {
      console.error('Error calculating experience score:', error);
      
      // Return a fallback experience score
      return {
        experienceScore: 50, // Neutral score
        category: 'fair',
        color: 'text-yellow-600',
        breakdown: {
          userRating: { value: 5, contribution: 17.5, weight: 35 },
          userSentiment: { value: 0, contribution: 12.5, weight: 25 },
          dropoffRate: { value: 50, contribution: 10, weight: 20 },
          screenoutRate: { value: 50, contribution: 7.5, weight: 15 },
          screenerQuestionCount: { value: 5, contribution: 2.5, weight: 5 }
        }
      };
    }
  }

  // No validation methods needed - using raw values as per requirements document

  // Get survey by ID
  async getSurveyById(id) {
    const query = `
      SELECT 
        s.id,
        lsl.surveyls_title as surveyTitle,
        recent_pw.crm_element_id as crmId,
        s.status,
        s.type as survey_type,
        w.id as wave_id,
        pw.id as project_wave_id,
        p.id as project_id,
        recent_pw.id as recent_project_wave_id,
        last_wave.id as last_wave_id
      FROM surveys s
      LEFT JOIN lime_surveys_languagesettings lsl ON lsl.surveyls_survey_id = s.id
      LEFT JOIN waves w ON s.id = w.survey_id
      LEFT JOIN project_waves_waves pww ON w.id = pww.wave_id
      LEFT JOIN project_waves pw ON pww.project_wave_id = pw.id
      LEFT JOIN projects p ON pw.project_id = p.id
      LEFT JOIN (
        SELECT 
          survey_id,
          MAX(id) as id
        FROM waves 
        WHERE status = 1
        GROUP BY survey_id
        ) last_wave ON s.id = last_wave.survey_id
      LEFT JOIN (
        SELECT 
          s2.id as survey_id,
          pw2.id as id,
          pw2.project_id,
          pw2.crm_element_id,
          ROW_NUMBER() OVER (PARTITION BY s2.id ORDER BY pw2.id DESC) as rn
        FROM surveys s2
        LEFT JOIN waves w2 ON s2.id = w2.survey_id AND w2.status = 1
        LEFT JOIN project_waves_waves pww2 ON w2.id = pww2.wave_id
        LEFT JOIN project_waves pw2 ON pww2.project_wave_id = pw2.id
        WHERE pw2.id IS NOT NULL
      ) recent_pw ON s.id = recent_pw.survey_id AND recent_pw.rn = 1
      WHERE s.id = ?
        AND s.active = 1
    `;

    try {
      const rows = await database.query(query, [id]);
      if (rows.length === 0) return null;

      const survey = rows[0];
      return {
        ...survey,
        userRating: await this.calculateUserRating(id),
        userSentiment: await this.calculateUserSentiment(id),
        dropOffPercent: await this.calculateDropOffPercent(id),
        screenOutPercent: await this.calculateScreenOutPercent(id),
        questionsInScreener: await this.getQuestionsInScreener(id),
        qualitativeComments: await this.getQualitativeComments(id),
        adminPortalLink: `https://ap.zoomrx.com/#/projects/view/${survey.project_id}?pw-id=${survey.recent_project_wave_id}&s-id=${survey.id}&wave-id=${survey.last_wave_id}`
      };
    } catch (error) {
      console.error('Error in getSurveyById:', error);
      throw error;
    }
  }

  // Get survey experience metrics
  async getSurveyExperienceMetrics(dateRange, surveyId) {
    let query = `
      SELECT 
        s.id as surveyId,
        lsl.surveyls_title as surveyTitle,
        DATE_FORMAT(uw.completed_date, '%Y-%m') as date,
        COUNT(*) as totalResponses,
        AVG(uwd.feedback_rating) as avgRating,
        SUM(CASE WHEN uwd.feedback_rating >= 5 THEN 1 ELSE 0 END) as positiveResponses,
        SUM(CASE WHEN uwd.feedback_rating <= 3 THEN 1 ELSE 0 END) as negativeResponses
      FROM surveys s
      LEFT JOIN lime_surveys_languagesettings lsl ON lsl.surveyls_survey_id = s.id
      JOIN waves w ON s.id = w.survey_id
      JOIN users_waves uw ON w.id = uw.wave_id
      JOIN users_wave_details uwd ON uw.id = uwd.id
      WHERE s.enable_feedback = 1
        AND uwd.feedback_rating > 0
    `;

    const params = [];

    // Add survey ID filter if provided
    if (surveyId) {
      query += ` AND s.id = ?`;
      params.push(parseInt(surveyId));
    }

    // Add date range filter if provided
    if (dateRange) {
      switch (dateRange) {
        case 'last_30_days':
          query += ` AND uw.completed_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)`;
          break;
        case 'last_90_days':
          query += ` AND uw.completed_date >= DATE_SUB(NOW(), INTERVAL 90 DAY)`;
          break;
        case 'last_6_months':
          query += ` AND uw.completed_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)`;
          break;
        case 'last_12_months':
          query += ` AND uw.completed_date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)`;
          break;
      }
    }

    query += ` GROUP BY s.id, DATE_FORMAT(uw.completed_date, '%Y-%m') ORDER BY date DESC`;

    try {
      const rows = await database.query(query, params);
      
      return rows.map(row => ({
        ...row,
        userSentiment: this.calculateSentiment(row.positiveResponses, row.negativeResponses, row.totalResponses),
        satisfactionScore: this.calculateSatisfactionScore(row.avgRating)
      }));
    } catch (error) {
      console.error('Error in getSurveyExperienceMetrics:', error);
      throw error;
    }
  }

  // Helper methods for calculating metrics
  async calculateUserRating(surveyId) {
    const query = `
      SELECT 
        AVG(uwd.feedback_rating) as average_rating,
        COUNT(uwd.id) as feedback_count
      FROM surveys s
      JOIN waves w ON s.id = w.survey_id
      JOIN users_waves uw ON w.id = uw.wave_id
      JOIN users_wave_details uwd ON uw.id = uwd.id
      WHERE s.id = ?
        AND s.enable_feedback = 1
        AND uwd.feedback_rating > 0
    `;

    try {
      const rows = await database.query(query, [surveyId]);
      return rows[0]?.average_rating || 0;
    } catch (error) {
      console.error('Error calculating user rating:', error);
      return 0;
    }
  }

  async calculateUserSentiment(surveyId) {
    try {
      // Get qualitative comments for sentiment analysis
      const comments = await this.getQualitativeComments(surveyId);
      
      if (comments.length === 0) {
        // Fallback to rating-based sentiment if no comments
        const query = `
          SELECT 
            SUM(CASE WHEN uwd.feedback_rating >= 5 THEN 1 ELSE 0 END) as positive,
            SUM(CASE WHEN uwd.feedback_rating <= 3 THEN 1 ELSE 0 END) as negative,
            COUNT(*) as total
          FROM surveys s
          JOIN waves w ON s.id = w.survey_id AND w.status = 1
          JOIN users_waves uw ON w.id = uw.wave_id AND uw.start_date IS NOT NULL
          JOIN users_wave_details uwd ON uw.id = uwd.id
          WHERE s.id = ?
            AND s.enable_feedback = 1
            AND uwd.feedback_rating > 0
            AND uw.start_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        `;

        const rows = await database.query(query, [surveyId]);
        const { positive, negative, total } = rows[0];
        return this.calculateSentiment(positive, negative, total);
      }

      // Calculate sentiment from qualitative feedback
      const sentimentScore = sentimentAnalyzer.calculateAverageSentiment(comments);
      
      return sentimentScore;
    } catch (error) {
      console.error('Error calculating user sentiment:', error);
      return 0;
    }
  }

  async calculateDropOffPercent(surveyId) {
    const query = `
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN uw.status = 0 THEN 1 ELSE 0 END) as partial_users,
        SUM(CASE WHEN uw.status = 1 THEN 1 ELSE 0 END) as completed_users,
        ROUND((SUM(CASE WHEN uw.status = 0 THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as dropoff_percentage
      FROM surveys s
      JOIN waves w ON s.id = w.survey_id AND w.status = 1
      JOIN users_waves uw ON w.id = uw.wave_id AND uw.start_date IS NOT NULL
      WHERE s.id = ?
        AND uw.start_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `;

    try {
      const rows = await database.query(query, [surveyId]);
      return rows[0]?.dropoff_percentage || 0;
    } catch (error) {
      console.error('Error calculating drop-off percent:', error);
      return 0;
    }
  }

  async calculateScreenOutPercent(surveyId) {
    const query = `
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN uw.status = 2 THEN 1 ELSE 0 END) as wave_screened_out,
        SUM(CASE WHEN uw.status = 3 THEN 1 ELSE 0 END) as panel_screened_out,
        SUM(CASE WHEN uw.status = 4 THEN 1 ELSE 0 END) as quota_screened_out,
        SUM(CASE WHEN uw.status IN (2, 3, 4) THEN 1 ELSE 0 END) as total_screened_out,
        ROUND((SUM(CASE WHEN uw.status IN (2, 3, 4) THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as screenout_percentage
      FROM surveys s
      JOIN waves w ON s.id = w.survey_id AND w.status = 1
      JOIN users_waves uw ON w.id = uw.wave_id AND uw.start_date IS NOT NULL
      WHERE s.id = ?
        AND uw.start_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `;

    try {
      const rows = await database.query(query, [surveyId]);
      return rows[0]?.screenout_percentage || 0;
    } catch (error) {
      console.error('Error calculating screen-out percent:', error);
      return 0;
    }
  }

  async getQuestionsInScreener(surveyId) {
    const query = `
      SELECT 
        COUNT(DISTINCT group_data.gid) as screener_group_count,
        SUM(group_data.questions_in_group) as total_screener_questions,
        GROUP_CONCAT(DISTINCT group_data.screener_attributes ORDER BY group_data.screener_attributes) as all_screener_attributes
      FROM surveys s
      JOIN (
          SELECT 
              all_q.sid,
              all_q.gid,
              COUNT(DISTINCT all_q.qid) as questions_in_group,
              GROUP_CONCAT(DISTINCT qa.attribute ORDER BY qa.attribute) as screener_attributes
          FROM lime_questions screener_q
          JOIN lime_question_attributes qa ON screener_q.qid = qa.qid
          JOIN lime_questions all_q ON all_q.sid = screener_q.sid AND all_q.gid = screener_q.gid
          WHERE qa.attribute IN ('screener_failure', 'panel_screener_failure', 'wave_prescreener')
              AND screener_q.parent_qid = 0
              AND all_q.parent_qid = 0
          GROUP BY all_q.sid, all_q.gid
      ) group_data ON s.id = group_data.sid
      WHERE s.id = ?
        AND s.active = 1
    `;

    try {
      const rows = await database.query(query, [surveyId]);
      const questionCount = rows[0]?.total_screener_questions || 0;
      
      // Limit to reasonable maximum to prevent excessive negative scores
      const limitedCount = Math.min(questionCount, 20);
      
      return limitedCount;
    } catch (error) {
      console.error('Error getting questions in screener:', error);
      return 5; // Default fallback
    }
  }

  async getQualitativeComments(surveyId) {
    try {
      const query = `
        SELECT 
          uwd.feedback_comment as comment,
          uwd.feedback_rating as rating,
          uw.completed_date as completed_date
        FROM surveys s
        JOIN waves w ON s.id = w.survey_id AND w.status = 1
        JOIN users_waves uw ON w.id = uw.wave_id AND uw.start_date IS NOT NULL
        JOIN users_wave_details uwd ON uw.id = uwd.id
        WHERE s.id = ?
          AND s.enable_feedback = 1
          AND uwd.feedback_rating > 0
          AND uwd.feedback_comment IS NOT NULL
          AND uwd.feedback_comment != ''
          AND uw.start_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        ORDER BY uw.completed_date DESC
        LIMIT 5
      `;

      const rows = await database.query(query, [surveyId]);
      return rows.map(row => row.comment).filter(comment => comment);
    } catch (error) {
      console.error('Error getting qualitative comments:', error);
      return [];
    }
  }

  async getQualitativeCommentsWithSentiment(surveyId) {
    try {
      const query = `
        SELECT 
          uwd.feedback_comment as comment,
          uwd.feedback_rating as rating,
          uw.completed_date as completed_date
        FROM surveys s
        JOIN waves w ON s.id = w.survey_id AND w.status = 1
        JOIN users_waves uw ON w.id = uw.wave_id AND uw.start_date IS NOT NULL
        JOIN users_wave_details uwd ON uw.id = uwd.id
        WHERE s.id = ?
          AND s.enable_feedback = 1
          AND uwd.feedback_rating > 0
          AND uwd.feedback_comment IS NOT NULL
          AND uwd.feedback_comment != ''
          AND uw.start_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        ORDER BY uw.completed_date DESC
        LIMIT 5
      `;

      const rows = await database.query(query, [surveyId]);
      
      return rows.map(row => ({
        text: row.comment,
        rating: row.rating,
        completed_date: row.completed_date,
        sentiment: sentimentAnalyzer.getDetailedSentiment(row.comment),
        rating_sentiment: sentimentAnalyzer.categorizeRatingSentiment(row.rating)
      }));
    } catch (error) {
      console.error('Error getting qualitative comments with sentiment:', error);
      return [];
    }
  }

  calculateSentiment(positive, negative, total) {
    if (total === 0) return 0;
    return (positive - negative) / total;
  }

  calculateSatisfactionScore(avgRating) {
    return (avgRating / 10) * 100;
  }
}

module.exports = SurveyModel; 