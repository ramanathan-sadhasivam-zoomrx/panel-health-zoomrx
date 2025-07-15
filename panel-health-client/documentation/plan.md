# Panel Health Dashboard - Survey UX Rating: Development Plan

## Phase 1: Project Setup & Initial Configuration

* [x] **1.1. Initialize Project Environment:**
    * [x] 1.1.1. Create a new project directory (e.g., `survey-ux-dashboard`).
    * [x] 1.1.2. Initialize a modern frontend framework (e.g., Next.js or Vite with React/TypeScript).
        * Command: `npx create-next-app@latest survey-ux-dashboard --typescript --tailwind --eslint` OR `npm create vite@latest survey-ux-dashboard -- --template react-ts`
    * [x] 1.1.3. Navigate into the project directory.
* [x] **1.2. Install shadcn/ui:**
    * [x] 1.2.1. Initialize shadcn/ui in the project.
        * Command: `npx shadcn-ui@latest init`
    * [x] 1.2.2. Confirm base color, CSS variables, and other configurations as per shadcn/ui setup.
* [x] **1.3. Install Core shadcn Components:**
    * [x] 1.3.1. Add `Card` component: `npx shadcn-ui@latest add card`
    * [x] 1.3.2. Add `Button` component: `npx shadcn-ui@latest add button`
    * [x] 1.3.3. Add `Dialog` component (for "how score is calculated" modal): `npx shadcn-ui@latest add dialog`
    * [x] 1.3.4. Add `Tooltip` component (optional, for hover info): `npx shadcn-ui@latest add tooltip`
    * [x] 1.3.5. Add `Select` component (for top/lowest 5 filter): `npx shadcn-ui@latest add select`
* [x] **1.4. Setup Dummy Data Structure:**
    * [x] 1.4.1. Create a `data` directory (e.g., `src/data`).
    * [x] 1.4.2. Create `dummySurveys.ts` file.
    * [x] 1.4.3. Define a TypeScript interface for a single survey's data, including:
        * `surveyTitle: string`
        * `crmId: string`
        * `userRating: number` (raw average 1-10)
        * `userSentiment: number` (raw average -1 to 1)
        * `dropOffPercent: number`
        * `screenOutPercent: number`
        * `questionsInScreener: number`
        * `qualitativeComments: string[]`
        * `adminPortalLink: string` (can be a placeholder like `#`)
    * [x] 1.4.4. Populate `dummySurveys.ts` with at least 10-15 diverse sample survey objects. Include variations in scores and comment numbers.

---
## Phase 2: Survey Experience Score Logic Implementation

* [x] **2.1. Create Score Calculation Module:**
    * [x] 2.1.1. Create a utility file (e.g., `src/lib/surveyScoreUtils.ts`).
* [x] **2.2. Implement Normalization Functions (if distinct from component contributions):**
    * [x] 2.2.1. Define `normalizeUserRating(userRating: number): number`. (User Rating is 1-10).
        * *Clarification*: The PRD mentions `normalizedUserRating * 35`. Assume `normalizedUserRating` is `User Rating / 10`.
        * `const normalizedUserRating = userRating / 10; return normalizedUserRating * 35;`
    * [x] 2.2.2. Define `normalizeSentiment(userSentiment: number): number`. (Sentiment is -1 to 1).
        * *Clarification*: The PRD mentions `normalizedSentiment * 25`. To map -1 to 1 into a 0 to 1 range for normalization, use `(userSentiment + 1) / 2`.
        * `const normalizedSentiment = (userSentiment + 1) / 2; return normalizedSentiment * 25;`
* [x] **2.3. Implement Contribution Calculation Functions:**
    * [x] 2.3.1. `calculateUserRatingContribution(userRating: number): number`
        * Formula: Based on `normalizedUserRating * 35`. If `userRating` is 1-10, then `(userRating / 10) * 35`.
    * [x] 2.3.2. `calculateSentimentContribution(userSentiment: number): number`
        * Formula: Based on `normalizedSentiment * 25`. If `userSentiment` is -1 to 1, then `((userSentiment + 1) / 2) * 25`.
    * [x] 2.3.3. `calculateDropoffContribution(dropoffRate: number): number`
        * Formula: `((100 - dropoffRate) / 100) * 20`
    * [x] 2.3.4. `calculateScreenoutContribution(screenoutRate: number): number`
        * Formula: `((100 - screenoutRate) / 100) * 15`
    * [x] 2.3.5. `calculateQuestionCountContribution(questionCount: number): number`
        * If `questionCount <= 12`: `((12 - questionCount) / 9) * 5`
        * Else (if `questionCount > 12`): `((12 - questionCount) / 18) * 5`
