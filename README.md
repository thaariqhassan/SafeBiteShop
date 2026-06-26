# 🥗 SafeBite

> **Scan Smart. Eat Safe. Live Well.**

SafeBite is a mobile-first HealthTech application built with React Native. Scan any packaged food barcode to get an AI-powered safety analysis personalised to your medical profile — covering allergies, chronic conditions, medications, and your whole family.

---

## 💡 Problem Statement

In today's fast-paced world, ensuring food safety is challenging for both **consumers** and **shopkeepers**:

- Consumers with **allergies**, **diabetes**, **heart disease**, or other conditions often lack the means to verify whether a food item is safe for them.
- People on **medication** are unaware of dangerous food-drug interactions hiding in everyday products.
- Families have no easy way to check food safety across **multiple health profiles** in a single scan.
- Shopkeepers frequently overlook **expiry management**, causing waste and posing health risks.

> According to WHO, anaphylaxis-related deaths are on the rise — from 0.51 to 0.76 per million annually. SafeBite puts clinical-grade food safety in everyone's hands.

---

## 🎯 Approach & Solution

SafeBite solves this multi-sided problem with a single scan.

### 🔹 For Consumers

- 📷 **Instant Barcode & QR Scanning** — Retrieve full product information in seconds.
- 🧠 **AI-Powered Ingredient Analysis** — Personalised safety summary based on your allergies, medical conditions, dietary preferences, and medications.
- 💊 **Medication × Food Interaction Alerts** — Detects dangerous food-drug combinations (e.g. Warfarin + leafy greens, Statins + grapefruit) and shows a prominent warning instantly.
- 👨‍👩‍👧 **Family Profile Switching** — One account, multiple health profiles. Scan once and see risk indicators for each family member.
- 📊 **Nutrition Progress Tracker** — Logs your daily intake (calories, sugar, fat, salt, protein) against personalised limits that tighten automatically for your conditions.
- 📦 **Offline Scan Cache** — Previously scanned products and their AI summaries are cached locally. Works in stores with no signal.
- 🧾 **Smart Recommendations** — AI suggests safer food alternatives based on your full health profile.

### 🔹 For Shopkeepers

- Track product expiry using barcodes.
- Get alerts before expiry to reduce wastage.
- View customer trends for smarter restocking.

---

## ✨ Features

### 📱 Mobile App

| Feature | Description |
|---------|-------------|
| **QR / Barcode Scanner** | Supports EAN13, EAN8, QR, Code128, UPC-A/E and more |
| **Health Profile Onboarding** | Allergies, 11 medical conditions, 14 dietary restrictions, 14 common medications |
| **Medication Interaction Alerts** | Rule-based instant detection + AI-enhanced summary for 14 medication classes |
| **Family Profiles** | Add unlimited family members, switch active profile with one tap |
| **Nutrition Tracker** | Daily progress bars, condition-aware limits, pull-to-refresh food diary |
| **Offline Cache** | Last 50 scanned products cached in AsyncStorage with full AI summaries |
| **AI Product Summary** | Groq LLM analysis — "Overview from your data" + "General Overview" |
| **Smart Recommendations** | AI-filtered products from 5000+ Open Food Facts entries |
| **Allergen & Additive Display** | Full ingredients, allergens, additives, NOVA score, Nutri-Score |
| **Expiry Date Display** | Shows expiry date from product data |

### 📊 Shopkeeper Dashboard *(Web coming soon)*

- Scan at billing → auto-saves product to inventory.
- Track most/least selling items.
- Get insights into inventory and expiry trends.

---

## 🧠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Mobile Frontend** | React Native (Expo 54), TypeScript, expo-router |
| **Styling** | NativeWind (Tailwind CSS), React Native Reanimated |
| **Backend** | Node.js + Express.js (deployed on Render) |
| **AI** | Groq API — llama-3.1-8b-instant & llama3-70b-8192 |
| **Database & Auth** | Supabase (PostgreSQL + Auth) |
| **Local Storage** | AsyncStorage — offline cache & active profile |
| **Product Data** | Open Food Facts API (3M+ products) |
| **Build** | EAS (Expo Application Services) |

---

## 🗄️ Database Schema

Six Supabase tables power the app:

| Table | Purpose |
|-------|---------|
| `Users` | Account info, shopkeeper flag |
| `Customerdetails` | Health profile — allergies, conditions, medications, dietary |
| `Shopkeepers` | Business details for shopkeeper accounts |
| `recommended_products` | SHA-256 keyed cache for AI recommendations |
| `nutrition_logs` | Daily food diary entries per user |
| `family_members` | Additional health profiles per account |

---

## 🧪 Methodologies

1. **Barcode-Based Ingredient Parsing** via Open Food Facts API
2. **Rule-Based Health Matching** — 11 conditions, 14 allergens, 14 medication-food interaction pairs
3. **LLM-Powered Personalised Summaries** using Groq (fast inference)
4. **Profile-Hash Caching** — avoids re-running AI for the same health profile
5. **Offline-First Caching** — AsyncStorage fallback for zero-connectivity environments
6. **Family Profile Architecture** — active profile persisted in AsyncStorage, affects all AI flows
7. **Condition-Aware Nutrition Limits** — daily thresholds auto-tighten based on medical conditions

