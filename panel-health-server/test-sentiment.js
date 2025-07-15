const sentimentAnalyzer = require('./src/utils/sentimentAnalyzer');

// Test sentiment analysis
console.log('🧠 Testing Sentiment Analysis\n');

// Test cases
const testComments = [
  "This survey was absolutely amazing! I loved every part of it.",
  "The survey was terrible and confusing. I hated it.",
  "It was okay, nothing special but not bad either.",
  "Great experience, very user-friendly and intuitive.",
  "This is the worst survey I've ever taken. Complete waste of time.",
  "Excellent survey design and great questions!",
  "The interface is confusing and the questions are unclear.",
  "Pretty good overall, some improvements needed.",
  "Fantastic! Everything was perfect.",
  "Disappointing experience, needs major improvements."
];

console.log('📝 Individual Comment Analysis:');
testComments.forEach((comment, index) => {
  const sentiment = sentimentAnalyzer.getDetailedSentiment(comment);
  console.log(`${index + 1}. "${comment}"`);
  console.log(`   Score: ${sentiment.score}, Category: ${sentiment.category}, Confidence: ${sentiment.confidence}`);
  console.log(`   Positive words: [${sentiment.words.positive.join(', ')}]`);
  console.log(`   Negative words: [${sentiment.words.negative.join(', ')}]`);
  console.log('');
});

console.log('📊 Average Sentiment Analysis:');
const averageSentiment = sentimentAnalyzer.calculateAverageSentiment(testComments);
console.log(`Average sentiment score: ${averageSentiment}`);
console.log(`Overall category: ${sentimentAnalyzer.categorizeSentiment(averageSentiment)}`);

console.log('\n🎯 Sentiment Score Ranges:');
console.log('-1.0 to -0.3: Negative');
console.log('-0.3 to 0.3: Neutral');
console.log('0.3 to 1.0: Positive'); 