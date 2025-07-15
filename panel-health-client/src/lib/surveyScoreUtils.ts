import type { Survey } from "@/data/dummySurveys";

// --- Contribution Calculation Functions ---

/**
 * Calculates the contribution of the user rating to the total UX score.
 * Raw userRating is 0-10. Contribution is 0-40.
 */
export const calculateUserRatingContribution = (rating: number): number => {
  // Clamp rating between 0 and 10
  const clamped = Math.max(0, Math.min(10, rating));
  return clamped * 4;
};

/**
 * Calculates the contribution of user sentiment to the total UX score.
 * Raw userSentiment is -1 to 1. Contribution is 0-35, with 0 → 12.5.
 */
export const calculateSentimentContribution = (sentiment: number): number => {
  // Clamp sentiment between -1 and 1
  const clamped = Math.max(-1, Math.min(1, sentiment));
  // Map -1 to 0, 0 to 12.5, 1 to 25, then scale to 35
  // Linear mapping: (sentiment + 1) / 2 * 25, then scale to 35/25
  return ((clamped + 1) / 2) * 25 * (35 / 25);
};

/**
 * Calculates the contribution of the drop-off rate to the total UX score.
 * 0% → 15, 100% → 0, proportional.
 */
export const calculateDropoffContribution = (dropoff: number): number => {
  // Clamp dropoff between 0 and 100
  const clamped = Math.max(0, Math.min(100, dropoff));
  return 15 * (1 - clamped / 100);
};

/**
 * Calculates the contribution of the screen-out rate to the total UX score.
 * 0% → 15, 100% → 0, proportional.
 */
export const calculateScreenoutContribution = (screenout: number): number => {
  // Clamp screenout between 0 and 100
  const clamped = Math.max(0, Math.min(100, screenout));
  return 15 * (1 - clamped / 100);
};

/**
 * Calculates the contribution of the number of screener questions to the total UX score.
 * 7 → ~2.78, 12 → 0, 18 → -1.67, proportional.
 */
export const calculateQuestionCountContribution = (questions: number): number => {
  // Proportional: (12 - questions) / 9 * 5
  // Clamp at 7 (max), 12 (knee), 18 (min)
  if (questions <= 7) return (12 - 7) / 9 * 5; // max
  if (questions >= 18) return (12 - 18) / 18 * 5; // min
  return ((12 - questions) / 9) * 5;
};

// --- Main UX Score Function ---

export interface EnrichedSurvey extends Survey {
  uxScore: number;
  contributions: {
    userRating: number;
    sentiment: number;
    dropoff: number;
    screenout: number;
    questionCount: number;
  };
}

type ScoreInput = {
  userRating: number;
  userSentiment: number;
  dropOffPercent: number;
  screenOutPercent: number;
  questionsInScreener: number;
};

/**
 * Calculates the total Survey Experience Score and individual contributions.
 * Clamps the total score between 0 and 100.
 */
export function calculateUXScore(survey: ScoreInput): number {
  const userRatingScore = calculateUserRatingContribution(survey.userRating);
  const sentimentScore = calculateSentimentContribution(survey.userSentiment);
  const dropoffScore = calculateDropoffContribution(survey.dropOffPercent);
  const screenoutScore = calculateScreenoutContribution(survey.screenOutPercent);
  const questionCountScore = calculateQuestionCountContribution(survey.questionsInScreener);

  const total = userRatingScore + sentimentScore + dropoffScore + screenoutScore + questionCountScore;
  return Math.max(0, Math.min(100, total));
} 