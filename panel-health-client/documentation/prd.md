# 1 Overview

**Document Title/Enhancement:** Panel Health Dashboard - Survey UX Rating

**Summary:** This document outlines the vision for adding new functionality to an existing dashboard that measures the satisfaction (health) of our panel of physicians with our market research product.

**Purpose:** The Survey Experience Tracker provides stakeholders, particularly the Consulting team, with a comprehensive view of survey quality from a user experience standpoint. It enables teams to monitor the user-friendliness of surveys using a standardized scoring algorithm (Xscore).

-----------------

# 2 Context

ZoomRx is a market research platform where physicians can participate in market research by taking surveys and getting paid. The experience of taking a survey has a direct impact on data quality. The experience should be perceived by physicians as rewarding, efficient, and engaging. In order to ensure that stakeholders responsible for this survey experience - community managers, consultants, and survey coders - have a shared understanding of the panelist experience, we have built the Panel Health Dashboard.

Currently, it tracks the NPS score, which measures the general health of the panel as a whole. We want to extend its functionality by introducing a Survey Experience Score that quantifies the User Experience at the survey level.

-----------------

# 3 Survey Experience Score Methodology

The survey experience score is a custom algorithm that combines 5 metrics to produce a single rating from 0 to 100.

**Metrics:**

-   **User Rating:** Average user rating (scale 1-10) collected at the end of the survey.
-   **User Sentiment:** Average sentiment score (scale -1 to 1) based on qualitative feedback collected at the end of the survey.
-   **Drop-off %:** Percentage of users who started but did not complete the survey.
-   **Screen-out %:** Percentage of users who were screened-out from the survey.
-   **Que in Screener:** Total number of questions shown in the screener section of the survey.

**Score Calculation:**

The UX Score is calculated using the following algorithm -


// EXPERIENCE SCORE ALGORITHM
 
// Input metrics
userRating = [1-10]           // User rating from 1 to 10
userSentiment = [-1 to 1]         // User feedback sentiment from -1 to 1
dropoffRate = [0-100]         // Percentage of users who abandon the survey
screenoutRate = [0-100]       // Percentage of users disqualified from completing
screenerQuestionCount = [integer ≥ 3] // Number of screener questions (minimum 3)
 
// Step 1: Calculate qualitative metrics contributions (max 60%)
normalizedUserRating = (userRating - 1) / 9
userRatingContribution = normalizedUserRating * 35  // Weight: 35%
 
normalizedUserSentiment = (userSentiment + 1) / 2
userSentimentContribution = normalizedUserSentiment * 25    // Weight: 25%
 
// Step 2: Calculate performance metrics contributions (max 40%)
// For dropoff and screenout, 0% is ideal (contributes full weight positively)
dropoffContribution = (100 - dropoffRate) / 100 * 20  // Weight: 20%
screenoutContribution = (100 - screenoutRate) / 100 * 15  // Weight: 15%
 
// For screener question count, 3 is ideal (max contribution), 12 is neutral, 30+ is worst
questionCountContribution = 0
if (screenerQuestionCount <= 12) {
  // 3 questions (min) gives maximum 5% contribution, 12 gives 0%
  screenerQuestionCountContribution = ((12 - screenerQuestionCount) / 9) * 5
} else {
  // More than 12 questions gives negative contribution (minimum -5%)
  screenerQuestionCountContribution = ((12 - screenerQuestionCount) / 18) * 5
}
 
// Step 3: Calculate total score
experienceScore = userRatingContribution + 
                  userSentimentContribution + 
                  dropoffContribution + 
                  screenoutContribution + 
                  screenerQuestionCountContribution
 
// Step 4: Ensure score stays within 0-100 range
experienceScore = max(0, min(100, experienceScore))

-----------------

# 4 Layout

The survey experience tracker will be structured as a list of cards where each card represents a single survey. Each card by default is in its minimized view, but it can be expanded to reveal more details by tapping or clicking on the minimized card.

**Minimized card elements:**

-   Survey Title
-   CRM ID
-   Survey Experience Score

**Maximized card elements:**

-   Survey Title
-   CRM ID
-   Survey Experience Score
-   Link to admin portal (admin portal is where surveys are created, coded, fielded etc.)
-   5 individual components of the experience score and their unique values
-   Qualitative comments from panelists about that survey

-----------------

# 5 Key Actions

Users should be able to do the following:

-   Reveal the details of a specific survey.
-   Select whether they see the top 5 rated or the lowest 5 rated surveys.
-   Copy any qualitative comment to their clipboard.
-   Understand how the survey experience score is calculated.

-----------------

# 6 Additional Requirements

-   **UI** UI should be built with the shadcn component library.
-   **Data** This will be connected to a backend database. Building this protoype should use dummy data, but it should be easy to connect to a backend once it is ready for implmentation.
-   **Performance:** Dashboard should load and update quickly.
-   **Responsiveness:** UI should be usable on desktop and tablet devices.
-   **Accessibility:** Buttons and modals should be accessible via keyboard and screen readers.