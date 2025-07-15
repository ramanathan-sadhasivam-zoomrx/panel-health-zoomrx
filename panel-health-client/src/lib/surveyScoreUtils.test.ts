import {
  calculateUserRatingContribution,
  calculateSentimentContribution,
  calculateDropoffContribution,
  calculateScreenoutContribution,
  calculateQuestionCountContribution,
  calculateUXScore,
} from "./surveyScoreUtils";
import type { Survey } from "@/data/dummySurveys";

describe("Survey Score Calculation Utilities", () => {
  // Test cases for calculateUserRatingContribution
  describe("calculateUserRatingContribution", () => {
    it("should return 40 for a rating of 10", () => {
      expect(calculateUserRatingContribution(10)).toBe(40);
    });
    it("should return 0 for a rating of 0", () => {
      expect(calculateUserRatingContribution(0)).toBe(0);
    });
    it("should return 20 for a rating of 5", () => {
      expect(calculateUserRatingContribution(5)).toBe(20);
    });
  });

  // Test cases for calculateSentimentContribution
  describe("calculateSentimentContribution", () => {
    it("should return 35 for a sentiment of 1", () => {
      expect(calculateSentimentContribution(1)).toBe(35);
    });
    it("should return 0 for a sentiment of -1", () => {
      expect(calculateSentimentContribution(-1)).toBe(0);
    });
    it("should return 17.5 for a neutral sentiment of 0", () => {
      expect(calculateSentimentContribution(0)).toBe(17.5);
    });
  });

  // Test cases for calculateDropoffContribution
  describe("calculateDropoffContribution", () => {
    it("should return 15 for a dropoff of 0%", () => {
      expect(calculateDropoffContribution(0)).toBe(15);
    });
    it("should return 0 for a dropoff of 100%", () => {
      expect(calculateDropoffContribution(100)).toBe(0);
    });
    it("should return 7.5 for a dropoff of 50%", () => {
      expect(calculateDropoffContribution(50)).toBe(7.5);
    });
  });

  // Test cases for calculateScreenoutContribution
  describe("calculateScreenoutContribution", () => {
    it("should return 15 for a screenout of 0%", () => {
      expect(calculateScreenoutContribution(0)).toBe(15);
    });
    it("should return 0 for a screenout of 100%", () => {
      expect(calculateScreenoutContribution(100)).toBe(0);
    });
    it("should return 7.5 for a screenout of 50%", () => {
      expect(calculateScreenoutContribution(50)).toBe(7.5);
    });
  });

  // Test cases for calculateQuestionCountContribution
  describe("calculateQuestionCountContribution", () => {
    it("should return 2.777... for 7 questions", () => {
      expect(calculateQuestionCountContribution(7)).toBeCloseTo(2.777, 2);
    });
    it("should return 0 for 12 questions (knee point)", () => {
      expect(calculateQuestionCountContribution(12)).toBeCloseTo(0, 2);
    });
    it("should return -1.666... for more than 12 questions", () => {
      expect(calculateQuestionCountContribution(18)).toBeCloseTo(-1.666, 2);
    });
  });

  // Test cases for the main calculateUXScore function
  describe("calculateUXScore", () => {
    const baseSurvey: Survey = {
      surveyTitle: "Test Survey",
      crmId: "CRM-TEST",
      userRating: 5,
      userSentiment: 0,
      dropOffPercent: 50,
      screenOutPercent: 50,
      questionsInScreener: 12,
      qualitativeComments: [],
      adminPortalLink: "#",
    };

    it("should calculate a score of 52.5 for average inputs", () => {
      // Rating: 20, Sent: 17.5, Drop: 7.5, Screen: 7.5, Qs: 0 = 52.5
      const result = calculateUXScore(baseSurvey);
      expect(result).toBeCloseTo(52.5, 2);
    });

    it("should clamp the score to 100 for perfect inputs", () => {
      const perfectSurvey: Survey = {
        ...baseSurvey,
        userRating: 10,
        userSentiment: 1,
        dropOffPercent: 0,
        screenOutPercent: 0,
        questionsInScreener: 3, // Ideal is < 12, so let's use a low number
      };
      // Rating: 35, Sent: 25, Drop: 20, Screen: 15, Qs: 5 = 100
      const result = calculateUXScore(perfectSurvey);
      expect(result).toBe(100);
    });

    it("should clamp the score to 0 for very poor inputs that result in a negative sum", () => {
      const poorSurvey: Survey = {
        ...baseSurvey,
        userRating: 0,
        userSentiment: -1,
        dropOffPercent: 100,
        screenOutPercent: 100,
        questionsInScreener: 30, // very high number of questions
      };
      // Rating: 0, Sent: 0, Drop: 0, Screen: 0, Qs: -5 = -5. Clamped to 0.
      const result = calculateUXScore(poorSurvey);
      expect(result).toBe(0);
    });

    it("should correctly calculate contributions in the enriched object", () => {
      const result = calculateUXScore(baseSurvey);
      expect(result).toBeCloseTo(52.5, 2);
    });

    it("calculates score correctly for high ratings", () => {
      const survey: Survey = {
        surveyTitle: "High Rating Survey",
        crmId: "HIGH1",
        userRating: 9.5,
        userSentiment: 0.9,
        dropOffPercent: 10,
        screenOutPercent: 5,
        questionsInScreener: 5,
        qualitativeComments: ["Excellent survey!"],
        adminPortalLink: "https://example.com/admin"
      };

      const score = calculateUXScore(survey);
      expect(score).toBeCloseTo(100, 2); // Clamped to 100
    });

    it("calculates score correctly for medium ratings", () => {
      const survey: Survey = {
        surveyTitle: "Medium Rating Survey",
        crmId: "MED1",
        userRating: 7.0,
        userSentiment: 0.6,
        dropOffPercent: 25,
        screenOutPercent: 20,
        questionsInScreener: 8,
        qualitativeComments: ["Good survey"],
        adminPortalLink: "https://example.com/admin"
      };

      const score = calculateUXScore(survey);
      expect(score).toBeCloseTo(81.47, 2);
    });

    it("calculates score correctly for low ratings", () => {
      const survey: Survey = {
        surveyTitle: "Low Rating Survey",
        crmId: "LOW1",
        userRating: 4.0,
        userSentiment: 0.3,
        dropOffPercent: 40,
        screenOutPercent: 35,
        questionsInScreener: 12,
        qualitativeComments: ["Needs improvement"],
        adminPortalLink: "https://example.com/admin"
      };

      const score = calculateUXScore(survey);
      expect(score).toBeCloseTo(57.5, 2);
    });
  });

  test('calculates user rating contribution correctly', () => {
    expect(calculateUserRatingContribution(10)).toBe(40);
    expect(calculateUserRatingContribution(7.0)).toBe(28);
    expect(calculateUserRatingContribution(5.0)).toBe(20);
  });

  test('calculates sentiment contribution correctly', () => {
    expect(calculateSentimentContribution(1)).toBe(35);
    expect(calculateSentimentContribution(0.5)).toBeCloseTo(22.5, 2);
    expect(calculateSentimentContribution(0.3)).toBeCloseTo(20.25, 2);
  });

  test('calculates dropoff contribution correctly', () => {
    expect(calculateDropoffContribution(0)).toBe(15);
    expect(calculateDropoffContribution(25)).toBeCloseTo(11.25, 2);
    expect(calculateDropoffContribution(35)).toBeCloseTo(9.75, 2);
  });

  test('calculates screenout contribution correctly', () => {
    expect(calculateScreenoutContribution(10)).toBeCloseTo(13.5, 2);
    expect(calculateScreenoutContribution(20)).toBeCloseTo(12, 2);
    expect(calculateScreenoutContribution(30)).toBeCloseTo(10.5, 2);
  });

  test('calculates question count contribution correctly', () => {
    expect(calculateQuestionCountContribution(8)).toBeCloseTo(2.222, 2);
    expect(calculateQuestionCountContribution(12)).toBeCloseTo(0, 2);
    expect(calculateQuestionCountContribution(15)).toBeCloseTo(-1.666, 2);
  });

  test('calculates total UX score correctly', () => {
    const survey = {
      userRating: 8.5,
      userSentiment: 0.7,
      dropOffPercent: 15,
      screenOutPercent: 10,
      questionsInScreener: 8
    };
    expect(calculateUXScore(survey)).toBeCloseTo(92.22, 2);
  });
}); 