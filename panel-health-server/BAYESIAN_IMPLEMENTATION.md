# Bayesian Smoothing XScore Implementation

## Overview

This document describes the implementation of the new Bayesian smoothing algorithm for calculating normalized XScores (0-100) for survey experience evaluation.

## 🎯 Key Features

### 1. **Bayesian Smoothing**
- Prevents extreme scores for surveys with low response volumes
- Uses global parameters calculated across all surveys
- Smoothing factor K = 10 (configurable)

### 2. **Individual Response Processing**
- Processes lists of individual ratings and sentiments
- Handles varying response volumes per survey
- Fallback to global averages when no responses available

### 3. **Global Parameters**
- `globalAvgRating`: Average of all ratings across surveys
- `globalAvgSentiment`: Average of all sentiments across surveys
- `globalAvgDropoffRate`: Average drop-off rate across surveys
- `globalAvgScreenoutRate`: Average screen-out rate across surveys
- `maxScreenerQuestionCount`: Maximum screener questions
- `minScreenerQuestionCount`: Minimum screener questions

## 🧮 Algorithm Steps

### Step 1: Calculate Raw Averages
```javascript
ratingCount = len(userRatings)
sentimentCount = len(userSentiments)

if ratingCount > 0:
    avgRating = sum(userRatings) / ratingCount
else:
    avgRating = globalAvgRating

if sentimentCount > 0:
    avgSentiment = sum(userSentiments) / sentimentCount
else:
    avgSentiment = globalAvgSentiment
```

### Step 2: Apply Bayesian Adjustment
```javascript
adjustedRating = ((ratingCount / (ratingCount + K)) * avgRating + 
                  (K / (ratingCount + K)) * globalAvgRating)

adjustedSentiment = ((sentimentCount / (sentimentCount + K)) * avgSentiment + 
                     (K / (sentimentCount + K)) * globalAvgSentiment)
```

### Step 3: Calculate Rates
```javascript
dropoffRate = (dropoffs / totalAttempts) * 100
screenoutRate = (screenouts / totalAttempts) * 100
```

### Step 4: Normalize Metrics (0-1)
```javascript
normalizedRating = adjustedRating / 10.0
normalizedSentiment = (adjustedSentiment + 1) / 2
normalizedDropoff = 1 - (dropoffRate / 100)
normalizedScreenout = 1 - (screenoutRate / 100)
normalizedScreener = (maxScreener - screenerCount) / (maxScreener - minScreener)
```

### Step 5: Apply Weights
```javascript
Xscore = (0.35 * normalizedRating + 
          0.25 * normalizedSentiment + 
          0.15 * normalizedDropoff + 
          0.15 * normalizedScreenout + 
          0.10 * normalizedScreener) * 100
```

## 📁 Files Modified

### 1. `src/utils/experienceScoreCalculator.js`
- **New Methods:**
  - `calculateGlobalParameters(surveys)`
  - `calculateAdjustedRating(userRatings, globalParams)`
  - `calculateAdjustedSentiment(userSentiments, globalParams)`
  - `calculateXScore(survey, globalParams)`
  - `normalizeScreenerCount(screenerCount, globalParams)`

- **Legacy Support:**
  - `calculateExperienceScore()` (deprecated but maintained)
  - All old contribution functions (deprecated)

### 2. `src/controllers/surveyController.js`
- **New Methods:**
  - `getGlobalParameters(req, res)`
  - `getXScore(req, res)`
  - `getAllSurveysWithXScore(req, res)`

### 3. `src/routes/surveys.js`
- **New Routes:**
  - `GET /api/surveys/global-parameters`
  - `GET /api/surveys/xscore/all`
  - `GET /api/surveys/:id/xscore`

## 🚀 API Endpoints

### Get Global Parameters
```http
GET /api/surveys/global-parameters
```
**Response:**
```json
{
  "success": true,
  "data": {
    "globalAvgRating": 7.2,
    "globalAvgSentiment": 0.3,
    "avgRatingCount": 8.5,
    "avgSentimentCount": 8.5,
    "globalAvgDropoffRate": 15.2,
    "globalAvgScreenoutRate": 10.1,
    "maxScreenerQuestionCount": 20,
    "minScreenerQuestionCount": 3,
    "K": 10
  }
}
```

### Get XScore for All Surveys
```http
GET /api/surveys/xscore/all
```
**Response:**
```json
{
  "success": true,
  "data": {
    "surveys": [...],
    "globalParameters": {...},
    "summary": {
      "totalSurveys": 10,
      "averageXScore": 65.3,
      "top5Surveys": [...],
      "lowest5Surveys": [...]
    }
  }
}
```