* [x] **2.4. Implement Main UX Score Function:**
    * [x] 2.4.1. Define `calculateUXScore(surveyData: SurveyData): number`
        * Calculates all 5 contributions using the functions above.
        * Sums the contributions.
        * Clamps the final sum to a range of 0-100.
* [x] **2.5. Unit Test Score Calculations:**
    * [x] 2.5.1. Write simple test cases for each contribution function with known inputs and expected outputs.
    * [x] 2.5.2. Write test cases for the main `calculateUXScore` function, including edge cases (e.g., scores that would go below 0 or above 100 before clamping).

---
## Phase 3: UI Development - Survey Card Component

* [x] **3.1. Create Survey Card Component:**
    * [x] 3.1.1. Create `SurveyCard.tsx` in a `components` directory (e.g., `src/components/ui` or `src/components`).
    * [x] 3.1.2. Define props for the component: `survey: EnrichedSurveyData` (this will be the dummy data plus the calculated UX score and its components).
    * [x] 3.1.3. Add state for `isExpanded`, defaulting to `false`.
* [x] **3.2. Implement Minimized Card View:**
    * [x] 3.2.1. Use `Card` component from shadcn.
    * [x] 3.2.2. Display `Survey Title`.
    * [x] 3.2.3. Display `CRM ID`.
    * [x] 3.2.4. Display calculated `Survey Experience Score`.
    * [x] 3.2.5. Make the card clickable to toggle `isExpanded` state.
* [x] **3.3. Implement Maximized Card View (conditionally rendered when `isExpanded` is true):**
    * [x] 3.3.1. Display `Survey Title`.
    * [x] 3.3.2. Display `CRM ID`.
    * [x] 3.3.3. Display calculated `Survey Experience Score`.
    * [x] 3.3.4. Display `Link to admin portal` (as a clickable link).
    * [x] 3.3.5. Display the 5 individual component scores/values and their unique values:
        * User Rating: (e.g., "User Rating: 8/10 (Contribution: X)")
        * User Sentiment: (e.g., "User Sentiment: 0.7 (Contribution: Y)")
        * Drop-off %: (e.g., "Drop-off: 10% (Contribution: Z)")
        * Screen-out %: (e.g., "Screen-out: 5% (Contribution: A)")
        * Que in Screener: (e.g., "Screener Questions: 10 (Contribution: B)")
    * [x] 3.3.6. Display `Qualitative comments from panelists`:
        * [x] 3.3.6.1. List each comment.
        * [x] 3.3.6.2. Add a "Copy" button next to each comment.

---
## Phase 4: UI Development - Dashboard Page & List View

* [x] **4.1. Create Main Dashboard Page:**
    * [x] 4.1.1. Create a new page/route (e.g., `src/app/dashboard/page.tsx` for Next.js or a main view component for Vite).
    * [x] 4.1.2. Import `dummySurveys.ts` and `calculateUXScore` related functions.
    * [x] 4.1.3. Process dummy data: For each survey, calculate its UX score and individual component contributions. Store this enriched data.
* [x] **4.2. Implement Survey List View:**
    * [x] 4.2.1. Map over the enriched survey data and render a `SurveyCard` for each survey.
    * [x] 4.2.2. Style the list for proper spacing and layout.
* [x] **4.3. Implement Top/Lowest 5 Rated Filter:**
    * [x] 4.3.1. Add state for the filter selection (e.g., `all`, `top5`, `bottom5`).
    * [x] 4.3.2. Add a `Select` component (or buttons) to choose the filter option.
    * [x] 4.3.3. Implement logic to sort surveys by `Survey Experience Score` (ascending for lowest, descending for top).
    * [x] 4.3.4. Update the displayed list based on the selected filter (show all, or slice the top/bottom 5).
* [x] **4.4. Add Score Calculation Explanation:**
    * [x] 4.4.1. Add a help button with an icon in the header.
    * [x] 4.4.2. Implement a dialog/modal using shadcn Dialog component.
    * [x] 4.4.3. Add detailed explanation of the score calculation methodology.
    * [x] 4.4.4. Style the explanation content for better readability.