---

## 🖼️ Screenshots

| Home | Scan Result | Profile | Shop Interface |
|------|-------------|---------|----------------|
| ![](/assets/images/p4.jpg) | ![](/assets/images/p2.jpg) | ![](/assets/images/p5.jpg) | ![](/assets/images/p7.jpg) |

---

## 📁 Project Structure

```
SafeBite/
├── app/
│   ├── _layout.tsx              # Root stack navigator
│   ├── index.tsx                # Splash / auth check
│   ├── family.tsx               # Family profiles management
│   ├── (auth)/
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   └── onboarding.tsx       # Health profile setup (incl. medications)
│   ├── (tabs)/
│   │   ├── home.tsx             # Scan entry + recommendations + profile pill
│   │   ├── tracker.tsx          # Nutrition progress tracker + food diary
│   │   └── profile.tsx          # User profile + family profile link
│   ├── product/
│   │   └── [id].tsx             # Product detail — AI summary, med warnings, log button
│   ├── scan/
│   │   └── index.tsx            # Barcode / QR scanner
│   └── services/
│       ├── summary.ts           # AI summary service (profile-aware)
│       ├── recommendation.ts    # Recommendation service (profile-aware)
│       ├── familyProfile.ts     # Family member CRUD + active profile (AsyncStorage)
│       ├── nutritionLog.ts      # Food diary Supabase CRUD
│       └── scanCache.ts         # Offline product cache (AsyncStorage, 50 entries)
├── backend/
│   ├── server.js
│   ├── routes/
│   │   ├── summary.js           # POST /api/summary
│   │   └── recommendation.js    # POST /api/recommendation
│   ├── controller/
│   │   └── aiController.js      # Groq LLM — askAI, consultAi
│   └── utils/
│       ├── hashProfile.js
│       └── scraper.js
├── constants/
│   ├── const.ts                 # Allergies, conditions, dietary, medications lists
│   ├── medicationInteractions.ts # 14 medication-food interaction rules
│   └── nutritionLimits.ts       # Daily limits + condition-specific overrides
├── components/
│   └── recomentation.tsx        # Horizontal product recommendation carousel
└── lib/
    ├── supabase.ts
    ├── auth.ts
    └── actions.ts
```

---

## 📦 How to Run Locally

### 1. Clone the repo

```bash
git clone https://github.com/Ajay-Krishna00/SafeBite
cd SafeBite
```

### 2. Set up environment variables

Create `/.env` (frontend):
```
EXPO_PUBLIC_PROJECT_URL=https://your-project.supabase.co
EXPO_PUBLIC_PUBLIC_ANON_KEY=your-anon-key
```

Create `/backend/.env`:
```
PORT=3000
EXPO_PUBLIC_PROJECT_URL=https://your-project.supabase.co
EXPO_PUBLIC_PUBLIC_ANON_KEY=your-anon-key
GROQ_API_KEY3=your-groq-key
```

### 3. Start the mobile app

```bash
npm install
npx expo start
```

### 4. Start the backend

```bash
cd backend
npm install
node server.js
```

Or deploy the backend to Render and update the API URL in `app/services/summary.ts` and `app/services/recommendation.ts`.

---

## 🎯 Target Users

- Individuals with chronic conditions or allergies
- People on long-term medication
- Parents managing food safety for their children
- Health-conscious consumers
- Families wanting a single shared food safety tool
- Shopkeepers wanting smarter stock control

---

## 🌍 Market Opportunity

- 🚨 Rising food-related illnesses and medication side effects
- 📱 Growing demand for food transparency and labelling
- 👨‍👩‍👦 Families needing multi-profile health management
- 🔁 Need for sustainable grocery usage
- 🛒 Local sellers improving digital literacy

---

## 🔒 Security & Privacy

- Authentication powered by Supabase (JWT-based, secure token refresh)
- Health profiles and medication data stored per-user with auth-scoped access
- Active family profile stored only in device-local AsyncStorage — never synced

---

## 📈 Roadmap

- ✅ Medication × Food Interaction Alerts
- ✅ Nutrition Progress Tracker & Food Diary
- ✅ Family Profile Switching
- ✅ Offline Scan Cache
- 🔜 Shopkeeper Inventory Web Portal
- 🔜 Allergen Recall & Push Notifications
- 🔜 AI Chat — ask questions about a scanned product
- 🔜 Apple Health / Google Fit integration
- 🔜 GDPR-compliant data export

---

## 👥 Team — Code Blooded

- Ajay Krishna D
- Abhay Murali M
- Thaariq Hassan R

---

## 🧾 License

MIT License — free for personal and educational use.

---

> **"Health isn't just about what you eat — it's about knowing what you're about to eat. SafeBite gives you that power, for every product, for every member of your family, even without internet."**

If you like this project, ⭐️ star it and share it with health-conscious friends!
