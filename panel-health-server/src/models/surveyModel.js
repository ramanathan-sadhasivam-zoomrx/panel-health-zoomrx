const database = require('../config/database');
const sentimentAnalyzer = require('../utils/sentimentAnalyzer');
const experienceScoreCalculator = require('../utils/experienceScoreCalculator');
const natural = require('natural');

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
      // Query 1: Get surveys with basic info (only surveys that have screener questions AND at least 5 panelist completes)
      const surveysQuery = `
        SELECT DISTINCT
          s.id,
          lsl.surveyls_title as surveyTitle,
          ce.name as crmName,
          s.status,
          s.type as survey_type,
          recent_pw.id as recent_project_wave_id,
          recent_pw.project_id as project_id,
          last_wave.id as last_wave_id
        FROM surveys s
        INNER JOIN (
          -- Subquery to get only surveys with screener questions
          SELECT DISTINCT all_q.sid
          FROM lime_questions screener_q
          JOIN lime_question_attributes qa ON screener_q.qid = qa.qid
          JOIN lime_questions all_q ON all_q.sid = screener_q.sid AND all_q.gid = screener_q.gid
          WHERE qa.attribute IN ('screener_failure', 'panel_screener_failure', 'wave_prescreener')
            AND screener_q.parent_qid = 0
            AND all_q.parent_qid = 0
            AND screener_q.archived = 0
            AND all_q.archived = 0
            AND all_q.type != '*'
        ) screener_surveys ON s.id = screener_surveys.sid
        INNER JOIN (
          -- Subquery to get only surveys with at least 5 panelist completes
          SELECT 
            s2.id as survey_id
          FROM surveys s2
          JOIN waves w2 ON s2.id = w2.survey_id
          JOIN users_waves uw2 ON w2.id = uw2.wave_id AND uw2.start_date IS NOT NULL
          -- Only count attempts in the last 30 days
          AND uw2.start_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
          JOIN users u2 ON uw2.user_id = u2.id AND u2.type = 1
          WHERE s2.active = 1
          GROUP BY s2.id
          HAVING COUNT(DISTINCT uw2.user_id) >= 5
        ) panelist_surveys ON s.id = panelist_surveys.survey_id
        LEFT JOIN lime_surveys_languagesettings lsl ON lsl.surveyls_survey_id = s.id
        LEFT JOIN (
          SELECT 
            survey_id,
            MAX(id) as id
          FROM waves 
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
          LEFT JOIN waves w2 ON s2.id = w2.survey_id 
          LEFT JOIN project_waves_waves pww2 ON w2.id = pww2.wave_id
          LEFT JOIN project_waves pw2 ON pww2.project_wave_id = pw2.id
          WHERE pw2.id IS NOT NULL
        ) recent_pw ON s.id = recent_pw.survey_id AND recent_pw.rn = 1
        LEFT JOIN crm_elements ce ON recent_pw.crm_element_id = ce.id
        WHERE s.active = 1
          AND s.type NOT IN (2,3,4, 7, 8, 9, 10, 11, 12, 13,14, 15, 16, 19)
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
        LEFT JOIN users u ON uw.user_id = u.id
        LEFT JOIN users_wave_details uwd ON uw.id = uwd.id AND uwd.feedback_rating > 0
        WHERE s.active = 1
          AND s.type NOT IN (2, 3, 4, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 19)
          AND u.type = 1
          AND uw.status != 6
          AND uw.start_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY s.id
      `;
      
      // Query 3: Get screener questions data (only surveys with at least 1 screener question)
      const screenerQuery = `
        SELECT 
          s.id as survey_id,
          COUNT(DISTINCT group_data.gid) as screener_group_count,
          SUM(group_data.questions_in_group) as total_screener_questions
        FROM surveys s
        INNER JOIN (
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
                AND screener_q.archived = 0
                AND all_q.archived = 0
                AND all_q.type != '*'
                AND NOT EXISTS (
                    SELECT 1 FROM lime_question_attributes qa2
                    WHERE qa2.qid = screener_q.qid AND qa2.attribute = 'hidden' AND qa2.value = '1'
                )
                AND NOT EXISTS (
                    SELECT 1 FROM lime_question_attributes qa3
                    WHERE qa3.qid = all_q.qid AND qa3.attribute = 'hidden' AND qa3.value = '1'
                )
            GROUP BY all_q.sid, all_q.gid
        ) group_data ON s.id = group_data.sid
        WHERE s.active = 1
          AND s.type NOT IN (4, 7, 8, 9, 10, 11, 12, 13, 15, 16, 19)
        GROUP BY s.id
        HAVING SUM(group_data.questions_in_group) > 0
      `;
      
      // Query 4: Get all qualitative comments for sentiment analysis
      const commentsQuery = `
        SELECT 
          s.id as survey_id,
          uwd.feedback_rating,
          uwd.feedback_comment
        FROM surveys s
        LEFT JOIN waves w ON s.id = w.survey_id 
        LEFT JOIN users_waves uw ON w.id = uw.wave_id AND uw.start_date IS NOT NULL
        LEFT JOIN users_wave_details uwd ON uw.id = uwd.id
        WHERE s.active = 1
          AND s.enable_feedback = 1
          AND uwd.feedback_comment IS NOT NULL
          AND uwd.feedback_comment != ''
          AND (uw.start_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) OR uw.start_date IS NULL)
        ORDER BY s.id
      `;

      // Query 5: Get global average user rating
      const globalAvgRatingQuery = `
        SELECT AVG(average_rating) as global_avg_rating
        FROM (
          SELECT 
            s.id,
            AVG(uwd.feedback_rating) as average_rating
          FROM surveys s
          LEFT JOIN waves w ON s.id = w.survey_id 
          LEFT JOIN users_waves uw ON w.id = uw.wave_id AND uw.start_date IS NOT NULL
          LEFT JOIN users_wave_details uwd ON uw.id = uwd.id AND uwd.feedback_rating > 0
          WHERE s.active = 1
            AND (uw.start_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) OR uw.start_date IS NULL)
          GROUP BY s.id
        ) survey_ratings
        WHERE average_rating IS NOT NULL
      `;

      // Query 6: Get average ratings per survey
      const avgRatingsPerSurveyQuery = `
        SELECT AVG(rating_count) as avg_ratings_per_survey
        FROM (
          SELECT 
            s.id,
            COUNT(uwd.feedback_rating) as rating_count
          FROM surveys s
          LEFT JOIN waves w ON s.id = w.survey_id 
          LEFT JOIN users_waves uw ON w.id = uw.wave_id AND uw.start_date IS NOT NULL
          LEFT JOIN users_wave_details uwd ON uw.id = uwd.id AND uwd.feedback_rating > 0
          WHERE s.active = 1
            AND (uw.start_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) OR uw.start_date IS NULL)
          GROUP BY s.id
        ) survey_rating_counts
        WHERE rating_count > 0
      `;

      // Query 7: Get feedback comments for sentiment analysis
      const feedbackCommentsQuery = `
        SELECT 
          s.id as survey_id,
          uwd.feedback_comment,
          uwd.feedback_rating
        FROM surveys s
        LEFT JOIN waves w ON s.id = w.survey_id 
        LEFT JOIN users_waves uw ON w.id = uw.wave_id AND uw.start_date IS NOT NULL
        LEFT JOIN users_wave_details uwd ON uw.id = uwd.id
        WHERE s.active = 1
          AND s.enable_feedback = 1
          AND uwd.feedback_comment IS NOT NULL
          AND uwd.feedback_comment != ''
          AND (uw.start_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) OR uw.start_date IS NULL)
        ORDER BY s.id
      `;

      // Query 7b: Get average sentiments per survey (count)
      const avgSentimentsPerSurveyQuery = `
        SELECT AVG(sentiment_count) as avg_sentiments_per_survey
        FROM (
          SELECT 
            s.id,
            COUNT(uwd.feedback_comment) as sentiment_count
          FROM surveys s
          LEFT JOIN waves w ON s.id = w.survey_id 
          LEFT JOIN users_waves uw ON w.id = uw.wave_id AND uw.start_date IS NOT NULL
          LEFT JOIN users_wave_details uwd ON uw.id = uwd.id
          WHERE s.active = 1
            AND s.enable_feedback = 1
            AND uwd.feedback_comment IS NOT NULL
            AND uwd.feedback_comment != ''
            AND (uw.start_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) OR uw.start_date IS NULL)
          GROUP BY s.id
        ) survey_sentiment_counts
        WHERE sentiment_count > 0
      `;

      // Query 8: Get global average drop-off rate (FIXED - include all surveys including 0% drop-off)
      const globalAvgDropoffQuery = `
        SELECT AVG(COALESCE(dropoff_percentage, 0)) as global_avg_dropoff_rate
        FROM (
          SELECT 
            s.id,
            CASE 
              WHEN COUNT(*) > 0 THEN ROUND((SUM(CASE WHEN uw.status = 0 THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2)
              ELSE 0
            END as dropoff_percentage
          FROM surveys s
          LEFT JOIN waves w ON s.id = w.survey_id 
          LEFT JOIN users_waves uw ON w.id = uw.wave_id AND uw.start_date IS NOT NULL
          WHERE s.active = 1
            AND (uw.start_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) OR uw.start_date IS NULL)
          GROUP BY s.id
        ) survey_dropoffs
      `;

      // Query 9: Get global average screen-out rate (FIXED - include all surveys including 0% screen-out)
      const globalAvgScreenoutQuery = `
        SELECT AVG(COALESCE(screenout_percentage, 0)) as global_avg_screenout_rate
        FROM (
          SELECT 
            s.id,
            CASE 
              WHEN COUNT(*) > 0 THEN ROUND((SUM(CASE WHEN uw.status IN (2, 3, 4) THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2)
              ELSE 0
            END as screenout_percentage
          FROM surveys s
          LEFT JOIN waves w ON s.id = w.survey_id 
          LEFT JOIN users_waves uw ON w.id = uw.wave_id AND uw.start_date IS NOT NULL
          WHERE s.active = 1
            AND (uw.start_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) OR uw.start_date IS NULL)
          GROUP BY s.id
        ) survey_screenouts
      `;

      // Query 10: Get max and min screener question counts
      const screenerCountsQuery = `
        SELECT 
          MAX(total_screener_questions) as max_screener_question_count,
          MIN(total_screener_questions) as min_screener_question_count
        FROM (
          SELECT 
            s.id,
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
        ) survey_screener_counts
        WHERE total_screener_questions IS NOT NULL
      `;

      // Execute all queries in parallel
      const [
        surveys, 
        metrics, 
        screenerData, 
        commentsData, 
        globalAvgRating,
        avgRatingsPerSurvey,
        feedbackComments,
        avgSentimentsPerSurvey,
        globalAvgDropoff,
        globalAvgScreenout,
        screenerCounts
      ] = await Promise.all([
        database.query(surveysQuery),
        database.query(metricsQuery),
        database.query(screenerQuery),
        database.query(commentsQuery),
        database.query(globalAvgRatingQuery),
        database.query(avgRatingsPerSurveyQuery),
        database.query(feedbackCommentsQuery),
        database.query(avgSentimentsPerSurveyQuery),
        database.query(globalAvgDropoffQuery),
        database.query(globalAvgScreenoutQuery),
        database.query(screenerCountsQuery)
      ]);


      
      // Helper function to safely format numbers
      const safeToFixed = (value, decimals = 2) => {
        if (value === null || value === undefined || isNaN(value)) return 'N/A';
        const num = parseFloat(value);
        return isNaN(num) ? 'N/A' : num.toFixed(decimals);
      };
      
      const globalAvgRatingValue = globalAvgRating?.[0]?.global_avg_rating;
      const avgRatingsPerSurveyValue = avgRatingsPerSurvey?.[0]?.avg_ratings_per_survey;
      const avgSentimentsPerSurveyValue = avgSentimentsPerSurvey?.[0]?.avg_sentiments_per_survey;
      const globalAvgDropoffValue = globalAvgDropoff?.[0]?.global_avg_dropoff_rate;
      const globalAvgScreenoutValue = globalAvgScreenout?.[0]?.global_avg_screenout_rate;
      const maxScreenerCount = screenerCounts?.[0]?.max_screener_question_count;
      const minScreenerCount = screenerCounts?.[0]?.min_screener_question_count;
      

      
      // Natural.js sentiment analysis function
      const analyzeSentimentWithNatural = (comments) => {
        const analyzer = new natural.SentimentAnalyzer("English", natural.PorterStemmer, "afinn");
        
        return comments.map(comment => {
          try {
            // Tokenize the comment
            const words = comment.toLowerCase().split(/\s+/);
            
            // Get base sentiment score from Natural.js
            let score = analyzer.getSentiment(words);
            
            // Add custom domain-specific keywords for survey feedback
            const customKeywords = {
              // Very positive survey-specific terms
              'excellent': 3, 'amazing': 3, 'outstanding': 3, 'fantastic': 3,
              'brilliant': 3, 'perfect': 3, 'love': 2, 'best': 2,
              
              // Positive survey-specific terms
              'good': 1, 'great': 2, 'nice': 1, 'satisfied': 2, 'happy': 2,
              'enjoyed': 2, 'pleased': 2, 'smooth': 1, 'easy': 1, 'clear': 1,
              'helpful': 2, 'useful': 1, 'informative': 1, 'well': 1,
              
              // Slightly positive
              'okay': 0.5, 'fine': 0.5, 'alright': 0.5, 'acceptable': 0.5,
              'decent': 0.5, 'not bad': 0.5,
              
              // Slightly negative
              'could be better': -0.5, 'mediocre': -1, 'not great': -1,
              'average': -0.5, 'ordinary': -0.5,
              
              // Negative survey-specific terms
              'bad': -2, 'poor': -2, 'disappointed': -2, 'frustrated': -2,
              'confusing': -2, 'difficult': -2, 'annoying': -2, 'boring': -2,
              'slow': -1, 'complicated': -2, 'unclear': -2, 'hard': -2,
              
              // Very negative survey-specific terms
              'terrible': -3, 'awful': -3, 'horrible': -3, 'worst': -3,
              'hate': -3, 'useless': -3, 'waste': -3, 'broken': -3,
              'unusable': -3, 'frustrating': -3
            };
            
            // Apply custom keyword scoring
            Object.keys(customKeywords).forEach(keyword => {
              if (comment.toLowerCase().includes(keyword)) {
                score += customKeywords[keyword];
              }
            });
            
            // Normalize to -1 to 1 range
            const normalizedScore = Math.max(-1, Math.min(1, score / 5));
            
            return {
              comment: comment,
              raw_score: score,
              sentiment_score: normalizedScore
            };
          } catch (error) {
            console.error('Error analyzing sentiment for comment:', comment, error);
            return {
              comment: comment,
              raw_score: 0,
              sentiment_score: 0
            };
          }
        });
      };

      // Calculate global average sentiment using Natural.js
      let globalAvgSentimentValue = 0;
      if (feedbackComments && feedbackComments.length > 0) {
        const sentimentResults = analyzeSentimentWithNatural(
          feedbackComments.map(item => item.feedback_comment)
        );
        
        const validSentiments = sentimentResults
          .filter(result => result.sentiment_score !== null && result.sentiment_score !== undefined)
          .map(result => result.sentiment_score);
        
        if (validSentiments.length > 0) {
          globalAvgSentimentValue = validSentiments.reduce((sum, score) => sum + score, 0) / validSentiments.length;
        }
        
        // Store sentiment results for debugging - only non-empty sentiments
        const nonEmptySentiments = sentimentResults.filter(result => 
          result.sentiment_score !== 0 && 
          result.raw_score !== 0 && 
          Math.abs(result.sentiment_score) > 0.05 // Filter out very neutral sentiments
        );
        

      }
      

      

      


      // Combine global averages into a single object for processing
      const globalAverages = {
        globalAvgRating: globalAvgRatingValue || 5.5,
        globalAvgSentiment: globalAvgSentimentValue || 0,
        avgRatingsPerSurvey: avgRatingsPerSurveyValue || 0,
        avgSentimentsPerSurvey: avgSentimentsPerSurveyValue || 0,
        globalAvgDropoffRate: globalAvgDropoffValue || 0,
        globalAvgScreenoutRate: globalAvgScreenoutValue || 0,
        maxScreenerQuestionCount: maxScreenerCount || 30,
        minScreenerQuestionCount: minScreenerCount || 0
      };
      


      // Fetch all individual user ratings for Bayesian smoothing
      const individualRatingsQuery = `
        SELECT s.id as survey_id, uwd.feedback_rating
        FROM surveys s
        JOIN waves w ON s.id = w.survey_id 
        JOIN users_waves uw ON w.id = uw.wave_id AND uw.start_date IS NOT NULL
        JOIN users u ON uw.user_id = u.id AND u.type = 1
        JOIN users_wave_details uwd ON uw.id = uwd.id AND uwd.feedback_rating > 0
        WHERE s.id IN (${surveys.map(s => s.id).join(",")})
          AND uw.start_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      `;
      const individualRatingsRows = await database.query(individualRatingsQuery);
      // Build a map: surveyId -> [ratings]
      const ratingsMap = new Map();
      for (const row of individualRatingsRows) {
        if (!ratingsMap.has(row.survey_id)) ratingsMap.set(row.survey_id, []);
        ratingsMap.get(row.survey_id).push(row.feedback_rating);
      }

      // Process all data in code
      const surveysWithMetrics = await this.processAllSurveyData(surveys, metrics, screenerData, commentsData, globalAverages, ratingsMap);

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
  async processAllSurveyData(surveys, metrics, screenerData, commentsData, globalAverages, ratingsMap) {
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


    
    // Calculate optimal K value once for all surveys
    const allRatingCounts = Array.from(metricsMap.values()).map(m => m.feedback_count || 0);
    const optimalK = experienceScoreCalculator.calculateOptimalK(allRatingCounts);
    

    
    // Process each survey with Bayesian smoothing
    let processedCount = 0;
    const surveysWithMetrics = await Promise.all(surveys.map(async (survey) => {
      processedCount++;
      const surveyMetrics = metricsMap.get(survey.id) || {};
      const surveyScreener = screenerMap.get(survey.id) || {};
      const surveyComments = commentsMap.get(survey.id) || [];

      // Prepare user ratings for Bayesian smoothing
      const userRatings = ratingsMap.get(survey.id) || [];
      
      // Prepare user sentiments for Bayesian smoothing (optimized)
      const userSentiments = surveyComments.length > 0 ? 
        [sentimentAnalyzer.calculateAverageSentiment(surveyComments.map(c => c.feedback_comment))] : [];



      // Prepare survey data for Bayesian calculation
      const surveyData = {
        surveyId: survey.id, // Add survey ID for differentiation
        userRatings: userRatings,
        userSentiments: userSentiments,
        dropoffs: surveyMetrics.partial_users || 0,
        totalAttempts: surveyMetrics.total_users || 0,
        screenouts: surveyMetrics.screened_out_users || 0,
        screenerQuestionCount: surveyScreener.total_screener_questions || 0
      };


      


      // Calculate Bayesian XScore with pre-calculated optimal K
      let bayesianResult;
      try {
        // Only show detailed calculation for the first survey OR surveys that will use fallback scores
        const willNeedFallback = (!userRatings.length && !userSentiments.length) || !surveyMetrics.total_users;
        
        if (processedCount === 1 || willNeedFallback) {
          bayesianResult = experienceScoreCalculator.calculateBayesianXScore(surveyData, globalAverages, optimalK);
        } else {
          bayesianResult = experienceScoreCalculator.calculateBayesianXScoreSilent(surveyData, globalAverages, optimalK);
        }
      } catch (error) {
        console.error(`❌ Survey ${survey.id} Bayesian calculation failed:`, error);
        // Fallback to legacy calculation
        bayesianResult = {
          xscore: 50, // Default score
          adjustedMetrics: { adjustedRating: 5.5, adjustedSentiment: 0 },
          smoothingInfo: { K: optimalK, ratingWeight: 0, globalRatingWeight: 1, sentimentWeight: 0, globalSentimentWeight: 1 },
          rawData: { ratingCount: 0, sentimentCount: 0, avgRating: 5.5, avgSentiment: 0 },
          category: 'fair',
          color: 'text-yellow-600',
          breakdown: {
            userRating: { value: 5.5, contribution: 19.25, weight: 35 },
            userSentiment: { value: 0, contribution: 12.5, weight: 25 },
            dropoffRate: { value: 0, contribution: 15, weight: 15 },
            screenoutRate: { value: 0, contribution: 15, weight: 15 },
            screenerQuestionCount: { value: 0, contribution: 5, weight: 10 }
          }
        };
      }



      // Ensure we have valid scores - keep legacy and Bayesian separate
      const finalUserSentiment = bayesianResult.adjustedMetrics?.adjustedSentiment || 0;
      

      

      
      return {
        ...survey,
        userRating: surveyMetrics.average_rating || 0,
        userSentiment: finalUserSentiment,
        dropOffPercent: surveyMetrics.dropoff_percentage || 0,
        screenOutPercent: surveyMetrics.screenout_percentage || 0,
        questionsInScreener: surveyScreener.total_screener_questions || 0,
        qualitativeComments: surveyComments.length,
        // Use Bayesian score as the primary experience score
        experienceScore: bayesianResult.xscore || 50,
        experienceCategory: bayesianResult.category || 'fair',
        experienceColor: bayesianResult.color || 'text-yellow-600',
        experienceBreakdown: bayesianResult.breakdown,
        // Add Bayesian-specific data
        xscore: bayesianResult.xscore || 50, // New Bayesian XScore (separate from legacy)
        bayesianMetrics: bayesianResult.adjustedMetrics,
        smoothingInfo: bayesianResult.smoothingInfo,
        rawData: bayesianResult.rawData,
        breakdown: bayesianResult.breakdown, // Add the breakdown for frontend calculations

        adminPortalLink: `${process.env.ADMIN_PORTAL_BASE_URL || 'https://ap.zoomrx.com'}/#/projects/view/${survey.project_id}?pw-id=${survey.recent_project_wave_id}&s-id=${survey.id}&wave-id=${survey.last_wave_id}`,
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


    
    // Analyze rating distribution to determine optimal K value
    const surveysWithRatings = surveysWithMetrics.filter(s => 
      s.rawData && s.rawData.ratingCount > 0
    );
    
    if (surveysWithRatings.length > 0) {
      const ratingCounts = surveysWithRatings.map(s => s.rawData.ratingCount);
      const avgRatings = ratingCounts.reduce((sum, count) => sum + count, 0) / ratingCounts.length;
      const medianRatings = ratingCounts.sort((a, b) => a - b)[Math.floor(ratingCounts.length / 2)];
      const maxRatings = Math.max(...ratingCounts);
      const minRatings = Math.min(...ratingCounts);
      
      // Analyze distribution buckets
      const distribution = {
        low: ratingCounts.filter(count => count < 5).length,
        medium: ratingCounts.filter(count => count >= 5 && count < 20).length,
        high: ratingCounts.filter(count => count >= 20 && count < 100).length,
        veryHigh: ratingCounts.filter(count => count >= 100).length
      };
      

      
      // Recommend K value based on distribution
      let recommendedK;
      if (distribution.low > distribution.medium + distribution.high) {
        // Most surveys have <5 ratings
        recommendedK = 8;

      } else if (distribution.medium > distribution.low + distribution.high) {
        // Most surveys have 5-19 ratings
        recommendedK = 10;

      } else if (distribution.high > distribution.low + distribution.medium) {
        // Most surveys have 20-99 ratings
        recommendedK = 15;

      } else {
        // Mixed distribution, use median-based approach
        recommendedK = Math.max(8, Math.min(20, Math.round(medianRatings / 2)));

      }
      

    }
    
    // Log score distribution summary
    const surveysWithBothScores = surveysWithMetrics.filter(s => 
      s.experienceScore !== null && s.xscore !== null && 
      !isNaN(s.experienceScore) && !isNaN(s.xscore)
    );
    
    if (surveysWithBothScores.length > 0) {
      const avgLegacyScore = surveysWithBothScores.reduce((sum, s) => sum + s.experienceScore, 0) / surveysWithBothScores.length;
      const avgBayesianScore = surveysWithBothScores.reduce((sum, s) => sum + s.xscore, 0) / surveysWithBothScores.length;
      const avgDifference = avgBayesianScore - avgLegacyScore;
      

    }
    
    return surveysWithMetrics;
  }
}

module.exports = SurveyModel; 