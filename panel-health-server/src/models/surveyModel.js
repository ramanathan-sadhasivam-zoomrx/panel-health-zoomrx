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

      // Log global averages (only for specific surveys)
      if (surveys.some(s => s.id === 927820 || s.id === 600757)) {
        console.log('🌍 GLOBAL AVERAGES ACROSS ALL SURVEYS:');
        console.log('='.repeat(60));
        console.log('🔍 DEBUG: Raw global average values:');
        console.log('   - globalAvgRating:', globalAvgRating);
        console.log('   - globalAvgDropoff:', globalAvgDropoff);
        console.log('   - globalAvgScreenout:', globalAvgScreenout);
        console.log('   - screenerCounts:', screenerCounts);
      }
      
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
      
      // Only log extracted values for specific surveys
      if (surveys.some(s => s.id === 927820 || s.id === 600757)) {
        console.log('🔍 DEBUG: Extracted global average values:');
        console.log('   - globalAvgRatingValue:', globalAvgRatingValue);
        console.log('   - globalAvgDropoffValue:', globalAvgDropoffValue);
        console.log('   - globalAvgScreenoutValue:', globalAvgScreenoutValue);
        console.log('   - maxScreenerCount:', maxScreenerCount);
        console.log('   - minScreenerCount:', minScreenerCount);
      }
      
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
        
        console.log('📝 SENTIMENT ANALYSIS RESULTS (Non-Empty Sentiments Only):');
        console.log('='.repeat(80));
        console.log(`Total comments analyzed: ${sentimentResults.length}`);
        console.log(`Comments with significant sentiment: ${nonEmptySentiments.length}`);
        console.log('');
        
        const maxToShow = Math.min(20, nonEmptySentiments.length);
        nonEmptySentiments.slice(0, maxToShow).forEach((result, index) => {
          const sentimentEmoji = result.sentiment_score > 0.3 ? '😊' : 
                                result.sentiment_score > 0 ? '🙂' : 
                                result.sentiment_score > -0.3 ? '😐' : 
                                result.sentiment_score > -0.7 ? '😕' : '😞';
          
          const sentimentLabel = result.sentiment_score > 0.5 ? 'Very Positive' :
                                result.sentiment_score > 0.2 ? 'Positive' :
                                result.sentiment_score > 0 ? 'Slightly Positive' :
                                result.sentiment_score > -0.2 ? 'Slightly Negative' :
                                result.sentiment_score > -0.5 ? 'Negative' : 'Very Negative';
          
          console.log(`${index + 1}. ${sentimentEmoji} [${sentimentLabel}]`);
          console.log(`   Comment: "${result.comment.substring(0, 60)}${result.comment.length > 60 ? '...' : ''}"`);
          console.log(`   Raw Score: ${result.raw_score}, Normalized: ${result.sentiment_score.toFixed(3)}`);
          console.log('');
        });
        
        if (nonEmptySentiments.length > maxToShow) {
          console.log(`... and ${nonEmptySentiments.length - maxToShow} more non-empty sentiments`);
        }
        
        if (nonEmptySentiments.length === 0) {
          console.log('No significant sentiments found in the comments.');
        }
        console.log('='.repeat(80));
      }
      
      // Debug logging to see raw values
      console.log('🔍 DEBUG - Raw query results:');
      console.log('globalAvgRating:', globalAvgRating);
      console.log('avgRatingsPerSurvey:', avgRatingsPerSurvey);
      console.log('feedbackComments count:', feedbackComments?.length || 0);
      console.log('avgSentimentsPerSurvey:', avgSentimentsPerSurvey);
      console.log('globalAvgDropoff:', globalAvgDropoff);
      console.log('globalAvgScreenout:', globalAvgScreenout);
      console.log('screenerCounts:', screenerCounts);
      
      // Log sample feedback comments
      if (feedbackComments && feedbackComments.length > 0) {
        console.log('📝 SAMPLE FEEDBACK COMMENTS (Raw from DB):');
        console.log('-'.repeat(60));
        const maxCommentsToShow = Math.min(10, feedbackComments.length);
        feedbackComments.slice(0, maxCommentsToShow).forEach((item, index) => {
          console.log(`${index + 1}. Survey ${item.survey_id}: "${item.feedback_comment?.substring(0, 80)}${item.feedback_comment?.length > 80 ? '...' : ''}"`);
        });
        if (feedbackComments.length > maxCommentsToShow) {
          console.log(`... and ${feedbackComments.length - maxCommentsToShow} more comments`);
        }
        console.log('-'.repeat(60));
      }
      
      // Only log global averages for specific surveys
      if (surveys.some(s => s.id === 927820 || s.id === 600757)) {
        console.log(`📊 Global Average User Rating: ${safeToFixed(globalAvgRatingValue)}`);
        console.log(`😊 Global Average Sentiment Score: ${safeToFixed(globalAvgSentimentValue)}`);
        console.log(`📝 Average Ratings per Survey: ${safeToFixed(avgRatingsPerSurveyValue)}`);
        console.log(`💬 Average Sentiments per Survey: ${safeToFixed(avgSentimentsPerSurveyValue)}`);
        console.log(`📉 Global Average Drop-off Rate: ${safeToFixed(globalAvgDropoffValue)}%`);
        console.log(`🚫 Global Average Screen-out Rate: ${safeToFixed(globalAvgScreenoutValue)}%`);
        console.log(`🔢 Max Screener Question Count: ${maxScreenerCount || 'N/A'}`);
        console.log(`🔢 Min Screener Question Count: ${minScreenerCount || 'N/A'}`);
        console.log('='.repeat(60));
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
      
      // Only log final global averages for specific surveys
      if (surveys.some(s => s.id === 927820 || s.id === 600757)) {
        console.log('🔍 DEBUG: Final global averages being passed to Bayesian calculation:');
        console.log('   - globalAvgDropoffRate:', globalAverages.globalAvgDropoffRate);
        console.log('   - globalAvgScreenoutRate:', globalAverages.globalAvgScreenoutRate);
        console.log('   - maxScreenerQuestionCount:', globalAverages.maxScreenerQuestionCount);
        console.log('   - minScreenerQuestionCount:', globalAverages.minScreenerQuestionCount);
      }

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

    // Only log processing info for specific surveys
    if (surveys.some(s => s.id === 927820 || s.id === 600757)) {
      console.log(`🔄 Processing ${surveys.length} surveys with Bayesian smoothing...`);
      console.log(`🌍 Global averages being used:`, globalAverages);
      console.log(`⚡ Performance mode: ENABLED`);
      console.log(`📦 Processing all ${surveys.length} surveys with Bayesian smoothing`);
    }
    
    // Calculate optimal K value once for all surveys
    const allRatingCounts = Array.from(metricsMap.values()).map(m => m.feedback_count || 0);
    const optimalK = experienceScoreCalculator.calculateOptimalK(allRatingCounts);
    
    // Only log K value for specific surveys
    if (surveys.some(s => s.id === 927820 || s.id === 600757)) {
      console.log(`🎯 Using optimal K value: ${optimalK} for all surveys`);
    }
    
    // Process each survey with Bayesian smoothing
    let processedCount = 0;
    const surveysWithMetrics = await Promise.all(surveys.map(async (survey) => {
      processedCount++;
      if (processedCount % 1000 === 0) {
        console.log(`📊 Processed ${processedCount}/${surveysToProcess.length} surveys...`);
      }
      const surveyMetrics = metricsMap.get(survey.id) || {};
      const surveyScreener = screenerMap.get(survey.id) || {};
      const surveyComments = commentsMap.get(survey.id) || [];

      // Prepare user ratings for Bayesian smoothing
      const userRatings = ratingsMap.get(survey.id) || [];
      
      // Prepare user sentiments for Bayesian smoothing (optimized)
      const userSentiments = surveyComments.length > 0 ? 
        [sentimentAnalyzer.calculateAverageSentiment(surveyComments.map(c => c.feedback_comment))] : [];

      // Detailed feedback logging for survey 927820
      if (survey.id === 927820) {
        console.log(`\n📝 [FEEDBACK DATA COLLECTION] Survey ID: ${survey.id}`);
        console.log(`================================================`);
        console.log(`🔍 Raw Feedback Data:`);
        console.log(`   - Individual ratings from ratingsMap:`, userRatings);
        console.log(`   - Rating count: ${userRatings.length}`);
        console.log(`   - Raw average rating: ${userRatings.length > 0 ? (userRatings.reduce((sum, rating) => sum + rating, 0) / userRatings.length).toFixed(2) : 'N/A'}`);
        console.log(`   - Rating range: ${userRatings.length > 0 ? `${Math.min(...userRatings)} - ${Math.max(...userRatings)}` : 'N/A'}`);
        console.log(`\n💬 Comments Data:`);
        console.log(`   - Comments from commentsMap:`, surveyComments);
        console.log(`   - Comment count: ${surveyComments.length}`);
        if (surveyComments.length > 0) {
          console.log(`   - Sample comments:`);
          surveyComments.slice(0, 3).forEach((comment, index) => {
            console.log(`     ${index + 1}. Rating: ${comment.feedback_rating}, Comment: "${comment.feedback_comment?.substring(0, 100)}${comment.feedback_comment?.length > 100 ? '...' : ''}"`);
          });
        }
        console.log(`\n📊 Survey Metrics from Database:`);
        console.log(`   - Average rating (from DB): ${typeof surveyMetrics.average_rating === 'number' ? surveyMetrics.average_rating.toFixed(2) : surveyMetrics.average_rating || 'N/A'}`);
        console.log(`   - Feedback count (from DB): ${surveyMetrics.feedback_count || 'N/A'}`);
        console.log(`   - Total users: ${surveyMetrics.total_users || 'N/A'}`);
        console.log(`   - Completed users: ${surveyMetrics.completed_users || 'N/A'}`);
        console.log(`   - Partial users: ${surveyMetrics.partial_users || 'N/A'}`);
        console.log(`   - Drop-off percentage: ${typeof surveyMetrics.dropoff_percentage === 'number' ? surveyMetrics.dropoff_percentage.toFixed(2) : surveyMetrics.dropoff_percentage || 'N/A'}%`);
        console.log(`   - Screen-out percentage: ${typeof surveyMetrics.screenout_percentage === 'number' ? surveyMetrics.screenout_percentage.toFixed(2) : surveyMetrics.screenout_percentage || 'N/A'}%`);
        console.log(`\n🧮 Sentiment Calculation:`);
        if (surveyComments.length > 0) {
          console.log(`   - Processing ${surveyComments.length} comments for sentiment analysis`);
          console.log(`   - Individual comment analysis:`);
          
          const individualSentiments = [];
          surveyComments.forEach((comment, index) => {
            const individualSentiment = sentimentAnalyzer.calculateAverageSentiment([comment.feedback_comment]);
            individualSentiments.push(individualSentiment);
            console.log(`     ${index + 1}. Comment: "${comment.feedback_comment?.substring(0, 80)}${comment.feedback_comment?.length > 80 ? '...' : ''}"`);
            console.log(`        Sentiment: ${typeof individualSentiment === 'number' ? individualSentiment.toFixed(4) : individualSentiment || 'N/A'}`);
          });
          
          const sentimentScore = sentimentAnalyzer.calculateAverageSentiment(surveyComments.map(c => c.feedback_comment));
          console.log(`\n   - Final sentiment calculation:`);
          console.log(`     Individual sentiments: [${individualSentiments.map(s => typeof s === 'number' ? s.toFixed(4) : s || 'N/A').join(', ')}]`);
          console.log(`     Average sentiment score: ${typeof sentimentScore === 'number' ? sentimentScore.toFixed(4) : sentimentScore || 'N/A'}`);
          console.log(`     Sentiment range: -1 (negative) to +1 (positive)`);
          console.log(`     Interpretation: ${sentimentScore > 0.1 ? 'Positive' : sentimentScore < -0.1 ? 'Negative' : 'Neutral'}`);
        } else {
          console.log(`   - No comments available for sentiment analysis`);
        }
        console.log(`================================================\n`);
      }

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

      // Log survey data preparation for survey 927820
      if (survey.id === 927820) {
        console.log(`\n📦 [SURVEY DATA PREPARATION] Survey ID: ${survey.id}`);
        console.log(`================================================`);
        console.log(`🔧 Prepared surveyData object:`);
        console.log(`   - surveyId: ${surveyData.surveyId}`);
        console.log(`   - userRatings: [${surveyData.userRatings.join(', ')}]`);
        console.log(`   - userSentiments: [${surveyData.userSentiments.join(', ')}]`);
        console.log(`   - dropoffs: ${surveyData.dropoffs}`);
        console.log(`   - totalAttempts: ${surveyData.totalAttempts}`);
        console.log(`   - screenouts: ${surveyData.screenouts}`);
        console.log(`   - screenerQuestionCount: ${surveyData.screenerQuestionCount}`);
        console.log(`\n🌍 Global averages being used:`);
        console.log(`   - globalAvgRating: ${typeof globalAverages.globalAvgRating === 'number' ? globalAverages.globalAvgRating.toFixed(2) : globalAverages.globalAvgRating || 'N/A'}`);
        console.log(`   - globalAvgDropoff: ${typeof globalAverages.globalAvgDropoff === 'number' ? globalAverages.globalAvgDropoff.toFixed(2) : globalAverages.globalAvgDropoff || 'N/A'}`);
        console.log(`   - globalAvgScreenout: ${typeof globalAverages.globalAvgScreenout === 'number' ? globalAverages.globalAvgScreenout.toFixed(2) : globalAverages.globalAvgScreenout || 'N/A'}`);
        console.log(`   - optimalK: ${optimalK}`);
        console.log(`================================================\n`);
      }
      
      // Only log detailed data for specific surveys
      if (survey.id === 927820 || survey.id === 600757) {
        console.log(`🔍 SURVEY ${survey.id} DATA FOR BAYESIAN CALCULATION:`);
        console.log(`   - Survey metrics:`, surveyMetrics);
        console.log(`   - Survey data object:`, surveyData);
        console.log(`   - Global averages:`, globalAverages);
      }

      // Calculate Bayesian XScore with pre-calculated optimal K
      let bayesianResult;
      try {
        // Only show detailed calculation for the first survey OR surveys that will use fallback scores
        const willNeedFallback = (!userRatings.length && !userSentiments.length) || !surveyMetrics.total_users;
        
        if (survey.id === 640974 || survey.id === 927820 || survey.id === 600757) {
          // Detailed logging for specific surveys
          const K_used = optimalK;
          const avg_rating = userRatings.length > 0 ? userRatings.reduce((sum, rating) => sum + rating, 0) / userRatings.length : globalAverages.globalAvgRating;
          const adjusted_rating = ((userRatings.length / (userRatings.length + K_used)) * avg_rating + (K_used / (userRatings.length + K_used)) * globalAverages.globalAvgRating);
          const normalized_user_rating = (adjusted_rating - 1) / 9;
          const user_rating_contribution = normalized_user_rating * 35;
          
          console.log(`\n🔍 [DETAILED CALCULATION] Survey ID: ${survey.id}`);
          console.log(`================================================`);
          console.log(`📊 Input Values:`);
          console.log(`   - K (smoothing parameter): ${K_used}`);
          console.log(`   - Feedback count (n): ${userRatings.length}`);
          console.log(`   - Survey average rating: ${avg_rating.toFixed(2)}`);
          console.log(`   - Global average rating: ${typeof globalAverages.globalAvgRating === 'number' ? globalAverages.globalAvgRating.toFixed(2) : globalAverages.globalAvgRating || 'N/A'}`);
          console.log(`\n🧮 Step-by-Step Calculation:`);
          console.log(`   1. Weight calculation:`);
          console.log(`      - Survey weight = n/(n+K) = ${userRatings.length}/(${userRatings.length}+${K_used}) = ${userRatings.length}/(${userRatings.length + K_used}) = ${(userRatings.length / (userRatings.length + K_used)).toFixed(4)}`);
          console.log(`      - Global weight = K/(n+K) = ${K_used}/(${userRatings.length}+${K_used}) = ${K_used}/(${userRatings.length + K_used}) = ${(K_used / (userRatings.length + K_used)).toFixed(4)}`);
          console.log(`\n   2. Adjusted rating calculation:`);
          console.log(`      - Adjusted Rating = (${(userRatings.length / (userRatings.length + K_used)).toFixed(4)} × ${avg_rating.toFixed(2)}) + (${(K_used / (userRatings.length + K_used)).toFixed(4)} × ${typeof globalAverages.globalAvgRating === 'number' ? globalAverages.globalAvgRating.toFixed(2) : globalAverages.globalAvgRating || 'N/A'})`);
          console.log(`      - Adjusted Rating = ${((userRatings.length / (userRatings.length + K_used)) * avg_rating).toFixed(4)} + ${((K_used / (userRatings.length + K_used)) * (typeof globalAverages.globalAvgRating === 'number' ? globalAverages.globalAvgRating : 0)).toFixed(4)}`);
          console.log(`      - Adjusted Rating = ${adjusted_rating.toFixed(4)}`);
          console.log(`\n   3. Normalization (0-1 scale):`);
          console.log(`      - Normalized Rating = (${adjusted_rating.toFixed(4)} - 1) / 9 = ${(adjusted_rating - 1).toFixed(4)} / 9 = ${normalized_user_rating.toFixed(4)}`);
          console.log(`\n   4. UX Score contribution:`);
          console.log(`      - User Rating Contribution = ${normalized_user_rating.toFixed(4)} × 35 = ${user_rating_contribution.toFixed(2)}`);
          console.log(`\n📈 Summary:`);
          console.log(`   - Raw Survey Rating: ${avg_rating.toFixed(2)}/10`);
          console.log(`   - After Bayesian Smoothing: ${adjusted_rating.toFixed(4)}/10`);
          console.log(`   - UX Score Contribution: ${user_rating_contribution.toFixed(2)} points (out of 35)`);
          console.log(`================================================\n`);
        }
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

      // Also calculate legacy experience score for comparison
      const legacyExperienceScore = this.calculateExperienceScoreFromData({
        userRating: surveyMetrics.average_rating || 0,
        userSentiment: surveyComments.length > 0 
          ? sentimentAnalyzer.calculateAverageSentiment(surveyComments.map(c => c.feedback_comment))
          : 0,
        dropoffRate: surveyMetrics.dropoff_percentage || 0,
        screenoutRate: surveyMetrics.screenout_percentage || 0,
        screenerQuestionCount: surveyScreener.total_screener_questions || 0
      });

      // Ensure we have valid scores - keep legacy and Bayesian separate
      const finalUserSentiment = bayesianResult.adjustedMetrics?.adjustedSentiment || 0;
      
      // Only log score comparison for specific surveys
      if (survey.id === 927820 || survey.id === 600757) {
        console.log(`🔍 Survey ${survey.id} Score Comparison:`, {
          legacyScore: legacyExperienceScore.experienceScore,
          bayesianScore: bayesianResult.xscore,
          difference: (bayesianResult.xscore - legacyExperienceScore.experienceScore).toFixed(2),
          userRating: surveyMetrics.average_rating,
          userSentiment: finalUserSentiment,
          dropoffRate: surveyMetrics.dropoff_percentage,
          screenoutRate: surveyMetrics.screenout_percentage
        });
      }
      
      // Detailed logging for specific surveys
      if (survey.id === 927820 || survey.id === 600757) {
        console.log(`\n🎯 [FINAL UX SCORE CALCULATION] Survey ID: ${survey.id}`);
        console.log(`================================================`);
        console.log(`📊 Final UX Score Components:`);
        console.log(`   - User Rating Contribution: ${bayesianResult.breakdown?.userRating?.contribution?.toFixed(2) || 'N/A'} (weight: 35)`);
        console.log(`   - User Sentiment Contribution: ${bayesianResult.breakdown?.userSentiment?.contribution?.toFixed(2) || 'N/A'} (weight: 25)`);
        console.log(`   - Drop-off Rate Contribution: ${bayesianResult.breakdown?.dropoffRate?.contribution?.toFixed(2) || 'N/A'} (weight: 20)`);
        console.log(`   - Screen-out Rate Contribution: ${bayesianResult.breakdown?.screenoutRate?.contribution?.toFixed(2) || 'N/A'} (weight: 15)`);
        console.log(`   - Screener Questions Contribution: ${bayesianResult.breakdown?.screenerQuestionCount?.contribution?.toFixed(2) || 'N/A'} (weight: 5)`);
        console.log(`\n🧮 Total UX Score Calculation:`);
        const totalContributions = (bayesianResult.breakdown?.userRating?.contribution || 0) + 
                                  (bayesianResult.breakdown?.userSentiment?.contribution || 0) + 
                                  (bayesianResult.breakdown?.dropoffRate?.contribution || 0) + 
                                  (bayesianResult.breakdown?.screenoutRate?.contribution || 0) + 
                                  (bayesianResult.breakdown?.screenerQuestionCount?.contribution || 0);
        console.log(`   - Total Contributions: ${totalContributions.toFixed(2)}`);
        console.log(`   - Final UX Score (XScore): ${bayesianResult.xscore?.toFixed(2) || 'N/A'}`);
        console.log(`   - Legacy Experience Score: ${legacyExperienceScore.experienceScore?.toFixed(2) || 'N/A'}`);
        console.log(`\n📱 UI Display Values:`);
        console.log(`   - Displayed UX Score: ${bayesianResult.xscore?.toFixed(1) || 'N/A'}`);
        console.log(`   - User Rating Display: ${bayesianResult.breakdown?.userRating?.value?.toFixed(1) || 'N/A'}/10`);
        console.log(`   - User Sentiment Display: ${bayesianResult.breakdown?.userSentiment?.value?.toFixed(2) || 'N/A'}`);
        console.log(`   - Drop-off Rate Display: ${bayesianResult.breakdown?.dropoffRate?.value?.toFixed(1) || 'N/A'}%`);
        console.log(`   - Screen-out Rate Display: ${bayesianResult.breakdown?.screenoutRate?.value?.toFixed(1) || 'N/A'}%`);
        console.log(`   - Screener Questions Display: ${bayesianResult.breakdown?.screenerQuestionCount?.value || 'N/A'}`);
        console.log(`================================================\n`);
      }
      
      return {
        ...survey,
        userRating: surveyMetrics.average_rating || 0,
        userSentiment: finalUserSentiment,
        dropOffPercent: surveyMetrics.dropoff_percentage || 0,
        screenOutPercent: surveyMetrics.screenout_percentage || 0,
        questionsInScreener: surveyScreener.total_screener_questions || 0,
        qualitativeComments: surveyComments.length,
        // Keep legacy experience score separate from Bayesian XScore
        experienceScore: legacyExperienceScore.experienceScore || 50,
        experienceCategory: legacyExperienceScore.category || 'fair',
        experienceColor: legacyExperienceScore.color || 'text-yellow-600',
        experienceBreakdown: legacyExperienceScore.breakdown,
        // Add Bayesian-specific data
        xscore: bayesianResult.xscore || 50, // New Bayesian XScore (separate from legacy)
        bayesianMetrics: bayesianResult.adjustedMetrics,
        smoothingInfo: bayesianResult.smoothingInfo,
        rawData: bayesianResult.rawData,
        breakdown: bayesianResult.breakdown, // Add the breakdown for frontend calculations
        // Legacy score for comparison
        legacyExperienceScore: legacyExperienceScore.experienceScore,
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

    // Log processing summary
    const validSurveys = surveysWithMetrics.filter(s => 
      s.experienceScore !== null && 
      s.experienceScore !== undefined && 
      !isNaN(s.experienceScore)
    );
    console.log(`✅ Processing complete: ${validSurveys.length}/${surveysWithMetrics.length} surveys have valid scores`);
    
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
      
      console.log(`📊 RATING DISTRIBUTION ANALYSIS:`);
      console.log(`📈 Total surveys with ratings: ${surveysWithRatings.length}`);
      console.log(`📊 Rating count statistics:`);
      console.log(`   - Average: ${avgRatings.toFixed(1)} ratings per survey`);
      console.log(`   - Median: ${medianRatings} ratings per survey`);
      console.log(`   - Range: ${minRatings} - ${maxRatings} ratings`);
      console.log(`📊 Distribution breakdown:`);
      console.log(`   - <5 ratings: ${distribution.low} surveys (${((distribution.low/surveysWithRatings.length)*100).toFixed(1)}%)`);
      console.log(`   - 5-19 ratings: ${distribution.medium} surveys (${((distribution.medium/surveysWithRatings.length)*100).toFixed(1)}%)`);
      console.log(`   - 20-99 ratings: ${distribution.high} surveys (${((distribution.high/surveysWithRatings.length)*100).toFixed(1)}%)`);
      console.log(`   - 100+ ratings: ${distribution.veryHigh} surveys (${((distribution.veryHigh/surveysWithRatings.length)*100).toFixed(1)}%)`);
      
      // Recommend K value based on distribution
      let recommendedK;
      if (distribution.low > distribution.medium + distribution.high) {
        // Most surveys have <5 ratings
        recommendedK = 8;
        console.log(`🎯 RECOMMENDED K = ${recommendedK} (Most surveys have <5 ratings)`);
      } else if (distribution.medium > distribution.low + distribution.high) {
        // Most surveys have 5-19 ratings
        recommendedK = 10;
        console.log(`🎯 RECOMMENDED K = ${recommendedK} (Most surveys have 5-19 ratings)`);
      } else if (distribution.high > distribution.low + distribution.medium) {
        // Most surveys have 20-99 ratings
        recommendedK = 15;
        console.log(`🎯 RECOMMENDED K = ${recommendedK} (Most surveys have 20-99 ratings)`);
      } else {
        // Mixed distribution, use median-based approach
        recommendedK = Math.max(8, Math.min(20, Math.round(medianRatings / 2)));
        console.log(`🎯 RECOMMENDED K = ${recommendedK} (Mixed distribution, based on median: ${medianRatings})`);
      }
      
      console.log(`📊 Current K value: 10`);
      console.log(`📊 Recommended K value: ${recommendedK}`);
      console.log(`📊 Difference: ${recommendedK - 10 > 0 ? '+' : ''}${recommendedK - 10}`);
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
      
      console.log(`📊 Score Distribution Summary:`, {
        totalSurveys: surveysWithBothScores.length,
        avgLegacyScore: avgLegacyScore.toFixed(2),
        avgBayesianScore: avgBayesianScore.toFixed(2),
        avgDifference: avgDifference.toFixed(2),
        bayesianHigher: surveysWithBothScores.filter(s => s.xscore > s.experienceScore).length,
        legacyHigher: surveysWithBothScores.filter(s => s.experienceScore > s.xscore).length,
        sameScore: surveysWithBothScores.filter(s => Math.abs(s.xscore - s.experienceScore) < 0.1).length
      });
    }
    
    console.log(`📤 BACKEND: About to return ${surveysWithMetrics.length} surveys to frontend`);
    console.log(`📊 BACKEND: Sample survey data:`, {
      id: surveysWithMetrics[0]?.id,
      experienceScore: surveysWithMetrics[0]?.experienceScore,
      xscore: surveysWithMetrics[0]?.xscore
    });

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
      LEFT JOIN crm_elements ce ON recent_pw.crm_element_id = ce.id
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
              AND screener_q.archived = 0
              AND all_q.archived = 0
              AND all_q.type != '*'
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

  // Get individual user ratings for Bayesian smoothing
  async getIndividualUserRatings(surveyId) {
    const query = `
      SELECT 
        uwd.feedback_rating as rating,
        uw.completed_date
      FROM users_wave_details uwd
      JOIN users_waves uw ON uwd.id = uw.id
      JOIN waves w ON uw.wave_id = w.id
      WHERE w.survey_id = ?
        AND uwd.feedback_rating > 0
        AND uwd.feedback_rating <= 10
      ORDER BY uw.completed_date DESC
    `;

    try {
      const rows = await database.query(query, [surveyId]);
      return rows;
    } catch (error) {
      console.error('Error in getIndividualUserRatings:', error);
      return [];
    }
  }

  // Get individual user sentiments for Bayesian smoothing
  async getIndividualUserSentiments(surveyId) {
    const query = `
      SELECT 
        uwd.feedback_comment,
        uwd.feedback_rating,
        uw.completed_date
      FROM users_wave_details uwd
      JOIN users_waves uw ON uwd.id = uw.id
      JOIN waves w ON uw.wave_id = w.id
      WHERE w.survey_id = ?
        AND uwd.feedback_comment IS NOT NULL
        AND uwd.feedback_comment != ''
        AND uwd.feedback_rating > 0
      ORDER BY uw.completed_date DESC
    `;

    try {
      const rows = await database.query(query, [surveyId]);
      
      // Calculate sentiment for each comment using Natural.js
      const sentiments = rows.map(row => {
        try {
          // Check if natural is properly imported
          if (!natural || !natural.SentimentAnalyzer) {
            console.error('❌ Natural.js not properly imported:', typeof natural);
            return {
              sentiment: 0,
              comment: row.feedback_comment,
              rating: row.feedback_rating,
              completed_date: row.completed_date
            };
          }
          
          const analyzer = new natural.SentimentAnalyzer("English", natural.PorterStemmer, "afinn");
          const words = row.feedback_comment.toLowerCase().split(/\s+/);
          let score = analyzer.getSentiment(words);
          
          // Add custom domain-specific keywords
          const customKeywords = {
            'excellent': 3, 'amazing': 3, 'outstanding': 3, 'fantastic': 3,
            'brilliant': 3, 'perfect': 3, 'love': 2, 'best': 2,
            'good': 1, 'great': 2, 'nice': 1, 'satisfied': 2, 'happy': 2,
            'enjoyed': 2, 'pleased': 2, 'smooth': 1, 'easy': 1, 'clear': 1,
            'helpful': 2, 'useful': 1, 'informative': 1, 'well': 1,
            'okay': 0.5, 'fine': 0.5, 'alright': 0.5, 'acceptable': 0.5,
            'decent': 0.5, 'not bad': 0.5,
            'could be better': -0.5, 'mediocre': -1, 'not great': -1,
            'average': -0.5, 'ordinary': -0.5,
            'bad': -2, 'poor': -2, 'disappointed': -2, 'frustrated': -2,
            'confusing': -2, 'difficult': -2, 'annoying': -2, 'boring': -2,
            'slow': -1, 'complicated': -2, 'unclear': -2, 'hard': -2,
            'terrible': -3, 'awful': -3, 'horrible': -3, 'worst': -3,
            'hate': -3, 'useless': -3, 'waste': -3, 'broken': -3,
            'unusable': -3, 'frustrating': -3
          };
          
          Object.keys(customKeywords).forEach(keyword => {
            if (row.feedback_comment.toLowerCase().includes(keyword)) {
              score += customKeywords[keyword];
            }
          });
          
          // Normalize to -1 to 1 range
          const normalizedScore = Math.max(-1, Math.min(1, score / 5));
          
          return {
            sentiment: normalizedScore,
            comment: row.feedback_comment,
            rating: row.feedback_rating,
            completed_date: row.completed_date
          };
        } catch (error) {
          console.error('Error calculating sentiment for comment:', row.feedback_comment, error);
          return {
            sentiment: 0,
            comment: row.feedback_comment,
            rating: row.feedback_rating,
            completed_date: row.completed_date
          };
        }
      });
      
      return sentiments;
    } catch (error) {
      console.error('Error in getIndividualUserSentiments:', error);
      return [];
    }
  }
}

module.exports = SurveyModel; 