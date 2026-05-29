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
import { createQaMicrophoneStream, createQaScreenShareStream, stopQaManagedStream } from "@/lib/qaMedia";
import { isQaMode } from "@/lib/qa";

type Role = "host" | "guest";

type IceConfigEnv = {
  VITE_STUN_URL?: string;
  VITE_TURN_URL?: string;
  VITE_TURN_USERNAME?: string;
  VITE_TURN_CREDENTIAL?: string;
};

type SessionStartOptions = {
  reuseScreen?: boolean;
};

type SessionStartResult = {
  sessionId: string;
  stream: MediaStream;
  micWarning?: string;
};

type GuestJoinResult = {
  micWarning?: string;
};

export function buildRtcConfiguration(env: IceConfigEnv = import.meta.env): RTCConfiguration {
  const stunUrl = env.VITE_STUN_URL?.trim() || "stun:stun.l.google.com:19302";
  const iceServers: RTCIceServer[] = [{ urls: stunUrl }];

  const turnUrl = env.VITE_TURN_URL?.trim();
  if (turnUrl) {
    const turnServer: RTCIceServer = { urls: turnUrl };
    const username = env.VITE_TURN_USERNAME?.trim();
    const credential = env.VITE_TURN_CREDENTIAL?.trim();
    if (username) turnServer.username = username;
    if (credential) turnServer.credential = credential;
    iceServers.push(turnServer);
  }

  return { iceServers };
}

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
let pendingRemoteCandidates: RTCIceCandidateInit[] = [];
let localStreamHandler: ((stream: MediaStream | null) => void) | null = null;
let remoteStreamHandler: ((stream: MediaStream | null) => void) | null = null;
let remoteSpeakingHandler: ((speaking: boolean) => void) | null = null;
let sharingEndedHandler: (() => void) | null = null;
let qaNativeStopHandler: (() => void) | null = null;

function publishDebugState() {
  if (!import.meta.env.DEV || typeof window === "undefined") return;
  window.__roomcastDebug = {
    role: currentRole,
    roomId: currentRoomId,
    sessionId: currentSessionId,
    localScreenTracks: localScreenStream?.getTracks().map((track) => ({
      id: track.id,
      kind: track.kind,
      readyState: track.readyState,
      enabled: track.enabled,
    })) || [],
    localMicTracks: localMicStream?.getTracks().map((track) => ({
      id: track.id,
      kind: track.kind,
      readyState: track.readyState,
      enabled: track.enabled,
    })) || [],
    remoteTracks: remoteStream?.getTracks().map((track) => ({
      id: track.id,
      kind: track.kind,
      readyState: track.readyState,
      enabled: track.enabled,
    })) || [],
    senders: peerConnection?.getSenders().map((sender) => ({
      kind: sender.track?.kind || null,
      id: sender.track?.id || null,
      readyState: sender.track?.readyState || null,
    })) || [],
    receivers: peerConnection?.getReceivers().map((receiver) => ({
      kind: receiver.track?.kind || null,
      id: receiver.track?.id || null,
      readyState: receiver.track?.readyState || null,
    })) || [],
    signalingState: peerConnection?.signalingState || null,
    iceConnectionState: peerConnection?.iceConnectionState || null,
    connectionState: peerConnection?.connectionState || null,
    localDescriptionType: peerConnection?.localDescription?.type || null,
    remoteDescriptionType: peerConnection?.remoteDescription?.type || null,
  };
}

function snapshotStream(stream: MediaStream | null) {
  return stream ? new MediaStream(stream.getTracks()) : null;
}

function applyMicState() {
  if (micTrack) micTrack.enabled = desiredMicEnabled;
}

function cleanupSessionListeners() {
  sessionUnsub?.();
  sessionUnsub = null;
  candidateUnsubs.forEach((unsub) => unsub());
  candidateUnsubs = [];
  pendingRemoteCandidates = [];
}

function stopScreenTracks() {
  qaNativeStopHandler = null;
  stopQaManagedStream(localScreenStream);
  localScreenStream?.getTracks().forEach((track) => {
    if (track.readyState !== "ended") track.stop();
  });
  localScreenStream = null;
  localStreamHandler?.(null);
  publishDebugState();
}

function stopMicTracks() {
  stopQaManagedStream(localMicStream);
  localMicStream?.getTracks().forEach((track) => {
    if (track.readyState !== "ended") track.stop();
  });
  localMicStream = null;
  micTrack = null;
  publishDebugState();
}

