# 🥗 SafeBite

> **Scan Smart. Eat Safe. Live Well.**

SafeBite is a mobile-first HealthTech app built with React Native. Scan a barcode, **snap an ingredients label with no barcode at all**, or **photograph a restaurant menu** — and get an AI-powered safety analysis personalised to your medical profile: allergies, chronic conditions, medications, and your whole family.

What makes SafeBite different: it checks food against your **medications and conditions**, not just calories — and it works even when a product isn't in any barcode database.

---

## 💡 Problem Statement

Ensuring food safety is hard for both **consumers** and **shopkeepers**:

- People with **allergies**, **diabetes**, **heart disease** or other conditions can't easily verify whether a food is safe for them.
- People on **medication** are unaware of dangerous food–drug interactions hiding in everyday products.
- Most barcode scanners hit a dead end when a product **isn't in the database** — common for local, loose, or small-brand foods.
- **Eating out** is the scariest scenario for allergy/medication users, with no easy way to vet a menu.
- Families have no way to check safety across **multiple health profiles** in one scan.
- Shopkeepers overlook **stock and expiry management**, causing waste and risk.

> Per WHO, anaphylaxis-related deaths are rising. SafeBite puts clinical-grade food safety in everyone's hands.

---

## ✨ Features

### 🔍 Three ways to scan

| Feature | Description |
|---------|-------------|
| **Barcode / QR Scan** | EAN13, EAN8, QR, Code128, UPC-A/E and more → full product info + AI safety verdict |
| **📸 Snap the Label** | No barcode (or not in the database)? Photograph the **ingredients list** — a vision model reads it and runs the same safety pipeline. Works for *any* packaged food |
| **🍽️ Eat-Out Menu Scanner** | Photograph a restaurant menu — every dish is rated **Safe / Caution / Avoid** for your profile, sorted worst-first |

### 🛡️ Personalised safety

- 🧠 **AI Ingredient Analysis** — a personalised summary based on your allergies, conditions, diet and medications.
- 💊 **Medication × Food Interaction Alerts** — detects dangerous combos (Warfarin + leafy greens, Statins + grapefruit, …) with prominent warnings. Re-checked deterministically on-device, not just by the model.
- ⚠️ **Deterministic Allergen Matching** — a synonym map so a "Nuts" allergy is flagged by "almond"/"peanut", not only the literal word.
- 👨‍👩‍👧 **Family Profiles** — one account, multiple health profiles; switch the active profile with one tap and every AI flow adapts.

### 🔔 Proactive recall alerts

SafeBite doesn't stop protecting you when you close the app. It remembers every product you've scanned and cross-checks them against the live **openFDA food recall feed**. If a product you've scanned gets recalled, you get a **push notification** — even with the app closed — and a red alert banner on Home.

- 📡 **Live recall monitoring** — matches your scanned products against official recall data on every app open.
- 🎯 **Profile-aware severity** — if the recall reason (e.g. *"undeclared peanuts"*) matches the active profile's allergies, the alert is escalated with a **"do not eat"** warning tied to that person.
- 🛌 **Works in the background** — be warned about food already in your kitchen before you eat it.

### 🤖 Sage — AI Health Co-pilot

**Sage** is a conversational assistant (powered by **Google Gemini**) you can ask anything — *"Can I eat this with my warfarin?"*, *"What should I avoid today?"*, *"Suggest a safe snack."* It's grounded in your **active health profile** (allergies, conditions, medications, diet) **and your recently scanned products**, so every answer is personal — not generic. Reachable from the **Ask Sage** button on Home.

### ♿ Accessibility

- 🔊 **Read-aloud verdict** — enable it from **Profile → Accessibility**, and a **Listen** button appears on every product to read the whole safety verdict aloud (name → allergens → medication interactions → AI summary), so low-vision, elderly, or hands-busy users can *hear* whether a food is safe. The co-pilot's answers can be read aloud too.

### 🍳 Eat better

- **Recipe Suggestions** — enter the ingredients you have → health-safe recipes that respect your allergies, diet, conditions and medications.
- **7-Day Meal Planner** — a profile-safe weekly plan plus an auto shopping list.
- **Healthier Swaps** — scan a poorly-rated product and get safer, better-rated alternatives from a 5,000-product database.
- **Smart Recommendations** — AI-filtered products matched to your full health profile.

### 📊 Track & stay motivated

- **Daily Health Score** — a 0–100 score from today's logged food vs. your condition-adjusted limits.
- **Safe-Eating Streak** — consecutive qualifying days, to build the habit.
- **Nutrition Tracker & Food Diary** — calories, sugar, fat, salt, protein vs. personalised limits that auto-tighten for your conditions.

### 🏠 Home & convenience

