# RoomCast

RoomCast is a private two-person watch room app for sharing a browser tab or desktop window with a guest. It uses Google sign-in, Firebase callable Functions for room creation/joining, Firestore for WebRTC signaling, and direct WebRTC peer connections for screen and voice streams.

## Features

- Google-only sign-in with Firebase Authentication
- Private room creation with a six-character invite code
- Two-person host/guest room flow
- Host screen sharing with local preview
- Guest WebRTC playback of the host stream
- Push-to-talk microphone support
- Firestore-backed WebRTC signaling
- Firebase Hosting deployment with SPA rewrites

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui and Radix UI
- Zustand
- Firebase Authentication
- Firebase Hosting
- Cloud Firestore
- Cloud Functions for Firebase
- WebRTC

## Local Setup

Install dependencies:

```bash
npm install
```

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Fill in the Firebase web app values:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

Run the app:

```bash
npm run dev
```

## Firebase Setup

Enable these Firebase/Google Cloud products:

- Firebase Authentication with Google sign-in
- Firebase Hosting
- Cloud Firestore
- Cloud Functions

Deploy Firestore rules and Functions:

```bash
firebase deploy --only "firestore,functions"
```

Deploy the web app:

```bash
npm run build
firebase deploy --only hosting
```

## Important Notes

RoomCast uses browser screen sharing. Protected streaming services such as Netflix, Amazon Prime Video, Disney+, and similar DRM-protected platforms may block capture or show a black screen. This is enforced by browsers and content providers. RoomCast is intended for content you are allowed to share, such as owned media, presentations, non-DRM browser tabs, and compatible video sources.

## Scripts

```bash
npm run dev       # Start Vite dev server
npm run build     # Build production assets
npm run preview   # Preview production build
npm run lint      # Run ESLint
npm run test      # Run Vitest
```

## License

MIT