function resetRemoteStream() {
  remoteStream?.getTracks().forEach((track) => {
    if (track.readyState !== "ended") track.stop();
  });
  remoteStream = null;
  remoteStreamHandler?.(null);
  remoteSpeakingHandler?.(false);
}

function cleanupPeerConnection(options: { preserveMic?: boolean; preserveScreen?: boolean } = {}) {
  const { preserveMic = true, preserveScreen = false } = options;
  cleanupSessionListeners();
  peerConnection?.close();
  peerConnection = null;
  dataChannel?.close();
  dataChannel = null;
  if (!preserveScreen) stopScreenTracks();
  resetRemoteStream();
  if (!preserveMic) stopMicTracks();
  publishDebugState();
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
  peerConnection = new RTCPeerConnection(buildRtcConfiguration());
  remoteStream = new MediaStream();
  remoteStreamHandler?.(snapshotStream(remoteStream));
  publishDebugState();
  peerConnection.ondatachannel = (event) => {
    wireDataChannel(event.channel);
  };
  peerConnection.ontrack = (event) => {
    if (!remoteStream) {
      remoteStream = new MediaStream();
      remoteStreamHandler?.(snapshotStream(remoteStream));
    }
    const tracks = event.streams[0]?.getTracks().length ? event.streams[0].getTracks() : [event.track];
    tracks.forEach((track) => {
      if (!remoteStream?.getTracks().some((existing) => existing.id === track.id)) {
        remoteStream?.addTrack(track);
      }
    });
    remoteStreamHandler?.(snapshotStream(remoteStream));
    publishDebugState();
  };
  peerConnection.onconnectionstatechange = () => publishDebugState();
  peerConnection.oniceconnectionstatechange = () => publishDebugState();
  return peerConnection;
}

function trackSharingEnded(stream: MediaStream) {
  let endedHandled = false;
  const handleEnded = () => {
    if (endedHandled) return;
    endedHandled = true;
    localStreamHandler?.(null);
    localScreenStream = null;
    qaNativeStopHandler = null;
    publishDebugState();
    sharingEndedHandler?.();
  };

  stream.getVideoTracks()[0]?.addEventListener("ended", handleEnded);
  qaNativeStopHandler = isQaMode()
    ? () => {
        stream.getVideoTracks()[0]?.stop();
        handleEnded();
      }
    : null;
}

async function startScreenShare() {
  localScreenStream = isQaMode()
    ? await createQaScreenShareStream()
    : await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
  localStreamHandler?.(localScreenStream);
  trackSharingEnded(localScreenStream);
  publishDebugState();
  return localScreenStream;
}

async function ensureMicrophone() {
  if (!localMicStream) {
    localMicStream = isQaMode()
      ? createQaMicrophoneStream()
      : await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    micTrack = localMicStream.getAudioTracks()[0] || null;
  }
  applyMicState();
  publishDebugState();
  return localMicStream;
}

async function ensureMicrophoneBestEffort() {
  try {
    const stream = await ensureMicrophone();
    return { stream, granted: true, warning: undefined };
  } catch (error) {
    console.warn("Microphone unavailable; continuing without it.", error);
    return {
      stream: null,
      granted: false,
      warning: "Microphone permission denied. Screen share will continue without voice.",
    };
  }
}

function addLocalTracks(pc: RTCPeerConnection, streams: MediaStream[]) {
  streams.forEach((stream) => {
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
  });
  publishDebugState();
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
  publishDebugState();
}

async function flushPendingRemoteCandidates() {
  if (!peerConnection?.remoteDescription) return;
  const candidates = [...pendingRemoteCandidates];
  pendingRemoteCandidates = [];
  for (const candidate of candidates) {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }
}

function listenForRemoteCandidates(roomId: string, sessionId: string, role: Role) {
  if (!peerConnection) return;
  const remoteCollection = role === "host" ? "guestCandidates" : "hostCandidates";
  const unsub = onSnapshot(
    collection(getFirestoreInstance(), "rooms", roomId, "sessions", sessionId, remoteCollection),
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type !== "added") return;
        const candidate = change.doc.data() as RTCIceCandidateInit;
        if (!peerConnection?.remoteDescription) {
          pendingRemoteCandidates.push(candidate);
          return;
        }
        void peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      });
    },
  );
  candidateUnsubs.push(unsub);
}

function rollbackFailedStart({ stopMic }: { stopMic: boolean }) {
  cleanupPeerConnection({ preserveMic: !stopMic, preserveScreen: false });
  currentSessionId = null;
  publishDebugState();
}