---
## Phase 5: Key Actions & Additional Requirements Implementation

* [x] **5.1. Implement "Reveal Details" (Expand/Collapse):**
    * [x] 5.1.1. Verify that clicking/tapping a minimized card expands it, and clicking/tapping an expanded card (or a designated close button) minimizes it.
    * [x] 5.1.2. Add keyboard accessibility (Enter/Space to expand/collapse).
    * [x] 5.1.3. Add proper ARIA attributes for accessibility.
* [x] **5.2. Implement "Copy Qualitative Comment":**
    * [x] 5.2.1. Add `onClick` handler to each "Copy" button in the maximized card view.
    * [x] 5.2.2. Use `navigator.clipboard.writeText()` to copy the specific comment text.
    * [x] 5.2.3. Provide visual feedback on successful copy (temporary message and icon change).
    * [x] 5.2.4. Add keyboard accessibility for copy button.
* [x] **5.3. Implement "Understand How Score is Calculated":**
    * [x] 5.3.1. Add a button or link on the dashboard page (e.g., "How is the UX Score calculated?").
    * [x] 5.3.2. Use a `Dialog` (modal) component from shadcn to display the methodology.
    * [x] 5.3.3. Populate the modal with content from "Section 3: Survey Experience Score Methodology" of the PRD.
* [x] **5.4. UI (shadcn):**
    * [x] 5.4.1. Confirm all interactive elements (cards, buttons, modals, selects) are built using shadcn components.
    * [x] 5.4.2. Add loading state for data fetching.
    * [x] 5.4.3. Add error handling with Alert component.
* [x] **5.5. Data (Dummy Data & Backend Prep):**
    * [x] 5.5.1. Confirm dummy data is being used and is easily swappable.
    * [x] 5.5.2. Structure data loading/processing in a way that can be adapted for a future API call.
    * [x] 5.5.3. Add error handling for data loading.
* [x] **5.6. Performance (Initial Considerations):**
    * [x] 5.6.1. Ensure calculations are efficient using useMemo for derived data.
    * [x] 5.6.2. Add loading state to prevent UI jank during data processing.
* [x] **5.7. Responsiveness:**
    * [x] 5.7.1. Test the dashboard layout on typical desktop screen sizes.
    * [x] 5.7.2. Test the dashboard layout on typical tablet screen sizes (portrait and landscape).
    * [x] 5.7.3. Ensure cards reflow or resize appropriately.
    * [x] 5.7.4. Ensure modals and other elements are usable on smaller screens.
* [x] **5.8. Accessibility:**
    * [x] 5.8.1. **Buttons:** Ensure all buttons are focusable and activatable via keyboard (Enter/Space).
    * [x] 5.8.2. **Modals (Dialog):** Ensure modals are accessible via keyboard and screen readers.
    * [x] 5.8.3. **Card Expansion:** Ensure cards are keyboard focusable and the expand/collapse action can be triggered by keyboard.
    * [x] 5.8.4. **Screen Readers:** Add proper ARIA labels and roles for all interactive elements.

---
## Phase 6: Testing, Refinement & Demonstration Prep

* [x] **6.1. Functional Testing:**
    * [x] 6.1.1. Test all interactive elements: card expansion, filters, copy comment button, score calculation modal.
    * [x] 6.1.2. Verify score calculations against manual calculations for a few sample surveys.
    * [x] 6.1.3. Test edge cases for filtering (e.g., fewer than 5 surveys available).
* [x] **6.2. UI/UX Review:**
    * [x] 6.2.1. Review against "Section 4: Layout" in the PRD.
    * [x] 6.2.2. Check for consistent styling and clear information hierarchy.
    * [x] 6.2.3. Ensure the UI is intuitive and easy to understand.
* [x] **6.3. Code Review & Cleanup:**
    * [x] 6.3.1. Remove any console logs or temporary test code.
    * [x] 6.3.2. Ensure code is reasonably well-organized and commented for handoff.
    * [x] 6.3.3. Add comprehensive test coverage for components and pages.
* [x] **6.4. Prepare for Demonstration:**
    * [x] 6.4.1. Ensure the prototype runs smoothly in a sandboxed environment.
    * [x] 6.4.2. Prepare talking points to walk stakeholders through the features and how they meet the PRD requirements.
    * [x] 6.4.3. Document test coverage and quality assurance measures.