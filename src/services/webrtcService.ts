import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirestoreInstance } from "@/services/firebase";
import * as roomService from "@/services/roomService";

type Role = "host" | "guest";

const iceServers: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

let peerConnection: RTCPeerConnection | null = null;
let localScreenStream: MediaStream | null = null;
let localMicStream: MediaStream | null = null;
let remoteStream: MediaStream | null = null;
let micTrack: MediaStreamTrack | null = null;
let dataChannel: RTCDataChannel | null = null;
let currentRoomId: string | null = null;
let currentSessionId: string | null = null;
let currentRole: Role | null = null;
let desiredMicEnabled = false;
let sessionUnsub: Unsubscribe | null = null;
let candidateUnsubs: Unsubscribe[] = [];
let localStreamHandler: ((stream: MediaStream | null) => void) | null = null;
let remoteStreamHandler: ((stream: MediaStream | null) => void) | null = null;
let remoteSpeakingHandler: ((speaking: boolean) => void) | null = null;
let sharingEndedHandler: (() => void) | null = null;

export function onLocalStream(callback: (stream: MediaStream | null) => void) {
  localStreamHandler = callback;
  callback(localScreenStream);
  return () => {
    if (localStreamHandler === callback) localStreamHandler = null;
  };
}

export function onRemoteStream(callback: (stream: MediaStream | null) => void) {
  remoteStreamHandler = callback;
  callback(remoteStream);
  return () => {
    if (remoteStreamHandler === callback) remoteStreamHandler = null;
  };
}

export function onRemoteSpeaking(callback: (speaking: boolean) => void) {
  remoteSpeakingHandler = callback;
  return () => {
    if (remoteSpeakingHandler === callback) remoteSpeakingHandler = null;
  };
}

export function onSharingEnded(callback: () => void) {
  sharingEndedHandler = callback;
  return () => {
    if (sharingEndedHandler === callback) sharingEndedHandler = null;
  };
}

export function getCurrentSessionId() {
  return currentSessionId;
}

export function hasLocalScreenShare() {
  return Boolean(localScreenStream?.getVideoTracks().some((track) => track.readyState === "live"));
}

function applyMicState() {
  if (micTrack) micTrack.enabled = desiredMicEnabled;
}

function wireDataChannel(channel: RTCDataChannel) {
  dataChannel = channel;
  dataChannel.onmessage = (event) => {
    try {
      const data = JSON.parse(String(event.data));
      if (data.type === "speaking") remoteSpeakingHandler?.(Boolean(data.value));
    } catch {
      // Ignore non-RoomCast data channel payloads.
    }
  };
}

function createPeerConnection() {
  peerConnection?.close();
  peerConnection = new RTCPeerConnection(iceServers);
  remoteStream = new MediaStream();
  remoteStreamHandler?.(remoteStream);
  peerConnection.ondatachannel = (event) => {
    wireDataChannel(event.channel);
  };
  peerConnection.ontrack = (event) => {
    if (!remoteStream) {
      remoteStream = new MediaStream();
      remoteStreamHandler?.(remoteStream);
    }
    event.streams[0]?.getTracks().forEach((track) => {
      if (!remoteStream?.getTracks().some((existing) => existing.id === track.id)) {
        remoteStream?.addTrack(track);
      }
    });
    if (remoteStream) remoteStreamHandler?.(remoteStream);
  };
  return peerConnection;
}

async function ensureMicrophone() {
  if (!localMicStream) {
    localMicStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    micTrack = localMicStream.getAudioTracks()[0] || null;
  }
  applyMicState();
  return localMicStream;
}

async function startScreenShare() {
  localScreenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
  localStreamHandler?.(localScreenStream);
  localScreenStream.getVideoTracks()[0]?.addEventListener("ended", () => {
    localStreamHandler?.(null);
    sharingEndedHandler?.();
  });
  return localScreenStream;
}

function addLocalTracks(pc: RTCPeerConnection, streams: MediaStream[]) {
  streams.forEach((stream) => {
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
  });
}

function cleanupSessionListeners() {
  sessionUnsub?.();
  sessionUnsub = null;
  candidateUnsubs.forEach((unsub) => unsub());
  candidateUnsubs = [];
}

function stopScreenTracks() {
  localScreenStream?.getTracks().forEach((track) => track.stop());
  localScreenStream = null;
  localStreamHandler?.(null);
}