export function onLocalStream(callback: (stream: MediaStream | null) => void) {
  localStreamHandler = callback;
  callback(localScreenStream);
  return () => {
    if (localStreamHandler === callback) localStreamHandler = null;
  };
}

export function onRemoteStream(callback: (stream: MediaStream | null) => void) {
  remoteStreamHandler = callback;
  callback(snapshotStream(remoteStream));
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

export function hasRemoteVideoTrack() {
  return Boolean(remoteStream?.getVideoTracks().some((track) => track.readyState === "live"));
}

export async function ensureMicrophoneAccess() {
  await ensureMicrophone();
}

export async function startHostSession(roomId: string, options: SessionStartOptions = {}): Promise<SessionStartResult> {
  const reuseScreen = Boolean(options.reuseScreen && hasLocalScreenShare());
  const hadMicBeforeAttempt = Boolean(localMicStream);

  cleanupPeerConnection({ preserveMic: true, preserveScreen: reuseScreen });
  currentRoomId = roomId;
  currentRole = "host";

  let screen = localScreenStream;
  let micWarning: string | undefined;

  try {
    if (!screen) {
      screen = await startScreenShare();
    } else {
      localStreamHandler?.(screen);
      publishDebugState();
    }

    const mic = await ensureMicrophoneBestEffort();
    micWarning = mic.warning;

    const { sessionId } = await roomService.startRoomSession(roomId);
    currentSessionId = sessionId;

    const pc = createPeerConnection();
    wireDataChannel(pc.createDataChannel("voice"));
    addLocalTracks(pc, [screen, ...(mic.stream ? [mic.stream] : [])]);
    collectIceCandidates(roomId, sessionId, "host");
    listenForRemoteCandidates(roomId, sessionId, "host");

    sessionUnsub = roomService.subscribeToSession(roomId, sessionId, async (session) => {
      if (!session?.answer || !peerConnection || peerConnection.currentRemoteDescription) return;
      await peerConnection.setRemoteDescription(new RTCSessionDescription(session.answer));
      await flushPendingRemoteCandidates();
      publishDebugState();
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    publishDebugState();
    await updateDoc(doc(getFirestoreInstance(), "rooms", roomId, "sessions", sessionId), {
      offer: { type: offer.type, sdp: offer.sdp },
      status: "active",
    });

    return { sessionId, stream: screen, micWarning };
  } catch (error) {
    rollbackFailedStart({ stopMic: !hadMicBeforeAttempt });
    throw error;
  }
}

export async function joinGuestSession(roomId: string, sessionId: string): Promise<GuestJoinResult> {
  if (currentRole === "guest" && currentSessionId === sessionId && peerConnection) return {};

  cleanupPeerConnection({ preserveMic: true, preserveScreen: false });
  currentRoomId = roomId;
  currentSessionId = sessionId;
  currentRole = "guest";

  const mic = await ensureMicrophoneBestEffort();
  const pc = createPeerConnection();
  addLocalTracks(pc, mic.stream ? [mic.stream] : []);
  collectIceCandidates(roomId, sessionId, "guest");
  listenForRemoteCandidates(roomId, sessionId, "guest");

  let answered = false;
  sessionUnsub = roomService.subscribeToSession(roomId, sessionId, async (session) => {
    if (!session?.offer || answered || !peerConnection) return;
    answered = true;
    await peerConnection.setRemoteDescription(new RTCSessionDescription(session.offer));
    await flushPendingRemoteCandidates();
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    publishDebugState();
    await updateDoc(doc(getFirestoreInstance(), "rooms", roomId, "sessions", sessionId), {
      answer: { type: answer.type, sdp: answer.sdp },
      status: "active",
    });
  });

  return { micWarning: mic.warning };
}

export async function stopSharingSession(roomId: string) {
  const shouldNotifyBackend = currentRole === "host" && currentRoomId === roomId;
  cleanupPeerConnection({ preserveMic: true, preserveScreen: false });
  currentSessionId = null;
  currentRole = shouldNotifyBackend ? "host" : null;
  if (shouldNotifyBackend) {
    await roomService.stopRoomSession(roomId);
  }
}

export function clearSessionState() {
  currentSessionId = null;
  if (currentRole === "guest") currentRole = null;
  remoteSpeakingHandler?.(false);
  cleanupPeerConnection({ preserveMic: true, preserveScreen: true });
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
  cleanupPeerConnection({ preserveMic: false, preserveScreen: false });
}

export function simulateNativeShareStopForQa() {
  qaNativeStopHandler?.();
}
