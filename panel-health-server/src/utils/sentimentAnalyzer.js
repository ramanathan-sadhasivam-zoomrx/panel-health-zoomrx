const Sentiment = require('sentiment');

class SentimentAnalyzer {
  constructor() {
    this.sentiment = new Sentiment();
  }

  /**
   * Calculate sentiment score from text feedback
   * @param {string} text - The qualitative feedback text
   * @returns {number} - Sentiment score: -1 (negative), 0 (neutral), 1 (positive)
   */
  analyzeSentiment(text) {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return 0; // Neutral for empty/null text
    }

    try {
      const result = this.sentiment.analyze(text);
      
      // Simple categorization based on score
      if (result.score > 0) {
        return 1; // Positive
      } else if (result.score < 0) {
        return -1; // Negative
      } else {
        return 0; // Neutral
      }
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      return 0; // Return neutral on error
    }
  }

  /**
   * Calculate average sentiment from multiple comments
   * @param {string[]} comments - Array of comment texts
   * @returns {number} - Average sentiment score: -1 (negative), 0 (neutral), 1 (positive)
   */
  calculateAverageSentiment(comments) {
    if (!comments || comments.length === 0) {
      return 0;
    }

    const sentiments = comments
      .filter(comment => comment && comment.trim().length > 0)
      .map(comment => this.analyzeSentiment(comment));

    if (sentiments.length === 0) {
      return 0;
    }

    // Calculate average and round to nearest integer (-1, 0, or 1)
    const average = sentiments.reduce((sum, score) => sum + score, 0) / sentiments.length;
    
    if (average > 0.3) return 1;      // Mostly positive
    if (average < -0.3) return -1;    // Mostly negative
    return 0;                         // Neutral or mixed
  }

  /**
   * Categorize sentiment score into labels
   * @param {number} score - Sentiment score: -1, 0, or 1
   * @returns {string} - Sentiment category
   */
  categorizeSentiment(score) {
    if (score === 1) return 'positive';
    if (score === -1) return 'negative';
    return 'neutral';
  }

  /**
   * Categorize rating-based sentiment (5-10 scale)
   * @param {number} rating - Rating from 1-10
   * @returns {string} - Sentiment category
   */
  categorizeRatingSentiment(rating) {
    if (rating >= 5) return 'positive';
    if (rating <= 3) return 'negative';
    return 'neutral';
  }

  /**
   * Get detailed sentiment analysis
   * @param {string} text - The qualitative feedback text
   * @returns {object} - Detailed sentiment analysis
   */
  getDetailedSentiment(text) {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return {
        score: 0,
        category: 'neutral',
        confidence: 1,
        words: { positive: [], negative: [] }
      };
    }

    try {
      const result = this.sentiment.analyze(text);
      const score = this.analyzeSentiment(text);
      
      return {
        score: score, // -1, 0, or 1
        category: this.categorizeSentiment(score),
        confidence: 1, // Always confident with simple scoring
        words: {
          positive: result.positive || [],
          negative: result.negative || []
        },
        comparative: result.comparative || 0
      };
    } catch (error) {
      console.error('Error in detailed sentiment analysis:', error);
      return {
        score: 0,
        category: 'neutral',
        confidence: 1,
        words: { positive: [], negative: [] }
      };
    }
  }
}

module.exports = new SentimentAnalyzer(); 