- **Recently Scanned** carousel — reopen recent products instantly (offline-friendly).
- **Personalised Daily Tip** — rotates based on your medications/conditions/allergies.
- **Offline Scan Cache** — last 50 products + AI summaries cached locally; works with no signal.

### 👤 Account & settings

- **Edit Health Profile** — update allergies, conditions, diet, medications, age & severity anytime.
- **Change Password** (Supabase auth), **Privacy Policy**, **Share SafeBite**, and **☕ Support us**.

### 🏪 For shopkeepers

- **Inventory Management** — add / edit / delete products (name, price, stock, rating, expiry, image), stored per-shopkeeper in Supabase with row-level security.
- **Insights Dashboard** — live stats (total / out-of-stock / expiring-soon), search, and colour-coded stock & expiry badges.

---

## 🧠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Mobile Frontend** | React Native (Expo 54), TypeScript, expo-router |
| **Styling** | NativeWind (Tailwind CSS), React Native Reanimated |
| **Camera & Imaging** | expo-camera, expo-image-picker, expo-image-manipulator |
| **Notifications** | expo-notifications (local push for recall alerts) |
| **Accessibility** | expo-speech (read-aloud safety verdict) |
| **Backend** | Node.js + Express.js (deployed on Render, with keep-alive ping) |
| **AI — Text** | Groq: `llama-3.1-8b-instant` (summaries), `llama-3.3-70b-versatile` (recommendations, recipes, meal plans) |
| **AI — Vision** | Groq: `meta-llama/llama-4-scout-17b-16e-instruct` (label & menu reading) |
| **AI — Co-pilot** | Google Gemini (`gemini-2.5-flash`) — conversational health assistant |
| **Database & Auth** | Supabase (PostgreSQL + Auth, row-level security) |
| **Local Storage** | AsyncStorage — offline cache, active profile, streak, reco cache |
| **Product Data** | Open Food Facts API |
| **Recall Data** | openFDA Food Enforcement API |
| **Build** | EAS (Expo Application Services) |

---

## 🗄️ Database Schema

Supabase tables that power the app:

| Table | Purpose |
|-------|---------|
| `Users` | Account info, shopkeeper flag |
| `Customerdetails` | Health profile — allergies, conditions, medications, dietary |
| `Shopkeepers` | Business details for shopkeeper accounts |
| `family_members` | Additional health profiles per account |
| `nutrition_logs` | Daily food diary entries per user |
| `recommended_products` | Profile-hash keyed cache for AI recommendations |
| `shop_products` | Per-shopkeeper inventory (RLS-scoped) — see `supabase/shop_products.sql` |

---

## 🧪 How it works

1. **Three capture modes** — barcode (Open Food Facts), label photo (vision OCR), menu photo (vision).
2. **Vision pipeline** — photos are downscaled on-device, then a Groq vision model extracts ingredients (label) or rates dishes (menu); the heavy lifting runs on Groq, so the free-tier backend only proxies.
3. **Rule + LLM safety** — deterministic allergen/medication matching layered with LLM summaries (defence in depth).
4. **Profile-hash caching** — avoids re-running AI for the same health profile.
5. **Condition-aware limits** — daily nutrition thresholds tighten automatically per condition, feeding the tracker and health score.
6. **Family architecture** — the active profile is persisted in AsyncStorage and drives every AI flow.
7. **Offline-first** — scans, recommendations and tips fall back to local cache.
8. **Recall monitoring** — on each app open, scanned products are matched against the openFDA recall feed; a match fires a local push and a Home banner, escalated when the recall reason hits the active profile's allergies.

---

## 📁 Project Structure

```
SafeBite/
├── app/
│   ├── _layout.tsx              # Root stack navigator
│   ├── index.tsx                # Splash / auth check
│   ├── family.tsx               # Family profiles management
│   ├── edit-health.tsx          # Edit health profile
│   ├── privacy.tsx              # Privacy policy
│   ├── label-scan.tsx           # 📸 Snap-the-label (vision)
│   ├── menu-scan.tsx            # 🍽️ Eat-out menu scanner (vision)
│   ├── copilot.tsx             # 🤖 Sage — AI Health Co-pilot chat (Gemini)
│   ├── shop_interface.tsx       # Shopkeeper inventory (CRUD)
│   ├── (auth)/                  # login, signup, onboarding
│   ├── (tabs)/
│   │   ├── home.tsx             # Scan toggle, recommendations, recently scanned, tip
│   │   ├── tracker.tsx          # Health score, streak, nutrition tracker, food diary
│   │   ├── recipes.tsx          # Recipe suggestions + meal planner
│   │   └── profile.tsx          # Settings: account, support, about, health profile
│   ├── product/[id].tsx         # Product detail — AI summary, med warnings, swaps, log
│   └── scan/index.tsx           # Barcode / QR scanner
├── services/                    # All client services (profile-aware)
│   ├── summary.ts  recommendation.ts  familyProfile.ts  nutritionLog.ts
│   ├── scanCache.ts  recipes.ts  alternatives.ts  healthScore.ts
│   ├── healthTip.ts  labelScan.ts  menuScan.ts  shopProducts.ts
│   ├── recall.ts                # recall matching against openFDA + scanned products
│   ├── notifications.ts         # local push notifications (expo-notifications)
│   ├── copilot.ts               # AI co-pilot client (sends profile + scans to Gemini)
│   ├── speech.ts                # read-aloud verdict (expo-speech)
├── backend/
│   ├── server.js
│   ├── routes/                  # summary, recommendation, recipes,
│   │                            # alternatives, scanLabel, scanMenu, copilot
│   ├── controller/copilotController.js  # Gemini chat co-pilot (consultCopilot)
│   ├── controller/aiController.js  # Groq text + vision (askAI, consultAi,
│   │                                # generateRecipes, generateMealPlan,
│   │                                # analyzeLabelImage, analyzeMenuImage)
│   └── utils/                   # hashProfile, scraper
├── constants/                   # const, medicationInteractions,
│   │                            # nutritionLimits, allergenKeywords
├── components/                  # recomentation, RecipeCard
├── supabase/shop_products.sql   # Shopkeeper inventory table + RLS
└── lib/                         # supabase, auth, actions
```

