export interface Survey {
  id?: number;
  surveyTitle: string;
  crmId: string;
  userRating: number; // raw average 1-10
  userSentiment: number; // raw average -1 to 1
  dropOffPercent: number;
  screenOutPercent: number;
  questionsInScreener: number;
  qualitativeComments: string[];
  adminPortalLink: string;
  experienceScore?: number; // UX score calculated by backend
}

export const dummySurveys: Survey[] = [
  {
    surveyTitle: "J&J Gastro & Derm MSL Tracking",
    crmId: "CRM-001",
    userRating: 8.5,
    userSentiment: 0.7,
    dropOffPercent: 12,
    screenOutPercent: 5,
    questionsInScreener: 10,
    qualitativeComments: [
      "The survey was a bit too long, but the questions were relevant.",
      "I liked the new product section.",
    ],
    adminPortalLink: "#",
  },
  {
    surveyTitle: "IMFINZI LUNG",
    crmId: "CRM-002",
    userRating: 9.2,
    userSentiment: 0.9,
    dropOffPercent: 5,
    screenOutPercent: 2,
    questionsInScreener: 5,
    qualitativeComments: [
      "The new feature is amazing! It's so much easier to use now.",
      "Great job on this update.",
      "I found a small bug on the export button.",
    ],
    adminPortalLink: "#",
  },
  {
    surveyTitle: "AZN[PET]: Imfinzi BTC + HCC (949)",
    crmId: "CRM-003",
    userRating: 6.1,
    userSentiment: -0.2,
    dropOffPercent: 25,
    screenOutPercent: 15,
    questionsInScreener: 15,
    qualitativeComments: [
      "The new design is very confusing.",
      "I can't find the login page anymore.",
      "Why did you change it? The old one was better.",
    ],
    adminPortalLink: "#",
  },
  {
    surveyTitle: "ABV [PET]: CREON",
    crmId: "CRM-004",
    userRating: 7.8,
    userSentiment: 0.5,
    dropOffPercent: 10,
    screenOutPercent: 8,
    questionsInScreener: 12,
    qualitativeComments: [
      "The app is generally good, but it crashes sometimes on my Android phone.",
      "The navigation could be improved.",
    ],
    adminPortalLink: "#",
  },
  {
    surveyTitle: "J&J MM PET",
    crmId: "CRM-005",
    userRating: 9.5,
    userSentiment: 0.95,
    dropOffPercent: 2,
    screenOutPercent: 1,
    questionsInScreener: 8,
    qualitativeComments: ["Best place to work!"],
    adminPortalLink: "#",
  },
  {
    surveyTitle: "AMG_EVENITY_KAM_ATU",
    crmId: "CRM-006",
    userRating: 4.2,
    userSentiment: -0.8,
    dropOffPercent: 40,
    screenOutPercent: 20,
    questionsInScreener: 18,
    qualitativeComments: [
      "The support agent was not helpful at all.",
      "I waited for 30 minutes and my issue is still not resolved.",
    ],
    adminPortalLink: "#",
  },
  {
    surveyTitle: "Bone Health [KAM PET]: Prolia/Evenity",
    crmId: "CRM-007",
    userRating: 6.9,
    userSentiment: 0.1,
    dropOffPercent: 18,
    screenOutPercent: 12,
    questionsInScreener: 14,
    qualitativeComments: [
      "The prices are a bit high compared to competitors.",
      "I would pay more for better quality.",
    ],
    adminPortalLink: "#",
  },
  {
    surveyTitle: "Gilead [CA]: HIV PrEP",
    crmId: "CRM-008",
    userRating: 8.8,
    userSentiment: 0.8,
    dropOffPercent: 6,
    screenOutPercent: 4,
    questionsInScreener: 7,
    qualitativeComments: ["Excited to be part of the beta program!"],
    adminPortalLink: "#",
  },
  {
    surveyTitle: "AMG_Prolia_ATU_2025",
    crmId: "CRM-009",
    userRating: 7.2,
    userSentiment: 0.3,
    dropOffPercent: 15,
    screenOutPercent: 10,
    questionsInScreener: 11,
    qualitativeComments: [
      "I saw the ad on Facebook, it was very catchy.",
      "The discount code didn't work.",
    ],
    adminPortalLink: "#",
  },
  {
    surveyTitle: "Regeneron [PET]: Eylea",
    crmId: "CRM-010",
    userRating: 5.5,
    userSentiment: -0.5,
    dropOffPercent: 30,
    screenOutPercent: 22,
    questionsInScreener: 20,
    qualitativeComments: [
      "Your competitor offers a free trial, you should too.",
      "Their UI is much cleaner.",
    ],
    adminPortalLink: "#",
  },
]; 