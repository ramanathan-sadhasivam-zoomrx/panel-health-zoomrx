## 1. Overview

**Document Title:** ZoomRx Panelist Dashboard Enhancement: Introducing Navigation Tabs

**Summary:** This document outlines the vision for a significant enhancement to the current **ZoomRx panelist dashboard**. This enhancement involves adding new functionality that will allow for the clear **classification and organization of various engagement opportunities** offered by ZoomRx to its panelists under separate, intuitive navigation tabs.

**Purpose:** The primary purpose of these tabs is to enable panelists to **effortlessly navigate between the diverse engagement opportunities** available on the ZoomRx platform. This design ensures that multiple offerings can exist simultaneously on the dashboard **without creating a cluttered or overwhelming user experience** for the panelists.

## 2. Context

ZoomRx is a dedicated market research platform where **healthcare professionals (HCPs) participate in paid healthcare market research surveys**. The current ZoomRx panelist dashboard serves as the primary user interface for HCPs to engage with these survey offerings.

Historically, surveys have been ZoomRx's main engagement source. However, we are now aiming to **expand beyond traditional market research surveys** and evolve the perception of ZoomRx among HCPs. Our goal is to demonstrate that ZoomRx offers a broader range of valuable engagement opportunities. To achieve this, we plan to introduce diverse content types such as **News Briefs, Clinical Polls, and Clinical Case Challenges**. This strategic diversification will help us change how users perceive the ZoomRx platform.

Currently, the dashboard's landing page primarily displays a list of surveys tailored for individual HCPs. Integrating these new offerings directly onto this existing page would likely lead to a **cluttered, visually overwhelming, and less user-friendly interface**. Therefore, the addition of **dedicated navigation tabs** is crucial to logically separate and present these non-survey offerings, ensuring the dashboard remains streamlined and easy to navigate.

## 3. Layout

Please refer to the provided screenshot for the current visual representation of the ZoomRx panelist landing page.

The existing page structure is logically divided into four primary sections:

1.  **Header Container:** Located at the top of the page.
2.  **Banner Section:** Positioned directly below the Header Container.
3.  **Survey List:** The main content area, displaying available surveys.
4.  **Footer Container:** Located at the bottom of the page.

### Current Layout Details:

1.  **Header Container**
    * **Hamburger Menu:** A hamburger icon (`☰`) on the far top-left corner. Tapping this icon reveals a side menu with the following navigation options:
        * Dashboard
        * Profile
        * Payments
        * Refer and Earn
        * Change Password
        * Contact Us
        * About ZoomRx
        * Logout
    * **Branding:** The ZoomRx logo and name are centrally displayed within the header.
    * **Action Icons:** On the top-right corner, there are two interactive icons:
        * **Dollar Icon (`$`)**: Tapping this icon directs the user to their Payments page.
        * **Message Icon (`✉️`)**: Tapping this icon displays any notifications the user has received.

2.  **Banner Section**
    * This section features a dynamic **carousel** that cycles through multiple promotional or informational banners.

3.  **Survey List**
    * This section presents available surveys in an **N x 2 grid layout** of cards, where 'N' is dynamically determined by the number of surveys assigned to the individual user.
    * **Survey Card Structure:** Each card represents a distinct survey and is divided into two parts:
        * **Top Section:** Displays essential survey details (e.g., title, estimated duration, incentive).
        * **Bottom Section:** Contains a clear **Call to Action (CTA)**, guiding the user to participate.
    * **Interactivity:** The entire survey card is clickable, performing the same action as the CTA displayed in its bottom section.

4.  **Footer Container**
    * This informational section promotes the **ZoomRx mobile application download**. It provides direct links to both the Apple App Store and Google Play Store for user convenience.

### Proposed Layout Enhancement:

The key enhancement involves introducing new navigation tabs directly **below the existing Banner section**. These tabs will be arranged horizontally and serve as primary navigation for different content types.

There will be three distinct tabs:

* **Surveys:**
    * **Functionality:** When this tab is active, the content area below will display the familiar list of all surveys, consistent with the current dashboard's primary view.
* **Curie Briefs:**
    * **Functionality:** When this tab is active, the content area will transform to display a dedicated page showcasing **news articles** relevant to the panelist.
* **RxPlayground:**
    * **Functionality:** When this tab is active, the content area will display any **polls, quizzes, or case challenges** currently available for the user to participate in.
```