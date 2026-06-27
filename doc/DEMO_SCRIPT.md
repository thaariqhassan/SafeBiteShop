# SafeBite — Demo / Video Script

A tight **~3-minute** walkthrough built around the strongest "wow" moments. Order is deliberate: lead with the differentiators (medication interaction, vision, proactive recall, Sage), not the login screen.

---

## ✅ Pre-demo checklist

- [ ] Run on a **dev build or installed APK** (not Expo Go) so push notifications fire.
- [ ] Backend deployed with **`GEMINI_API_KEY`** set on Render (so Sage answers).
- [ ] Logged in with a profile that has a **medication** (e.g. *Warfarin*) and an **allergy** (e.g. *Peanuts*) — this drives the best moments.
- [ ] Have ready: a product with a relevant ingredient, a **physical label** to photograph, and a **menu** (printed or on another screen).
- [ ] Scan **one product first** before recording, so the recall demo has something to match and "Recently Scanned" isn't empty.
- [ ] **Read-aloud OFF** to start (turn it on only for the accessibility beat, then off again).
- [ ] Phone on Do-Not-Disturb except SafeBite; good lighting for the camera scans.

---

## 🎬 Script

### 0:00 – 0:20 · Hook
> "Most food scanners tell you calories. **SafeBite tells you if a food is safe for *your* body** — your allergies, your conditions, your medications — and it works even when there's no barcode at all."

Show the Home screen — the scan toggle, recently scanned, the **Ask Sage** button.

### 0:20 – 0:50 · The killer feature: medication × food
- Scan a product (barcode).
- Land on the redesigned product page; let the **AI Safety Summary** appear.
- Point to the red **💊 Medication interaction** card.
> "I'm on warfarin. SafeBite caught that this product's vitamin K can interfere with my medication — and this check runs **on-device**, not just from the AI, so it can't be hallucinated away."

### 0:50 – 1:20 · No barcode? Snap the label
- Back to Home → switch to label scan → photograph a real ingredients label.
> "No barcode, or not in any database? I just photograph the label — a vision model reads the ingredients and runs the exact same safety check. That's coverage no barcode database can give you."
- Show the verdict + (if relevant) an allergen flag.

### 1:20 – 1:45 · Eating out: menu scanner
- Home → menu mode → photograph a menu.
> "Eating out is the scariest scenario. I photograph the menu and every dish is rated **Safe, Caution, or Avoid** for me — worst first."
- Scroll the rated dishes.

### 1:45 – 2:15 · The "wow": proactive recall alert
- Open **Profile → Safety Alerts → Simulate a recall**, then put the phone down for a beat.
- A **push notification** slides in. Open Home → the red recall banner.
> "SafeBite keeps protecting me *after* I've scanned. It watches the official FDA recall feed, and because it knows I'm allergic to peanuts, this alert says **do not eat** — for a product already in my kitchen."

### 2:15 – 2:45 · Meet Sage
- Tap **Ask Sage** → ask: *"Can I eat peanut butter with my medication?"*
> "And Sage, our AI companion, is grounded in my actual profile and recent scans — so the answer is personal, not a generic chatbot reply."
- (Optional accessibility beat: turn on Read-aloud in Profile, reopen a product, let it **speak the verdict**.) "Fully accessible for low-vision and elderly users, too."

### 2:45 – 3:00 · Close
> "SafeBite — for every product, every menu, every member of your family, even without a barcode. **Scan smart. Eat safe. Live well.**"

Show the family-profile switch as a final flourish.

---

## 🎯 If you only have 60 seconds
1. Medication interaction on a scan (0:00–0:20)
2. Snap-the-label vision scan (0:20–0:35)
3. Simulated recall push notification (0:35–0:50)
4. One Sage question (0:50–1:00)

---

## 🛟 Backup plans (don't get caught live)
- **Sage doesn't respond** → backend not deployed with the key. Have a pre-recorded clip of a Sage answer.
- **Recall push doesn't fire** → you're in Expo Go. Use a dev build/APK; the in-app red banner still appears as a fallback.
- **Camera/vision is slow or misreads** → pre-scan the label/menu before recording and show the result screen; mention it's live but keep momentum.
- **Render cold start** → open the app ~30s before recording so the keep-alive warms the backend.

---

## 🗣️ One-line pitch (for the elevator / submission blurb)
> "SafeBite is the AI health companion for your grocery cart: scan any product, label, or menu and instantly know if it's safe for your allergies, conditions, and medications — for your whole family, even without a barcode."
