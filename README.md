# RoomCast

> Lights down. Screen up. Two people, one private room, zero friction.

RoomCast is a cinematic two-person watch room built with React, Firebase, Firestore, Cloud Functions, and WebRTC. One host opens the theater, one guest takes a seat, and the stream moves directly between them for a low-latency shared viewing experience.

This project is designed around a simple promise:

- sign in
- create a room
- invite one guest
- share a screen or tab
- talk with push-to-talk or always-on voice

## Opening Scene

RoomCast is not a social feed, not a streaming platform, and not a media storage app.

It is a private screening room.

The host creates a room, RoomCast uses Firebase Auth to identify everyone, Firestore handles signaling and room state, Cloud Functions enforce room rules, and WebRTC carries the live screen/audio session between the two participants.

## Feature Reel

- Private two-person rooms: one host, one guest
- Firebase Authentication with Google Sign-In
- Temporary QA bypass support for controlled testing
- Firestore-backed room state and WebRTC signaling
- Cloud Functions for room creation, join, leave, end, and reconnect support
- WebRTC screen sharing and live voice
- Push-to-talk and always-on microphone modes
- Audio ducking for RoomCast-owned media playback
- Invite link and room code flow
- Theater-style UI with reconnect and ended-room handling

## Tech Stack

**Frontend**
- React 18
- Vite
- TypeScript
- Tailwind CSS
- Zustand
- React Router
- shadcn/ui

**Backend**
- Firebase Authentication
- Cloud Firestore
- Firebase Cloud Functions
- Firebase Hosting
- WebRTC

## Project Structure

```text
RoomCast-main/
├─ src/              # React app, stores, services, UI, pages
├─ functions/        # Firebase Cloud Functions backend
├─ firestore.rules   # Firestore access rules
├─ firebase.json     # Firebase Hosting / Functions / Firestore config
└─ .firebaserc       # Default Firebase project target
```

## Deployment Targets

Based on the repo configuration:

- **Firebase project:** `roomcast-52639`
- **Frontend deploy target:** Firebase Hosting, serving the `dist/` folder
- **Backend deploy target:** Firebase Cloud Functions from `functions/`
- **Firestore rules deploy target:** `firestore.rules`

Configured from:

- [.firebaserc](C:\Users\gdkal\Desktop\RoomCast-main\.firebaserc)
- [firebase.json](C:\Users\gdkal\Desktop\RoomCast-main\firebase.json)

The app has been deployed in this project to:

- [https://roomcast-52639.web.app](https://roomcast-52639.web.app)
- [https://roomcast-52639.firebaseapp.com](https://roomcast-52639.firebaseapp.com)

The intended public-facing base URL is also reflected in env setup:

- `VITE_BASE_URL=https://roomcast.online`

That value appears in:

- [.env.example](C:\Users\gdkal\Desktop\RoomCast-main\.env.example)

## Local Run

```bash
npm install
npm run dev
```

Build and checks:

```bash
npm run build
npm test
npm run lint
cd functions
npm install
npm run build
```

## Environment Variables

Frontend environment variables are defined in:

- [.env.example](C:\Users\gdkal\Desktop\RoomCast-main\.env.example)

Core Firebase config:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

Networking / domain support:

```env
VITE_BASE_URL=https://roomcast.online
VITE_STUN_URL=stun:stun.l.google.com:19302
VITE_TURN_URL=turn:your-turn.example.com:3478
VITE_TURN_USERNAME=your_turn_username
VITE_TURN_CREDENTIAL=your_turn_password
```

QA-only toggles:

```env
VITE_ENABLE_QA_BYPASS=false
VITE_ENABLE_QA_TOOLS=false
```

## QA Bypass

For environments where Google OAuth is blocked, RoomCast includes a temporary QA bypass.

It stays dark unless both frontend and backend gates are enabled.

**Frontend**

```env
VITE_ENABLE_QA_BYPASS=true
```

**Backend**

Functions runtime must also enable:

```env
QA_BYPASS_ENABLED=true
```

When enabled, the login page reveals:

- `Test Host`
- `Test Guest`

These sign in through backend-issued Firebase custom tokens for fixed QA identities only.

## How the Story Plays

1. The host signs in and creates a room.
2. RoomCast generates a short room code and private room document.
3. The guest joins by invite link or code.
4. The host starts screen sharing.
5. Firestore exchanges the signaling data.
6. WebRTC carries the live media directly between host and guest.
7. Voice stays available through push-to-talk or always-on mic mode.

## Important Notes

- RoomCast is built for **one host and one guest**
- It does **not** store video, voice recordings, or room chat history
- It does **not** bypass DRM or platform capture restrictions
- Some protected streaming sites may refuse capture at the browser or OS level
- TURN support is env-driven and should be configured for tougher real-world network conditions

## Deploy Commands

From the current repo configuration, the normal deploy path is Firebase:

```bash
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules
firebase deploy --only hosting,functions,firestore:rules
```

## Final Cut

RoomCast is a small screening room with a very specific job:

make “watch this with me” feel immediate.

Not louder. Not bigger. Just smoother, faster, and a little more like rolling the projector at exactly the right moment.
