const experienceScoreCalculator = require('./src/utils/experienceScoreCalculator');

console.log('🧮 Simple Bayesian Test');
console.log('='.repeat(50));

// Test with simple data
const testData = {
  userRatings: [8, 9, 7],
  userSentiments: [0.5, 0.7, 0.3],
  dropoffs: 5,
  totalAttempts: 50,
  screenouts: 3,
  screenerQuestionCount: 8
};

const globalAverages = {
  globalAvgRating: 7.2,
  globalAvgSentiment: 0.3,
  globalAvgDropoffRate: 15.2,
  globalAvgScreenoutRate: 10.1,
  maxScreenerQuestionCount: 20,
  minScreenerQuestionCount: 3
};

try {
  console.log('📊 Test Data:', testData);
  console.log('🌍 Global Averages:', globalAverages);
  
  const result = experienceScoreCalculator.calculateBayesianXScore(testData, globalAverages);
  
  console.log('✅ Bayesian Calculation Result:');
  console.log('XScore:', result.xscore);
  console.log('Adjusted Rating:', result.adjustedMetrics.adjustedRating);
  console.log('Adjusted Sentiment:', result.adjustedMetrics.adjustedSentiment);
  console.log('Category:', result.category);
  console.log('Color:', result.color);
  
  console.log('✅ Test PASSED - Bayesian calculation works!');
} catch (error) {
  console.error('❌ Test FAILED:', error);
  console.error('Stack trace:', error.stack);
} 