---

## 🔌 Backend API

| Endpoint | Purpose |
|----------|---------|
| `GET  /health` | Health check / keep-alive |
| `POST /api/summary` | AI product safety summary |
| `POST /api/recommendation` | Profile-matched product recommendations |
| `POST /api/recipes` | Health-safe recipes from ingredients |
| `POST /api/recipes/mealplan` | 7-day profile-safe meal plan + shopping list |
| `POST /api/alternatives` | Healthier, profile-safe product swaps |
| `POST /api/scan-label` | Vision: read an ingredients label into product data |
| `POST /api/scan-menu` | Vision: rate menu dishes for the profile |
| `POST /api/copilot` | Conversational health co-pilot (Gemini), grounded in profile + recent scans |

---

## 📦 Run Locally

```bash
git clone https://github.com/Ajay-Krishna00/SafeBite
cd SafeBite
```

**Frontend `.env`:**
```
EXPO_PUBLIC_PROJECT_URL=https://your-project.supabase.co
EXPO_PUBLIC_PUBLIC_ANON_KEY=your-anon-key
```

**`backend/.env`:**
```
PORT=3000
EXPO_PUBLIC_PROJECT_URL=https://your-project.supabase.co
EXPO_PUBLIC_PUBLIC_ANON_KEY=your-anon-key
GROQ_API_KEY3=your-groq-key
GEMINI_API_KEY=your-gemini-key
```

> The co-pilot uses `GEMINI_API_KEY` (Google AI Studio). Optionally override the model with `GEMINI_MODEL` (defaults to `gemini-2.5-flash`).

**Start the app & backend:**
```bash
npm install
npx expo start

cd backend && npm install && node server.js
```

Run `supabase/shop_products.sql` once in the Supabase SQL editor to enable shopkeeper inventory. The deployed backend base URL is configured in the client `services/`.

---

## 🔒 Security & Privacy

- Supabase JWT auth with secure token refresh.
- Health data stored per-user with auth-scoped access; shopkeeper inventory protected by row-level security.
- Active family profile and streak stored only in device-local AsyncStorage.
- Vision requests send only the photo + non-identifying health constraints; nothing is sold. See the in-app Privacy Policy.

---

## 📈 Roadmap

- ✅ Medication × Food Interaction Alerts
- ✅ Nutrition Tracker, Health Score & Streak
- ✅ Family Profile Switching
- ✅ Offline Scan Cache
- ✅ Recipe Suggestions & 7-Day Meal Planner
- ✅ Healthier Product Swaps
- ✅ Snap-the-Label (vision scanning, no barcode needed)
- ✅ Eat-Out Menu Scanner
- ✅ Shopkeeper Inventory Management
- ✅ Allergen Recall & Push Notifications
- ✅ Sage — AI Health Co-pilot (conversational, Gemini-powered)
- ✅ Read-aloud / accessibility verdict
- 🔜 Customer-facing "safe for me" shop view

---

## ☕ Support

If SafeBite helps you, consider supporting development:
**[buymeacoffee.com/ajaykrishnad](https://www.buymeacoffee.com/ajaykrishnad)**

---

## 👥 Team — Code Blooded

- Ajay Krishna D
- Abhay Murali M
- Thaariq Hassan R

---

## 🧾 License

MIT License — free for personal and educational use.

---

> **"Health isn't just about what you eat — it's about knowing what you're about to eat. SafeBite gives you that power: for every product, every menu, every member of your family — even without a barcode."**

If you like this project, ⭐️ star it and share it with health-conscious friends!
