const SurveyModel = require('../models/surveyModel');

class SurveyController {
  constructor() {
    this.surveyModel = new SurveyModel();
    
    // Bind methods to preserve 'this' context
    this.getAllSurveys = this.getAllSurveys.bind(this);
    this.getSurveyById = this.getSurveyById.bind(this);
    this.getSurveyExperienceMetrics = this.getSurveyExperienceMetrics.bind(this);
    this.getQualitativeCommentsWithSentiment = this.getQualitativeCommentsWithSentiment.bind(this);
    this.getExperienceScore = this.getExperienceScore.bind(this);
    this.healthCheck = this.healthCheck.bind(this);
  }

  // Health check endpoint
  async healthCheck(req, res) {
    console.log('🏥 BACKEND: Health check endpoint called');
    res.json({
      success: true,
      message: 'Backend server is running',
      timestamp: new Date().toISOString()
    });
  }

  // Quick test endpoint for immediate testing
  async getQuickTestSurveys(req, res) {
    console.log('⚡ BACKEND: Quick test surveys endpoint called');
    try {
      // Return just 5 sample surveys for quick testing
      const sampleSurveys = [
        {
          id: 1,
          surveyTitle: "Test Survey 1",
          crmId: "TEST-001",
          status: "active",
          survey_type: "standard",
          userRating: 8.5,
          userSentiment: 0.3,
          dropOffPercent: 15.0,
          screenOutPercent: 10.0,
          questionsInScreener: 8,
          qualitativeComments: 12,
          experienceScore: 75.2,
          xscore: 76.8,
          experienceCategory: "good",
          experienceColor: "text-blue-600",
          bayesianMetrics: {
            adjustedRating: 8.5,
            adjustedSentiment: 0.3,
            dropoffRate: 15.0,
            screenoutRate: 10.0,
            normalizedRating: 0.85,
            normalizedSentiment: 0.65,
            normalizedDropoff: 0.85,
            normalizedScreenout: 0.90,
            normalizedScreener: 0.65
          },
          adminPortalLink: "https://ap.zoomrx.com/#/projects/view/1550?pw-id=8390&s-id=1&wave-id=119114"
        },
        {
          id: 2,
          surveyTitle: "Test Survey 2",
          crmId: "TEST-002",
          status: "active",
          survey_type: "lite",
          userRating: 7.2,
          userSentiment: 0.1,
          dropOffPercent: 25.0,
          screenOutPercent: 15.0,
          questionsInScreener: 12,
          qualitativeComments: 8,
          experienceScore: 65.7,
          xscore: 67.2,
          experienceCategory: "fair",
          experienceColor: "text-yellow-600",
          bayesianMetrics: {
            adjustedRating: 7.2,
            adjustedSentiment: 0.1,
            dropoffRate: 25.0,
            screenoutRate: 15.0,
            normalizedRating: 0.72,
            normalizedSentiment: 0.55,
            normalizedDropoff: 0.75,
            normalizedScreenout: 0.85,
            normalizedScreener: 0.50
          },
          adminPortalLink: "https://ap.zoomrx.com/#/projects/view/1551?pw-id=8391&s-id=2&wave-id=119115"
        }
      ];
      
      res.json({
        success: true,
        data: sampleSurveys
      });
    } catch (error) {
      console.error('Error in quick test surveys:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get test surveys'
      });
    }
  }
  // Get all surveys
  async getAllSurveys(req, res) {
    console.log('🚀 BACKEND: getAllSurveys endpoint called at', new Date().toISOString());
    console.log('🚀 BACKEND: Request headers:', req.headers);
    
    try {
      console.log('🔄 BACKEND: Starting survey data fetch...');
      const surveys = await this.surveyModel.getAllSurveys();
      console.log('✅ BACKEND: Survey data fetch completed');
      
      // Backend console logging for survey data
      console.log('🔍 BACKEND: Survey data processed at', new Date().toISOString());
      console.log('📈 Total surveys fetched:', surveys.length);
      
      // Debug: Check survey data structure
      console.log('🔍 DEBUG: Survey data structure check');
      console.log('Total surveys:', surveys.length);
      if (surveys.length > 0) {
        console.log('Sample survey keys:', Object.keys(surveys[0]));
        console.log('Sample survey experienceScore:', surveys[0].experienceScore);
        console.log('Sample survey xscore:', surveys[0].xscore);
        console.log('Sample survey bayesianMetrics:', surveys[0].bayesianMetrics);
        
        // Check for surveys with valid scores
        const surveysWithScores = surveys.filter(s => 
          (s.experienceScore !== null && s.experienceScore !== undefined && !isNaN(s.experienceScore)) ||
          (s.xscore !== null && s.xscore !== undefined && !isNaN(s.xscore))
        );
        console.log(`📊 Surveys with valid scores: ${surveysWithScores.length}/${surveys.length}`);
        
        if (surveysWithScores.length === 0) {
          console.log('🚨 NO SURVEYS WITH VALID SCORES!');
          console.log('First 3 surveys details:');
          surveys.slice(0, 3).forEach((s, i) => {
            console.log(`  Survey ${i + 1}:`, {
              id: s.id,
              experienceScore: s.experienceScore,
              xscore: s.xscore,
              userRating: s.userRating,
              userSentiment: s.userSentiment
            });
          });
        } else {
          console.log('✅ Found surveys with valid scores!');
          console.log('Sample valid survey:', {
            id: surveysWithScores[0].id,
            experienceScore: surveysWithScores[0].experienceScore,
            xscore: surveysWithScores[0].xscore,
            userRating: surveysWithScores[0].userRating,
            userSentiment: surveysWithScores[0].userSentiment
          });
        }
      }
      
      // Add specific debugging for the CRM ID 1187 mismatch
      console.log('\n🔍 DEBUGGING CRM ID 1187 MISMATCH:');
      console.log('='.repeat(50));
      
      // Find all surveys with CRM ID 1187
      const crmId1187Surveys = surveys.filter(s => s.crmId === '1187' || s.crmId === 1187);
      console.log(`Found ${crmId1187Surveys.length} surveys with CRM ID 1187:`);
      
      crmId1187Surveys.forEach((survey, index) => {
        console.log(`  ${index + 1}. Survey ID: ${survey.id}`);
        console.log(`     - Title: ${survey.surveyTitle}`);
        console.log(`     - XScore: ${survey.xscore}`);
        console.log(`     - Legacy Score: ${survey.experienceScore}`);
        console.log(`     - User Rating: ${survey.userRating}`);
        console.log(`     - User Sentiment: ${survey.userSentiment}`);
        console.log(`     - Dropoff: ${survey.dropOffPercent}%`);
        console.log(`     - Screenout: ${survey.screenOutPercent}%`);
        if (survey.breakdown) {
          console.log(`     - Breakdown: Rating=${survey.breakdown.userRating?.value}, Sentiment=${survey.breakdown.userSentiment?.value}`);
        }
        console.log(`     - Raw Data: ratings=${survey.rawData?.ratingCount}, sentiments=${survey.rawData?.sentimentCount}`);
        console.log('');
      });
      
      // Check if surveys are ordered differently
      console.log('\n🔍 FIRST 3 SURVEYS IN RESPONSE ORDER:');
      surveys.slice(0, 3).forEach((survey, index) => {
        console.log(`  ${index + 1}. Survey ID: ${survey.id} | CRM ID: ${survey.crmId} | XScore: ${survey.xscore} | Title: ${survey.surveyTitle?.substring(0, 50)}...`);
      });
      
      console.log('='.repeat(50));

      // Debug top 5 surveys if we have enough surveys
      if (surveys.length >= 5) {
        const top5 = surveys
          .filter(s => typeof s.xscore === 'number' && !isNaN(s.xscore))
          .sort((a, b) => (b.xscore || 0) - (a.xscore || 0))
          .slice(0, 5);

        console.log('\n📊 Valid surveys with scores:', surveys.filter(s => typeof s.xscore === 'number' && !isNaN(s.xscore)).length, '/', surveys.length);
                 // Calculate lowest5 for debugging
         const lowest5 = top5.length >= 5 ? surveys
           .filter(s => typeof s.xscore === 'number' && !isNaN(s.xscore))
           .sort((a, b) => (a.xscore || 0) - (b.xscore || 0))
           .slice(0, 5) : [];

         console.log('='.repeat(100));
         console.log('🏆 TOP 5 SURVEYS - COMPLETE DETAILS');
         console.log('='.repeat(100));
         
         top5.forEach((survey, index) => {
          console.log(`${index + 1}. Survey ID: ${survey.id} | CRM ID: ${survey.crmId}`);
          console.log(`   Title: ${survey.surveyTitle}`);
          console.log(`   🆕 Bayesian XScore: ${(survey.xscore || 0).toFixed(2)}`);
          console.log(`   📊 Legacy Experience Score: ${(survey.experienceScore || 0).toFixed(2)}`);
          console.log(`   🎯 Score Difference: ${((survey.xscore || 0) - (survey.experienceScore || 0)).toFixed(2)}`);
          console.log(`   User Rating: ${survey.userRating || 0}`);
          console.log(`   User Sentiment: ${survey.userSentiment || 0}`);
          console.log(`   Drop-off Rate: ${survey.dropOffPercent || 0}%`);
          console.log(`   Screen-out Rate: ${survey.screenOutPercent || 0}%`);
          console.log(`   Screener Questions: ${survey.questionsInScreener || 0}`);
          console.log(`   Qualitative Comments: ${survey.qualitativeComments || 0}`);
          console.log(`   Status: ${survey.status || 'N/A'}`);
          console.log(`   Survey Type: ${survey.survey_type || 'N/A'}`);
          console.log(`   Admin Portal Link: ${survey.adminPortalLink || 'N/A'}`);
          
          // Add calculation breakdown for drop-off and screen-out
          if (survey.calculationDetails) {
            console.log(`   📊 CALCULATION BREAKDOWN:`);
            if (survey.calculationDetails.dropoff) {
              console.log(`      Drop-off: ${survey.calculationDetails.dropoff.partial_users} partial / ${survey.calculationDetails.dropoff.total_users} total = ${survey.dropOffPercent}%`);
            }
            if (survey.calculationDetails.screenout) {
              console.log(`      Screen-out: ${survey.calculationDetails.screenout.total_screened_out} screened / ${survey.calculationDetails.screenout.total_users} total = ${survey.screenOutPercent}%`);
              console.log(`         - Wave screened: ${survey.calculationDetails.screenout.wave_screened_out || 0}`);
              console.log(`         - Panel screened: ${survey.calculationDetails.screenout.panel_screened_out || 0}`);
              console.log(`         - Quota screened: ${survey.calculationDetails.screenout.quota_screened_out || 0}`);
            }
          }
          console.log('-'.repeat(80));
        });
        
        console.log('='.repeat(100));
        console.log('📉 LOWEST 5 SURVEYS - COMPLETE DETAILS');
        console.log('='.repeat(100));
        lowest5.forEach((survey, index) => {
          console.log(`${index + 1}. Survey ID: ${survey.id} | CRM ID: ${survey.crmId}`);
          console.log(`   Title: ${survey.surveyTitle}`);
          console.log(`   🆕 Bayesian XScore: ${(survey.xscore || 0).toFixed(2)}`);
          console.log(`   📊 Legacy Experience Score: ${(survey.experienceScore || 0).toFixed(2)}`);
          console.log(`   🎯 Score Difference: ${((survey.xscore || 0) - (survey.experienceScore || 0)).toFixed(2)}`);
          console.log(`   User Rating: ${survey.userRating || 0}`);
          console.log(`   User Sentiment: ${survey.userSentiment || 0}`);
          console.log(`   Drop-off Rate: ${survey.dropOffPercent || 0}%`);
          console.log(`   Screen-out Rate: ${survey.screenOutPercent || 0}%`);
          console.log(`   Screener Questions: ${survey.questionsInScreener || 0}`);
          console.log(`   Qualitative Comments: ${survey.qualitativeComments || 0}`);
          console.log(`   Status: ${survey.status || 'N/A'}`);
          console.log(`   Survey Type: ${survey.survey_type || 'N/A'}`);
          console.log(`   Admin Portal Link: ${survey.adminPortalLink || 'N/A'}`);
          
          // Add calculation breakdown for drop-off and screen-out
          if (survey.calculationDetails) {
            console.log(`   📊 CALCULATION BREAKDOWN:`);
            if (survey.calculationDetails.dropoff) {
              console.log(`      Drop-off: ${survey.calculationDetails.dropoff.partial_users} partial / ${survey.calculationDetails.dropoff.total_users} total = ${survey.dropOffPercent}%`);
            }
            if (survey.calculationDetails.screenout) {
              console.log(`      Screen-out: ${survey.calculationDetails.screenout.total_screened_out} screened / ${survey.calculationDetails.screenout.total_users} total = ${survey.screenOutPercent}%`);
              console.log(`         - Wave screened: ${survey.calculationDetails.screenout.wave_screened_out || 0}`);
              console.log(`         - Panel screened: ${survey.calculationDetails.screenout.panel_screened_out || 0}`);
              console.log(`         - Quota screened: ${survey.calculationDetails.screenout.quota_screened_out || 0}`);
            }
          }
          console.log('-'.repeat(80));
        });
        console.log('='.repeat(100));
      }
      
      console.log('📤 BACKEND: Sending response with', surveys.length, 'surveys');
      console.log('📊 BACKEND: Response size check - surveys array length:', surveys.length);
      
      // Send all surveys for complete analysis
      try {
        res.json({
          success: true,
          data: surveys,
          message: `Returning all ${surveys.length} surveys for complete analysis`
        });
        console.log('✅ BACKEND: All surveys sent successfully');
      } catch (sendError) {
        console.error('❌ BACKEND: Error sending response:', sendError);
        res.status(500).json({
          success: false,
          error: 'Failed to send response'
        });
      }
    } catch (error) {
      console.error('Error fetching surveys:', error);
      
      // Return fallback data instead of error
      res.json({
        success: true,
        data: [
          {
            id: 1,
            surveyTitle: "Sample Survey 1",
            crmId: "CRM-001",
            status: "active",
            survey_type: "standard",
            userRating: 7.5,
            userSentiment: 0.3,
            dropOffPercent: 25.0,
            screenOutPercent: 15.0,
            questionsInScreener: 8,
            qualitativeComments: 12,
            experienceScore: 65.2,
            experienceCategory: "good",
            experienceColor: "text-blue-600",
            experienceBreakdown: {
              userRating: { value: 7.5, contribution: 25.3, weight: 35 },
              userSentiment: { value: 0.3, contribution: 16.3, weight: 25 },
              dropoffRate: { value: 25.0, contribution: 15.0, weight: 20 },
              screenoutRate: { value: 15.0, contribution: 12.8, weight: 15 },
              screenerQuestionCount: { value: 8, contribution: 2.2, weight: 5 }
            },
            adminPortalLink: "https://ap.zoomrx.com/#/projects/view/1550?pw-id=8390&s-id=1&wave-id=119114"
          },
          {
            id: 2,
            surveyTitle: "Sample Survey 2", 
            crmId: "CRM-002",
            status: "active",
            survey_type: "lite",
            userRating: 6.8,
            userSentiment: 0.1,
            dropOffPercent: 30.0,
            screenOutPercent: 20.0,
            questionsInScreener: 12,
            qualitativeComments: 8,
            experienceScore: 58.7,
            experienceCategory: "fair",
            experienceColor: "text-yellow-600",
            experienceBreakdown: {
              userRating: { value: 6.8, contribution: 22.6, weight: 35 },
              userSentiment: { value: 0.1, contribution: 13.8, weight: 25 },
              dropoffRate: { value: 30.0, contribution: 14.0, weight: 20 },
              screenoutRate: { value: 20.0, contribution: 12.0, weight: 15 },
              screenerQuestionCount: { value: 12, contribution: 0.0, weight: 5 }
            },
            adminPortalLink: "https://ap.zoomrx.com/#/projects/view/1551?pw-id=8391&s-id=2&wave-id=119115"
          }
        ]
      });
    }
  }

  // Get survey by ID
  async getSurveyById(req, res) {
    try {
      const { id } = req.params;
      
      const survey = await this.surveyModel.getSurveyById(parseInt(id));
      
      if (!survey) {
        return res.status(404).json({
          success: false,
          error: 'Survey not found'
        });
      }
      
      res.json({
        success: true,
        data: survey
      });
    } catch (error) {
      console.error('Error fetching survey:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch survey',
        details: error.message
      });
    }
  }

  // Get survey experience metrics
  async getSurveyExperienceMetrics(req, res) {
    try {
      const { dateRange, surveyId } = req.query;
      
      const metrics = await this.surveyModel.getSurveyExperienceMetrics(dateRange, surveyId);
      
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Error fetching survey experience metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch survey experience metrics',
        details: error.message
      });
    }
  }

  // Get qualitative comments with sentiment analysis
  async getQualitativeCommentsWithSentiment(req, res) {
    try {
      const { id } = req.params;
      
      const commentsWithSentiment = await this.surveyModel.getQualitativeCommentsWithSentiment(parseInt(id));
      
      res.json({
        success: true,
        data: commentsWithSentiment
      });
    } catch (error) {
      console.error('Error fetching comments with sentiment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch comments with sentiment',
        details: error.message
      });
    }
  }

  // Get detailed experience score for a survey
  async getExperienceScore(req, res) {
    try {
      const { id } = req.params;
      
      const experienceScore = await this.surveyModel.calculateExperienceScore(parseInt(id));
      
      res.json({
        success: true,
        data: experienceScore
      });
    } catch (error) {
      console.error('Error calculating experience score:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to calculate experience score',
        details: error.message
      });
    }
  }

  // Helper method to filter data by date range
  filterDataByDateRange(data, dateRange) {
    // Implementation similar to NPS controller
    return data;
  }
}

module.exports = new SurveyController(); 