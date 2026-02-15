# FIPU Train The Robot Vision

Mobile-first promotional browser game for the Faculty of Informatics in Pula.

Stack:
- Vue 3 + Vite
- Tailwind CSS 4
- Firebase Realtime Database
- Firebase Hosting
- Optional Firebase Cloud Functions score submission

## Game Loop

1. Player starts from QR link.
2. An image flash appears (cat, car, tree, etc.).
3. Player taps the correct label before the timer expires.
4. Over 18 fast rounds, correct taps increase model accuracy.
5. Final line: `Your data trained the AI to X%. Imagine building real AI here.`
6. Accuracy score is stored in leaderboard.

## Local Development

1. Install dependencies:
```bash
npm install
```
2. Copy env template and fill Firebase values:
```bash
cp .env.template .env
```
3. Start app:
```bash
npm run dev
```

## Firebase Setup

1. Create Firebase project and enable Realtime Database.
2. Put your project ID in `/Users/lukablaskovic/Github/fipu-game/.firebaserc`.
3. Fill all `VITE_FIREBASE_*` values in `/Users/lukablaskovic/Github/fipu-game/.env`.
4. Deploy database rules:
```bash
firebase deploy --only database
```

## Optional Cloud Function (score submit)

1. Install function dependencies:
```bash
cd functions && npm install && cd ..
```
2. Deploy function:
```bash
firebase deploy --only functions
```
3. Enable callable submit from frontend by setting:
```bash
VITE_USE_FUNCTIONS=true
```

## EmailJS Setup (Outro Email)

When player enters email after finishing game, frontend can send an instant email via EmailJS.

1. Fill these values in `/Users/lukablaskovic/Github/fipu-game/.env`:
```bash
VITE_EMAILJS_SERVICE_ID=
VITE_EMAILJS_TEMPLATE_ID=
VITE_EMAILJS_PUBLIC_KEY=
```
2. Use HTML template from:
- `/Users/lukablaskovic/Github/fipu-game/src/email/fipu-outro-email-template.html`
3. In EmailJS template, use variables:
- `{{player_name}}`
- `{{model_accuracy}}`
- `{{correct_count}}`
- `{{total_rounds}}`
- `{{difficulty}}`

## Deploy Hosting

1. Build:
```bash
npm run build
```
2. Deploy:
```bash
firebase deploy --only hosting
```

Or run combined script:
```bash
npm run deploy
```

## Key Files

- `/Users/lukablaskovic/Github/fipu-game/src/App.vue`: Full game UI + gameplay logic.
- `/Users/lukablaskovic/Github/fipu-game/src/services/leaderboard.js`: Cloud/local leaderboard handling.
- `/Users/lukablaskovic/Github/fipu-game/src/firebase/client.js`: Firebase app init.
- `/Users/lukablaskovic/Github/fipu-game/functions/index.js`: Callable score submit function.
- `/Users/lukablaskovic/Github/fipu-game/database.rules.json`: Realtime Database rules.
