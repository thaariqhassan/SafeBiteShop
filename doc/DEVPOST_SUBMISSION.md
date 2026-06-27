# SafeBite — Devpost Submission

> **Scan Smart. Eat Safe. Live Well.**
> The AI health companion for your grocery cart — for every product, every menu, and every member of your family, even without a barcode.

**Hackathon:** HACKHAZARDS '26 · **Track:** Expo (Build Mobile Apps With Expo) · **Theme:** 🏥 HealthTech & Bio Platforms
**Team — Code Blooded:** Ajay Krishna D · Abhay Murali M · Thaariq Hassan R

---

## 🧩 Inspiration

Every day, people make dozens of food decisions blind. A person on **warfarin** has no idea the "healthy" spinach smoothie can blunt their medication. Someone with a **nut allergy** can't read a 30-ingredient label fast enough at a noisy supermarket. A **diabetic parent** shopping for a whole family has to mentally juggle four different sets of restrictions. And when a product gets **recalled** for undeclared peanuts a week after you bought it, you simply never find out.

Per the WHO, anaphylaxis-related deaths are rising, and food–drug interactions send people to hospital every day. The information needed to stay safe *exists* — it's just locked in dense labels, scattered databases, and recall notices nobody reads.

We built **SafeBite** to put clinical-grade food safety in everyone's pocket: scan, and instantly know if a food is safe **for you** — your allergies, your conditions, your medications, your family.

## 🚀 What it does

SafeBite turns your phone into a personalized food-safety scanner.

**Three ways to scan**
- **Barcode / QR** — full product info + an AI safety verdict personalized to your profile.
- **📸 Snap the Label** — no barcode (or not in any database)? Photograph the ingredients list and a vision model reads it, then runs the same safety pipeline. Works for *any* packaged food.
- **🍽️ Eat-Out Menu Scanner** — photograph a restaurant menu and every dish is rated **Safe / Caution / Avoid** for your profile, worst-first.

**Personalized safety**
- **💊 Medication × Food interaction alerts** — detects dangerous combos (warfarin + leafy greens, statins + grapefruit…) with prominent warnings, re-checked deterministically on-device, not just by the model.
- **⚠️ Deterministic allergen matching** — a synonym map so a "Nuts" allergy is flagged by "almond"/"peanut", not only the literal word.
- **👨‍👩‍👧 Family profiles** — one account, multiple health profiles; switch the active profile with one tap and every flow adapts.

**Proactive protection**
- **🔔 Recall alerts** — SafeBite remembers what you've scanned and cross-checks it against the live **openFDA recall feed**. If one of your products is recalled, you get a **push notification** — even with the app closed — escalated to "do not eat" when the recall reason matches your allergies.

**Your AI companion**
- **🤖 Sage** — a conversational health assistant (Gemini) grounded in your profile *and* your recent scans. Ask *"Can I eat this with my warfarin?"* or *"What should I avoid today?"* and get a personal, not generic, answer.

**Eat better & stay motivated**
- Recipe suggestions, a 7-day meal planner, healthier product swaps, a daily health score, a safe-eating streak, and a nutrition diary whose limits auto-tighten for your conditions.

**Accessibility**
- **🔊 Read-aloud verdict** — opt in, and SafeBite reads the full safety verdict aloud (and Sage's answers), for low-vision, elderly, or hands-busy users.

**For shopkeepers**
- Inventory management with stock/expiry insights, secured per-shopkeeper with row-level security.

## 🛠️ How we built it

- **Frontend:** React Native (Expo 54), TypeScript, expo-router, NativeWind, Reanimated.
- **Capture & accessibility:** expo-camera, expo-image-picker, expo-image-manipulator, expo-notifications (recall push), expo-speech (read-aloud).
- **Backend:** Node.js + Express on Render (with a keep-alive ping for the free tier).
- **AI — text & vision:** Groq (`llama-3.1-8b-instant`, `llama-3.3-70b-versatile`, `llama-4-scout` vision) for summaries, recipes, recommendations, and label/menu reading.
- **AI — Sage:** Google Gemini (`gemini-2.5-flash`), grounded with the active profile + a digest of recent scans.
- **Data:** Supabase (Postgres + Auth + RLS), Open Food Facts (products), openFDA (recalls), AsyncStorage (offline cache, active profile, streak, preferences).
- **Build:** EAS.

**Architecture choices that mattered**
- **Defense in depth** — every AI safety claim is backed by a deterministic on-device rule check (allergen synonym map, medication interaction table), so we never rely on the model alone for a health-critical verdict.
- **Profile-hash caching** — avoids re-running AI for the same health profile, keeping the free tiers fast.
- **Offline-first** — the last 50 scans + their summaries are cached, so the app still works with no signal.

## 🧗 Challenges we ran into

- **Trusting an LLM with health decisions.** Models hallucinate; a wrong "safe" verdict could hurt someone. We solved it by layering deterministic rule checks under every AI summary so allergens and medication interactions are caught even if the model misses them.
- **Products with no barcode.** Local and loose foods aren't in any database. We added a vision pipeline that reads the physical label, so coverage isn't limited to what's catalogued.
- **Recalls without a real recall.** Demoing proactive alerts is hard when no live recall happens to match. We built the real openFDA matcher *and* a deterministic demo trigger so the flow is reliable on stage.
- **Expo Go vs native modules.** `expo-notifications` push was removed from Expo Go in SDK 53 and crashed the app on import; we guarded it to no-op in Expo Go and work fully in a dev/standalone build.
- **Free-tier everything.** Render cold starts, Groq/Gemini rate limits, Supabase RLS — we engineered around all of them (keep-alive ping, caching, careful auth scoping).

## 🏆 Accomplishments we're proud of

- A food scanner that checks against **medications and conditions**, not just calories — and **works even without a barcode**.
- **Proactive** safety: SafeBite protects you *after* you've scanned, not just in the moment.
- A genuinely **personal** AI companion in Sage, grounded in real user data.
- Thoughtful **accessibility** and a clean, modern UI — production-grade, not a prototype.

## 📚 What we learned

- For health tech, **deterministic guardrails + LLMs** beats either alone.
- Shipping on Expo taught us the real boundaries between Expo Go and dev builds, and how to design features that degrade gracefully.
- Grounding an assistant in the user's *own* data (profile + scans) is what makes it feel useful instead of generic.

## 🔭 What's next

- A customer-facing "safe for me" shop view that connects the shopkeeper inventory to consumers.
- Wearable / Health Connect integration for real-time, context-aware safety (e.g. glucose-aware snack warnings).
- Expanded recall sources beyond openFDA for global coverage.

## 🧰 Built with

`react-native` · `expo` · `typescript` · `expo-router` · `nativewind` · `expo-camera` · `expo-notifications` · `expo-speech` · `node.js` · `express` · `groq` · `google-gemini` · `supabase` · `postgresql` · `open-food-facts` · `openfda` · `render` · `eas`

---

## 🔗 Links

- **GitHub:** https://github.com/Ajay-Krishna00/SafeBite
- **Demo video:** _add link_
- **APK / build:** _add link_
