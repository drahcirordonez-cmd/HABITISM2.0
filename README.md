# 🌸 HABITISM — Gamified Habit Tracker with Real Consequences

> **"Turn Daily Discipline Into A Living Bloom."**  
> An immersive, full-stack habit tracker combining **cosmic glassmorphic UI**, **botanical companion growth**, **side-by-side above-the-fold productivity**, and **real social accountability** powered by the Facebook Graph API.

---

## 🌟 Key Features

### 1. Complete End-to-End User Flow
1. **Welcome Landing Page (`index.html`)**: Introduces the 4 pillars of Habitism (Companion Growth, Facebook Penalty, Coins/Freezes, Weekly Certificates) with hero CTAs.
2. **Login / Registration Page (`login.html`)**: Features an authentic blooming flower CSS animation, Facebook OAuth simulation button, and email/password account creation.
3. **Commitment & Rules Contract (`rules.html`)**: An unskippable glassmorphism contract page explaining the midnight accountability rule, daily streak mechanics, and rewards.
4. **Dashboard & Habit Tracker (`dashboard.html`)**: 
   - Side-by-side Calendar and Checklist with identical dimensions, visible **above the fold** without page scrolling.
   - User profile stats in navbar, coin balance, streak freezes, living companion widget, shop modal, printable weekly certificate, and a prominent **"Log Out"** button.

---

### 2. Side-by-Side & Above-The-Fold Layout
* **Left Card (Calendar)**:
  * Full month calendar with smooth navigation (◀ ▶).
  * Auto-tracks today's date.
  * **3-Tier Calendar Highlights**:
    * 🟢 **5 habits finished**: Day turns **Glowing Emerald Green**.
    * 🟠 **6–7 habits finished**: Day turns **Bright Orange**.
    * 💎 **8+ habits finished**: Day turns **Bright White-Blue**.
  * Dynamic streak counter calculating active consecutive days.
* **Right Card (Habit Checklist)**:
  * **Option A vs. Option B**: Switch seamlessly between **5 Custom Habits** or **Developer Levels 1–5**.
  * **Curated Developer Levels 1–5**: Includes informative `(i)` circular buttons with hovering tooltips.
  * **Dynamic Habit Container Themes**:
    * Automatically glows **Bright Orange** when total tasks reach **6–7**.
    * Automatically glows **Bright White-Blue** when total tasks reach **8 or more**.
  * **Dynamic Checkbox Glow**:
    * Checkmarks glow **Bright Orange** when **6–7 habits** are checked off.
    * Checkmarks glow **Bright White-Blue** when **8 or more habits** are checked off.
  * Real-time progress bar with percentage.
  * Quick-add input and delete buttons.

---

### 3. Punishment System: Facebook Social Accountability
* **The Midnight Deadline**: Users must complete their daily commitment before 11:59 PM.
* **Automated Facebook Graph API Engine**:
  * If daily habits are left incomplete and no Streak Freeze is owned, the backend issues an automated Graph API post to the configured Facebook Page:
    > *"This person made this commitment but did not complete it."*
  * **Configured Page:** `Habitism`
  * **Page ID:** `1496888330165860`
* **Streak Penalty**: The user's active streak resets to `0` days upon failure.

---

### 4. Reward & Gamification System
* **🪙 Habit Coins**: Earn **+10 Coins** whenever you check off a habit item with live celebratory toasts.
* **🛍️ Habit Shop & ❄️ Streak Freezes**:
  * Spend **50 Coins** to purchase a **Streak Freeze**.
  * A streak freeze shields you from a broken streak and suppresses the Facebook accountability penalty if you miss a day.
* **🌱 Living Companion Visual Evolution**:
  * Streak 0–1 days: 🌰 **Nurturing Seed** (Stage 1)
  * Streak 2–3 days: 🌱 **Young Sprout** (Stage 2)
  * Streak 4–6 days: 🌿 **Budding Stem** (Stage 3)
  * Streak 7–13 days: 🌸 **Glowing Bloom** (Stage 4)
  * Streak 14+ days: 🪷 **Radiant Lotus Phoenix** (Stage 5 Ascended)
* **🏆 Official Weekly Certificate**:
  * Unlocked upon reaching a full 7-day streak.
  * Displays an authentic gold-bordered certificate of mastery featuring the user's name, award date, and a **Print / Save as PDF** button (`window.print()`).

---

## 🛠️ Tech Stack & Architecture

* **Frontend**: Vanilla HTML5, CSS3 Glassmorphism, JavaScript ES6+ (No bulky framework dependencies; blazing fast load times).
* **Backend**: Node.js & Express (`server.js`).
* **Database**: Native Node.js SQLite (`node:sqlite` via `DatabaseSync`) stored in `habitism.db` (zero external C++ compiler or native build tool requirements).
* **API Integration**: Facebook Graph API v19.0.
* **Dual-Mode Reliability**: The frontend communicates seamlessly with the Express server while retaining offline `localStorage` fallbacks if run statically.

---

## 🚀 Getting Started Locally

### Prerequisites
* Node.js v20+ or v22+ (v24 recommended).

### 1. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 2. Start the Server
```bash
npm start
```
The application will launch at:
```
http://localhost:3000
```
Open your browser and navigate to `http://localhost:3000` to start using Habitism!

---

## ☁️ Deployment Instructions

### Option 1: Render.com (Recommended for Full-Stack)
1. Fork or push this repository to GitHub.
2. In Render Dashboard, click **New +** → **Blueprint** or **Web Service**.
3. Select your repository.
4. Render will detect `render.yaml` automatically:
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Under **Environment Variables**, add:
   - `FB_PAGE_ID` = `1496888330165860`
   - `FB_ACCESS_TOKEN` = `your_token_here`
6. Click **Deploy**. Your app is live with persistent backend!

### Option 2: Vercel
1. Install Vercel CLI (`npm i -g vercel`) or import your repo in the Vercel Dashboard.
2. The included `vercel.json` automatically maps API routes to `server.js` and serves static frontend assets.
3. Add environment variables in Vercel project settings if needed.

### Option 3: Netlify / Static Hosting
* Simply deploy the root directory (`index.html`, `login.html`, `rules.html`, `dashboard.html`, `app.css`, `app.js`, `style.css`).
* The client has built-in offline simulation mode for authentication, storage, shop, and streak calculation.

---

## 📁 Project Structure

```
HABITISM/
├── index.html           # Landing / Welcome Page
├── login.html           # Login & Registration Page (with blooming flower)
├── rules.html           # Commitment Contract & Facebook Rules Page
├── dashboard.html       # Side-by-side Habit Tracker Dashboard
├── dashboard.css        # Dashboard styling (Above the fold & side-by-side)
├── dashboard.js         # Dashboard interactivity, levels & calendar
├── app.css              # Glassmorphic shared styling, modals & badges
├── app.js               # Client session, auth, shop, and Graph API helpers
├── server.js            # Express backend & Facebook Graph API engine
├── package.json         # Project metadata and dependencies
├── .env.example         # Environment template
├── .gitignore           # Ignored files (node_modules, db, etc.)
├── render.yaml          # Render deployment blueprint
├── vercel.json          # Vercel deployment configuration
└── README.md            # Comprehensive documentation
```

---

## 🔒 Facebook Credentials Reference
* **Page Name:** `Habitism`
* **Page ID:** `1496888330165860`
* **Accountability Failure Post Message:**  
  *"This person made this commitment but did not complete it."*