### Get XScore for Specific Survey
```http
GET /api/surveys/:id/xscore
```
**Response:**
```json
{
  "success": true,
  "data": {
    "surveyId": 1,
    "surveyTitle": "Sample Survey",
    "crmId": "CRM-001",
    "xscore": 72.5,
    "adjustedMetrics": {
      "adjustedRating": 8.2,
      "adjustedSentiment": 0.6,
      "dropoffRate": 12.0,
      "screenoutRate": 5.0,
      "normalizedRating": 0.82,
      "normalizedSentiment": 0.80,
      "normalizedDropoff": 0.88,
      "normalizedScreenout": 0.95,
      "normalizedScreener": 0.65
    },
    "breakdown": {...},
    "globalParameters": {...}
  }
}
```

## 🧪 Testing

### Run Test Script
```bash
cd panel-health-server
node test-bayesian.js
```

### Test Output Example
```
🧮 Testing Bayesian Smoothing Algorithm
============================================================

📊 Step 1: Calculating Global Parameters
Global Parameters: {
  "globalAvgRating": 8.0,
  "globalAvgSentiment": 0.5,
  "avgRatingCount": 7.3,
  "avgSentimentCount": 7.3,
  "globalAvgDropoffRate": 15.3,
  "globalAvgScreenoutRate": 8.3,
  "maxScreenerQuestionCount": 15,
  "minScreenerQuestionCount": 5,
  "K": 10
}

📈 Step 2: Calculating XScore for Each Survey
--- Survey 1: Test Survey 1 ---
XScore: 78.45
Adjusted Metrics:
  - Adjusted Rating: 8.50
  - Adjusted Sentiment: 0.68
  - Drop-off Rate: 12.00%
  - Screen-out Rate: 5.00%
...

🔍 Step 3: Testing Bayesian Smoothing Effect
Survey 2 (High Volume - 10 responses):
  Raw Average Rating: 9.20
  Adjusted Rating: 9.20
  XScore: 85.67

Survey 3 (Low Volume - 2 responses):
  Raw Average Rating: 6.50
  Adjusted Rating: 7.25
  XScore: 62.34

📊 Bayesian Smoothing Effect:
  Survey 2 weight on own data: 50.0%
  Survey 3 weight on own data: 16.7%
  Survey 3 is pulled toward global average due to low response count
```

## 🔧 Configuration

### Smoothing Factor (K)
- **Default**: 10
- **Effect**: Higher K = more smoothing toward global average
- **Recommendation**: 10 for most datasets

### Weights
- **User Rating**: 35%
- **User Sentiment**: 25%
- **Drop-off Rate**: 15%
- **Screen-out Rate**: 15%
- **Screener Questions**: 10%

## 📊 Data Structure Requirements

### Input Survey Object
```javascript
{
  userRatings: [8, 9, 8, 9, 8], // Array of individual ratings (1-10)
  userSentiments: [0.6, 0.7, 0.8, 0.6, 0.7], // Array of sentiments (-1 to 1)
  totalAttempts: 100, // Total attempts
  dropoffs: 12, // Number of dropoffs
  screenouts: 5, // Number of screenouts
  screenerQuestionCount: 10 // Number of screener questions
}
```

### Backward Compatibility
The system automatically converts old data format:
```javascript
// Old format
{
  userRating: 8.5,
  userSentiment: 0.7,
  dropOffPercent: 12,
  screenOutPercent: 5,
  questionsInScreener: 10
}

// Automatically converted to
{
  userRatings: [8.5],
  userSentiments: [0.7],
  totalAttempts: 100,
  dropoffs: 12,
  screenouts: 5,
  screenerQuestionCount: 10
}
```

## 🚀 Deployment

1. **Update Files**: All changes are in the Express.js backend only
2. **Test**: Run `node test-bayesian.js` to verify functionality
3. **API**: New endpoints are immediately available
4. **Legacy**: Old endpoints continue to work for backward compatibility

## 📈 Benefits

1. **Statistical Robustness**: Prevents extreme scores from low-volume surveys
2. **Fair Comparison**: Surveys with different response volumes can be compared fairly
3. **Global Context**: Scores are relative to the entire dataset
4. **Backward Compatibility**: Existing integrations continue to work
5. **Configurable**: K factor and weights can be adjusted as needed 