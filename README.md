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
