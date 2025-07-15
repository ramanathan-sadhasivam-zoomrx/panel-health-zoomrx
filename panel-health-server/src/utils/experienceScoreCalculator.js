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
    return ((100 - dropoffRate) / 100) * 20; // Weight: 20%
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
      // 0 questions gives maximum 5% contribution, 12 gives 0%
      // Formula: (12 - questions) / 12 * 5
      return ((12 - cappedCount) / 12) * 5;
    } else {
      // More than 12 questions gives negative contribution (minimum -5%)
      // For 30+ questions, we want -5% contribution
      const excessQuestions = cappedCount - 12;
      const maxExcessForMinScore = 18; // 30 - 12 = 18 questions to reach -5%
      const negativeContribution = Math.min(5, (excessQuestions / maxExcessForMinScore) * 5);
      return -negativeContribution;
    }
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