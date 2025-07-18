class ExperienceScoreCalculator {
  /**
   * Calculate the Survey Experience Score (Xscore) using the specified algorithm
   * @param {Object} metrics - Object containing all required metrics
   * @param {number} metrics.userRating - User rating from 1 to 10
   * @param {number} metrics.userSentiment - User feedback sentiment from -1 to 1
   * @param {number} metrics.dropoffRate - Percentage of users who dropped off (0-100)
   * @param {number} metrics.screenoutRate - Percentage of users screened out (0-100)
   * @param {number} metrics.screenerQuestionCount - Number of screener questions (≥3)
   * @returns {Object} - Experience score and breakdown
   */
  calculateExperienceScore(metrics) {
    const {
      userRating,
      userSentiment,
      dropoffRate,
      screenoutRate,
      screenerQuestionCount
    } = metrics;

    // Validate inputs
    if (!this.validateInputs(metrics)) {
      throw new Error('Invalid input metrics for experience score calculation');
    }

    // Step 1: Calculate qualitative metrics contributions (max 60%)
    const userRatingContribution = this.calculateUserRatingContribution(userRating);
    const userSentimentContribution = this.calculateUserSentimentContribution(userSentiment);

    // Step 2: Calculate performance metrics contributions (max 40%)
    const dropoffContribution = this.calculateDropoffContribution(dropoffRate);
    const screenoutContribution = this.calculateScreenoutContribution(screenoutRate);
    const screenerQuestionContribution = this.calculateScreenerQuestionContribution(screenerQuestionCount);

    // Step 3: Calculate total score
    const experienceScore = userRatingContribution + 
                           userSentimentContribution + 
                           dropoffContribution + 
                           screenoutContribution + 
                           screenerQuestionContribution;

    // Step 4: Ensure score stays within 0-100 range using max(0,min(100,experienceScore))
    const finalScore = Math.max(0, Math.min(100, experienceScore));

    return {
      score: Math.round(finalScore * 100) / 100, // Round to 2 decimal places
      breakdown: {
        userRating: {
          value: userRating,
          contribution: userRatingContribution,
          weight: 35
        },
        userSentiment: {
          value: userSentiment,
          contribution: userSentimentContribution,
          weight: 25
        },
        dropoffRate: {
          value: dropoffRate,
          contribution: dropoffContribution,
          weight: 20
        },
        screenoutRate: {
          value: screenoutRate,
          contribution: screenoutContribution,
          weight: 15
        },
        screenerQuestionCount: {
          value: screenerQuestionCount,
          contribution: screenerQuestionContribution,
          weight: 5
        }
      },
      totalContribution: experienceScore
    };
  }

  /**
   * Validate input metrics - Accept all values as per requirements document
   * @param {Object} metrics - Input metrics
   * @returns {boolean} - True if valid
   */
  validateInputs(metrics) {
    const { userRating, userSentiment, dropoffRate, screenoutRate, screenerQuestionCount } = metrics;

    // Accept all values with minimum user rating of 1 (as per formula requirements)
    return (
      userRating !== null && userRating !== undefined && userRating >= 1 &&
      userSentiment !== null && userSentiment !== undefined &&
      dropoffRate !== null && dropoffRate !== undefined &&
      screenoutRate !== null && screenoutRate !== undefined &&
      screenerQuestionCount !== null && screenerQuestionCount !== undefined
    );
  }

  /**
   * Calculate user rating contribution (35% weight)
   * @param {number} userRating - Rating from 1 to 10
   * @returns {number} - Contribution score
   */
  calculateUserRatingContribution(userRating) {
    const normalizedUserRating = (userRating - 1) / 9;
    return normalizedUserRating * 35; // Weight: 35%
  }

  /**
   * Calculate user sentiment contribution (25% weight)
   * @param {number} userSentiment - Sentiment from -1 to 1
   * @returns {number} - Contribution score
   */
  calculateUserSentimentContribution(userSentiment) {
    const normalizedUserSentiment = (userSentiment + 1) / 2;
    return normalizedUserSentiment * 25; // Weight: 25%
  }

  /**
   * Calculate dropoff contribution (20% weight)
   * @param {number} dropoffRate - Dropoff percentage (0-100)
   * @returns {number} - Contribution score
   */
  calculateDropoffContribution(dropoffRate) {
    return ((100 - dropoffRate) / 100) * 15; // FIXED: Changed from 20% to 15% to match Bayesian weights
  }

  /**
   * Calculate screenout contribution (15% weight)
   * @param {number} screenoutRate - Screenout percentage (0-100)
   * @returns {number} - Contribution score
   */
  calculateScreenoutContribution(screenoutRate) {
    return ((100 - screenoutRate) / 100) * 15; // Weight: 15%
  }

  /**
   * Calculate screener question count contribution (5% weight)
   * @param {number} screenerQuestionCount - Number of screener questions
   * @returns {number} - Contribution score
   */
  calculateScreenerQuestionContribution(screenerQuestionCount) {
    // Cap the question count to prevent extreme negative scores
    const cappedCount = Math.min(50, screenerQuestionCount);
    
    if (cappedCount <= 12) {
      // 0 questions gives maximum 10% contribution, 12 gives 0%
      // Formula: (12 - questions) / 12 * 10
      return ((12 - cappedCount) / 12) * 10; // FIXED: Changed from 5 to 10 to match Bayesian weights
    } else {
      // More than 12 questions gives negative contribution (minimum -10%)
      // For 30+ questions, we want -10% contribution
      const excessQuestions = cappedCount - 12;
      const maxExcessForMinScore = 18; // 30 - 12 = 18 questions to reach -10%
      const negativeContribution = Math.min(10, (excessQuestions / maxExcessForMinScore) * 10); // FIXED: Changed from 5 to 10
      return -negativeContribution;
    }
  }

  /**
   * Calculate Bayesian XScore with smoothing for low response volumes (SILENT VERSION)
   * @param {Object} surveyData - Survey data with individual responses
   * @param {Object} globalAverages - Global averages across all surveys
   * @param {number} K - Smoothing factor (default: 10)
   * @returns {Object} - Bayesian XScore and detailed breakdown
   */
  calculateBayesianXScoreSilent(surveyData, globalAverages, K = 10) {
    // Simple implementation - just call the main method
    return this.calculateBayesianXScore(surveyData, globalAverages, K);
  }

  /**
   * Calculate optimal K value based on rating distribution
   * @param {Array} ratingCounts - Array of rating counts across all surveys
   * @returns {number} - Optimal K value
   */
  calculateOptimalK(ratingCounts) {
    if (!ratingCounts || ratingCounts.length === 0) return 10;
    
    const distribution = {
      low: ratingCounts.filter(count => count < 5).length,
      medium: ratingCounts.filter(count => count >= 5 && count < 20).length,
      high: ratingCounts.filter(count => count >= 20 && count < 100).length,
      veryHigh: ratingCounts.filter(count => count >= 100).length
    };
    
    const total = ratingCounts.length;
    
    // Determine dominant category
    if (distribution.low > distribution.medium + distribution.high) {
      // Most surveys have <5 ratings
      return 8;
    } else if (distribution.medium > distribution.low + distribution.high) {
      // Most surveys have 5-19 ratings
      return 10;
    } else if (distribution.high > distribution.low + distribution.medium) {
      // Most surveys have 20-99 ratings
      return 15;
    } else {
      // Mixed distribution, use median-based approach
      const medianRatings = ratingCounts.sort((a, b) => a - b)[Math.floor(ratingCounts.length / 2)];
      return Math.max(8, Math.min(20, Math.round(medianRatings / 2)));
    }
  }

  /**
   * Calculate Bayesian XScore with smoothing for low response volumes
   * @param {Object} surveyData - Survey data with individual responses
   * @param {Array} surveyData.userRatings - Array of individual user ratings (1-10)
   * @param {Array} surveyData.userSentiments - Array of individual user sentiments (-1 to 1)
   * @param {number} surveyData.dropoffs - Number of users who dropped off
   * @param {number} surveyData.totalAttempts - Total number of attempts
   * @param {number} surveyData.screenouts - Number of users screened out
   * @param {number} surveyData.screenerQuestionCount - Number of screener questions
   * @param {Object} globalAverages - Global averages across all surveys
   * @param {number} globalAverages.globalAvgRating - Global average rating
   * @param {number} globalAverages.globalAvgSentiment - Global average sentiment
   * @param {number} globalAverages.globalAvgDropoffRate - Global average dropoff rate
   * @param {number} globalAverages.globalAvgScreenoutRate - Global average screenout rate
   * @param {number} globalAverages.maxScreenerQuestionCount - Maximum screener questions
   * @param {number} globalAverages.minScreenerQuestionCount - Minimum screener questions
   * @param {number} K - Smoothing factor (default: 10)
   * @returns {Object} - Bayesian XScore and detailed breakdown
   */
  calculateBayesianXScore(surveyData, globalAverages, K = 10) {
    const {
      userRatings,
      userSentiments,
      dropoffs,
      totalAttempts,
      screenouts,
      screenerQuestionCount
    } = surveyData;

    const {
      globalAvgRating = 5.5,
      globalAvgSentiment = 0,
      maxScreenerQuestionCount = 30,
      minScreenerQuestionCount = 0
    } = globalAverages;

    // Step 1: Compute raw averages (EXACT REQUIREMENT)
    const rating_count = userRatings.length;
    const sentiment_count = userSentiments.length;

    let avg_rating, avg_sentiment;

    if (rating_count > 0) {
      avg_rating = userRatings.reduce((sum, rating) => sum + rating, 0) / rating_count;
    } else {
      avg_rating = globalAvgRating; // fallback
    }

    if (sentiment_count > 0) {
      avg_sentiment = userSentiments.reduce((sum, sentiment) => sum + sentiment, 0) / sentiment_count;
    } else {
      avg_sentiment = globalAvgSentiment; // fallback
    }

    // Step 2: Apply Bayesian adjustment (EXACT REQUIREMENT)
    const adjusted_rating = ((rating_count / (rating_count + K)) * avg_rating + 
                             (K / (rating_count + K)) * globalAvgRating);

    const adjusted_sentiment = ((sentiment_count / (sentiment_count + K)) * avg_sentiment + 
                                (K / (sentiment_count + K)) * globalAvgSentiment);

    // Step 3: Compute drop-off and screen-out rates (EXACT REQUIREMENT)
    const dropoff_rate = totalAttempts > 0 ? (dropoffs / totalAttempts) * 100 : 0;
    const screenout_rate = totalAttempts > 0 ? (screenouts / totalAttempts) * 100 : 0;

    // Step 4: Normalize metrics (EXACT REQUIREMENT)
    const norm_rating = adjusted_rating / 10.0; // since rating is 1–10
    const norm_sentiment = (adjusted_sentiment + 1) / 2; // since sentiment is -1 to 1
    const norm_dropoff = 1 - (dropoff_rate / 100); // invert: lower dropoff is better
    const norm_screenout = 1 - (screenout_rate / 100); // invert: lower screenout is better
    
    // Screener normalization (fewer questions = better) (EXACT REQUIREMENT)
    const norm_screener = ((maxScreenerQuestionCount - screenerQuestionCount) / 
                           (maxScreenerQuestionCount - minScreenerQuestionCount));

    // Step 5: Apply weights (EXACT REQUIREMENT)
    const Xscore_raw = (
      0.35 * norm_rating + 
      0.25 * norm_sentiment + 
      0.15 * norm_dropoff + 
      0.15 * norm_screenout + 
      0.10 * norm_screener
    );

    // Step 6: Scale to 0–100 (EXACT REQUIREMENT)
    const Xscore = Xscore_raw * 100;

    return {
      xscore: Math.round(Xscore * 100) / 100,
      adjustedMetrics: {
        adjustedRating: Math.round(adjusted_rating * 100) / 100,
        adjustedSentiment: Math.round(adjusted_sentiment * 1000) / 1000,
        dropoffRate: Math.round(dropoff_rate * 100) / 100,
        screenoutRate: Math.round(screenout_rate * 100) / 100,
        normalizedRating: Math.round(norm_rating * 1000) / 1000,
        normalizedSentiment: Math.round(norm_sentiment * 1000) / 1000,
        normalizedDropoff: Math.round(norm_dropoff * 1000) / 1000,
        normalizedScreenout: Math.round(norm_screenout * 1000) / 1000,
        normalizedScreener: Math.round(norm_screener * 1000) / 1000
      },
      rawData: {
        ratingCount: rating_count,
        sentimentCount: sentiment_count,
        avgRating: Math.round(avg_rating * 100) / 100,
        avgSentiment: Math.round(avg_sentiment * 1000) / 1000,
        dropoffs,
        totalAttempts,
        screenouts,
        screenerQuestionCount
      },
      smoothingInfo: {
        K,
        ratingWeight: rating_count / (rating_count + K),
        globalRatingWeight: K / (rating_count + K),
        sentimentWeight: sentiment_count / (sentiment_count + K),
        globalSentimentWeight: K / (sentiment_count + K)
      },
      breakdown: {
        userRating: {
          value: adjusted_rating,
          contribution: 0.35 * norm_rating * 100,
          weight: 35
        },
        userSentiment: {
          value: adjusted_sentiment,
          contribution: 0.25 * norm_sentiment * 100,
          weight: 25
        },
        dropoffRate: {
          value: dropoff_rate,
          contribution: 0.15 * norm_dropoff * 100,
          weight: 15
        },
        screenoutRate: {
          value: screenout_rate,
          contribution: 0.15 * norm_screenout * 100,
          weight: 15
        },
        screenerQuestionCount: {
          value: screenerQuestionCount,
          contribution: 0.10 * norm_screener * 100,
          weight: 10
        }
      },
      category: this.getScoreCategory(Xscore),
      color: this.getScoreColor(Xscore)
    };
  }

  /**
   * Get score category based on experience score
   * @param {number} score - Experience score (0-100)
   * @returns {string} - Score category
   */
  getScoreCategory(score) {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    if (score >= 20) return 'poor';
    return 'very_poor';
  }

  /**
   * Get score color for UI display
   * @param {number} score - Experience score (0-100)
   * @returns {string} - Color class
   */
  getScoreColor(score) {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    if (score >= 20) return 'text-orange-600';
    return 'text-red-600';
  }
}

module.exports = new ExperienceScoreCalculator(); 