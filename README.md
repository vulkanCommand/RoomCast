<div align="center">

# RoomCast

### Lights down. Screen up. Two people, one private room.

<p>
  <img src="./docs/images/roomcast-hero.png" alt="RoomCast hero" width="100%" />
</p>

<p>
  <img alt="React" src="https://img.shields.io/badge/React-18-111827?style=for-the-badge&logo=react&logoColor=61DAFB">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-5-111827?style=for-the-badge&logo=vite&logoColor=FFD62E">
  <img alt="Firebase" src="https://img.shields.io/badge/Firebase-Auth%20%7C%20Firestore%20%7C%20Functions-111827?style=for-the-badge&logo=firebase&logoColor=FFCA28">
  <img alt="WebRTC" src="https://img.shields.io/badge/WebRTC-Live%20Peer%20Streaming-111827?style=for-the-badge&logo=webrtc&logoColor=00B5D8">
</p>

<p>
  <img alt="Mode" src="https://img.shields.io/badge/Mode-Host%20%2B%20Guest-7C3AED?style=flat-square">
  <img alt="Rooms" src="https://img.shields.io/badge/Rooms-Private%20Two--Person-E11D48?style=flat-square">
  <img alt="Deploy" src="https://img.shields.io/badge/Deploy-Firebase%20Hosting%20%2B%20Functions-0F172A?style=flat-square">
</p>

</div>

## Trailer

RoomCast is a private watch room built for one host and one guest.

The host opens the room, shares a screen or tab, and RoomCast handles the rest:

- Firebase Auth identifies the cast
- Firestore coordinates the room and signaling
- Cloud Functions enforce the rules of the theater
- WebRTC carries the live media between both seats

No feed. No public lobby. No noisy extras.

Just a private screening room with voice, invites, and a clean stage.

---

## Feature Reel

<p align="center">
  <img src="./docs/images/roomcast-features.png" alt="RoomCast features" width="100%" />
</p>

| Scene | What happens |
| --- | --- |
| Private Rooms | One host creates a room and one guest joins by code or link |
| Live Screen Share | Host shares a screen, window, or browser tab |
| Voice Channel | Push-to-talk and always-on mic modes are both supported |
| Real Signaling | Firestore handles room state and WebRTC signaling |
| Enforced Rules | Cloud Functions handle create, join, leave, end, and reconnect logic |
| Theater UI | Room state, reconnect flow, ended-room handling, and audio ducking are built into the experience |

---

## Tech Stack

<table>
  <tr>
    <td valign="top" width="50%">

**Frontend**

- React 18
- Vite
- TypeScript
- Tailwind CSS
- Zustand
- React Router
- shadcn/ui

    </td>
    <td valign="top" width="50%">

**Backend**

- Firebase Authentication
- Cloud Firestore
- Firebase Cloud Functions
- Firebase Hosting
- WebRTC

    </td>
  </tr>
</table>

---

## How the Story Plays

```text
Host signs in
  -> creates room
  -> shares invite link or room code
  -> starts screen share
  -> Firestore exchanges signaling
  -> WebRTC sends live media to the guest
  -> voice stays available through push-to-talk or always-on mic
```

In short:

1. Host signs in and creates a room.
2. RoomCast generates a room document and a short invite code.
3. Guest joins by code or direct room link.
4. Host starts sharing.
5. Firestore coordinates the signaling exchange.
6. WebRTC moves the stream directly between both users.

---

## Deployment Targets

This repo is currently configured to deploy to:

- **Firebase project:** `roomcast-52639`
- **Frontend:** Firebase Hosting from `dist/`
- **Backend:** Firebase Functions from `functions/`
- **Rules:** Firestore rules from `firestore.rules`

Live frontend targets:

- [roomcast-52639.web.app](https://roomcast-52639.web.app)
- [roomcast-52639.firebaseapp.com](https://roomcast-52639.firebaseapp.com)

Configured by:

- `.firebaserc`
- `firebase.json`

Public base URL in env setup:

- `VITE_BASE_URL=https://roomcast.online`

---

## Projection Booth: Local Setup

### Run locally

```bash
npm install
npm run dev
```

### Frontend checks

```bash
npm run build
npm test
npm run lint
```

### Functions checks

```bash
cd functions
npm install
npm run build
```

### Firebase deploy commands

```bash
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules
firebase deploy --only hosting,functions,firestore:rules
```

---

## Environment Variables

Core frontend Firebase config:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

Networking and domain configuration:

```env
VITE_BASE_URL=https://roomcast.online
VITE_STUN_URL=stun:stun.l.google.com:19302
VITE_TURN_URL=turn:your-turn.example.com:3478
VITE_TURN_USERNAME=your_turn_username
VITE_TURN_CREDENTIAL=your_turn_password
```

QA toggles:

```env
VITE_ENABLE_QA_BYPASS=false
VITE_ENABLE_QA_TOOLS=false
```

Source of truth:

- `.env.example`

---

## QA Bypass

For test environments where Google OAuth is blocked, RoomCast includes a temporary QA-only bypass.

It stays hidden unless both gates are enabled:

**Frontend**

```env
VITE_ENABLE_QA_BYPASS=true
```

**Functions runtime**

```env
QA_BYPASS_ENABLED=true
```

When enabled, the login screen reveals:

- `Test Host`
- `Test Guest`

These use backend-issued Firebase custom tokens and are limited to fixed QA identities only.

---

## Important Notes

- RoomCast is built for **one host and one guest**
- It does **not** store video, chat history, or voice recordings
- It does **not** bypass DRM or capture restrictions from protected platforms
- Some services may block browser or OS-level capture
- TURN support is env-driven and should be configured for more difficult real-world networks

---

## Final Cut

RoomCast is built around one feeling:

**"Watch this with me."**

Fast room creation, direct media, simple voice, and a focused stage.

Not bigger. Not louder. Just closer to the moment when the projector starts and both people are already in the room.