function cleanupPeerConnection({ preserveMic = true }: { preserveMic?: boolean } = {}) {
  cleanupSessionListeners();
  peerConnection?.close();
  peerConnection = null;
  dataChannel?.close();
  dataChannel = null;
  stopScreenTracks();
  remoteStream?.getTracks().forEach((track) => track.stop());
  remoteStream = null;
  remoteStreamHandler?.(null);
  remoteSpeakingHandler?.(false);
  if (!preserveMic) {
    localMicStream?.getTracks().forEach((track) => track.stop());
    localMicStream = null;
    micTrack = null;
  }
}

function collectIceCandidates(roomId: string, sessionId: string, role: Role) {
  if (!peerConnection) return;
  const candidatesRef = collection(
    getFirestoreInstance(),
    "rooms",
    roomId,
    "sessions",
    sessionId,
    role === "host" ? "hostCandidates" : "guestCandidates",
  );
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) void addDoc(candidatesRef, event.candidate.toJSON());
  };
}

function listenForRemoteCandidates(roomId: string, sessionId: string, role: Role) {
  if (!peerConnection) return;
  const remoteCollection = role === "host" ? "guestCandidates" : "hostCandidates";
  const unsub = onSnapshot(
    collection(getFirestoreInstance(), "rooms", roomId, "sessions", sessionId, remoteCollection),
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          void peerConnection?.addIceCandidate(new RTCIceCandidate(change.doc.data()));
        }
      });
    },
  );
  candidateUnsubs.push(unsub);
}

export async function ensureMicrophoneAccess() {
  await ensureMicrophone();
}

export async function startHostSession(roomId: string) {
  cleanupPeerConnection({ preserveMic: true });
  currentRoomId = roomId;
  currentRole = "host";
  const mic = await ensureMicrophone();
  const screen = await startScreenShare();
  const { sessionId } = await roomService.startRoomSession(roomId);
  currentSessionId = sessionId;

  const pc = createPeerConnection();
  wireDataChannel(pc.createDataChannel("voice"));
  addLocalTracks(pc, [screen, mic]);
  collectIceCandidates(roomId, sessionId, "host");
  listenForRemoteCandidates(roomId, sessionId, "host");

  sessionUnsub = roomService.subscribeToSession(roomId, sessionId, async (session) => {
    if (!session?.answer || !peerConnection || peerConnection.currentRemoteDescription) return;
    await peerConnection.setRemoteDescription(new RTCSessionDescription(session.answer));
  });

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await updateDoc(doc(getFirestoreInstance(), "rooms", roomId, "sessions", sessionId), {
    offer: { type: offer.type, sdp: offer.sdp },
    status: "active",
  });

  return { sessionId, stream: screen };
}

export async function joinGuestSession(roomId: string, sessionId: string) {
  if (currentRole === "guest" && currentSessionId === sessionId && peerConnection) return;

  cleanupPeerConnection({ preserveMic: true });
  currentRoomId = roomId;
  currentSessionId = sessionId;
  currentRole = "guest";
  const mic = await ensureMicrophone();
  const pc = createPeerConnection();
  addLocalTracks(pc, [mic]);
  collectIceCandidates(roomId, sessionId, "guest");
  listenForRemoteCandidates(roomId, sessionId, "guest");

  let answered = false;
  sessionUnsub = roomService.subscribeToSession(roomId, sessionId, async (session) => {
    if (!session?.offer || answered || !peerConnection) return;
    answered = true;
    await peerConnection.setRemoteDescription(new RTCSessionDescription(session.offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    await updateDoc(doc(getFirestoreInstance(), "rooms", roomId, "sessions", sessionId), {
      answer: { type: answer.type, sdp: answer.sdp },
      status: "active",
    });
  });
}

export async function stopSharingSession(roomId: string) {
  const shouldNotifyBackend = currentRole === "host" && currentRoomId === roomId;
  cleanupPeerConnection({ preserveMic: true });
  currentSessionId = null;
  currentRole = shouldNotifyBackend ? "host" : null;
  if (shouldNotifyBackend) {
    await roomService.stopRoomSession(roomId);
  }
}

export function clearSessionState() {
  currentSessionId = null;
  currentRole = null;
  remoteSpeakingHandler?.(false);
  cleanupPeerConnection({ preserveMic: true });
}

export function setMicEnabled(enabled: boolean) {
  desiredMicEnabled = enabled;
  applyMicState();
}

export function sendSpeaking(speaking: boolean) {
  if (dataChannel?.readyState === "open") {
    dataChannel.send(JSON.stringify({ type: "speaking", value: speaking }));
  }
}

export function cleanupConnection() {
  currentRoomId = null;
  currentSessionId = null;
  currentRole = null;
  desiredMicEnabled = false;
  cleanupPeerConnection({ preserveMic: false });
}
