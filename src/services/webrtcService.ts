import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirestoreInstance } from "@/services/firebase";
import { subscribeToRoom } from "@/services/roomService";

type Role = "host" | "guest";

const iceServers: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

let peerConnection: RTCPeerConnection | null = null;
let localScreenStream: MediaStream | null = null;
let localMicStream: MediaStream | null = null;
let remoteStream: MediaStream | null = null;
let micTrack: MediaStreamTrack | null = null;
let unsubs: Unsubscribe[] = [];
let dataChannel: RTCDataChannel | null = null;
let localStreamHandler: ((stream: MediaStream | null) => void) | null = null;
let remoteStreamHandler: ((stream: MediaStream) => void) | null = null;
let remoteSpeakingHandler: ((speaking: boolean) => void) | null = null;
let sharingEndedHandler: (() => void) | null = null;

export function onLocalStream(callback: (stream: MediaStream | null) => void) {
  localStreamHandler = callback;
  if (localScreenStream) callback(localScreenStream);
  return () => {
    if (localStreamHandler === callback) localStreamHandler = null;
  };
}

export function onRemoteStream(callback: (stream: MediaStream) => void) {
  remoteStreamHandler = callback;
  if (remoteStream) callback(remoteStream);
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

export function createPeerConnection() {
  peerConnection?.close();
  peerConnection = new RTCPeerConnection(iceServers);
  remoteStream = new MediaStream();
  peerConnection.ondatachannel = (event) => {
    wireDataChannel(event.channel);
  };
  peerConnection.ontrack = (event) => {
    event.streams[0]?.getTracks().forEach((track) => remoteStream?.addTrack(track));
    if (remoteStream) remoteStreamHandler?.(remoteStream);
  };
  return peerConnection;
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

export async function startScreenShare() {
  localScreenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
  localStreamHandler?.(localScreenStream);
  localScreenStream.getVideoTracks()[0]?.addEventListener("ended", () => {
    localStreamHandler?.(null);
    sharingEndedHandler?.();
  });
  return localScreenStream;
}

export async function startMicrophone() {
  if (!localMicStream) {
    localMicStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    micTrack = localMicStream.getAudioTracks()[0] || null;
  }
  setMicEnabled(false);
  return localMicStream;
}

function addLocalTracks(pc: RTCPeerConnection, streams: MediaStream[]) {
  streams.forEach((stream) => {
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
  });
}

export function collectIceCandidates(roomId: string, role: Role) {
  if (!peerConnection) return;
  const candidatesRef = collection(getFirestoreInstance(), "rooms", roomId, role === "host" ? "hostCandidates" : "guestCandidates");
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) void addDoc(candidatesRef, event.candidate.toJSON());
  };
}

export function listenForRemoteCandidates(roomId: string, role: Role) {
  if (!peerConnection) return () => undefined;
  const remoteCollection = role === "host" ? "guestCandidates" : "hostCandidates";
  const unsub = onSnapshot(collection(getFirestoreInstance(), "rooms", roomId, remoteCollection), (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        void peerConnection?.addIceCandidate(new RTCIceCandidate(change.doc.data()));
      }
    });
  });
  unsubs.push(unsub);
  return unsub;
}

export async function createHostOffer(roomId: string) {
  const pc = createPeerConnection();
  wireDataChannel(pc.createDataChannel("voice"));
  const screen = await startScreenShare();
  const mic = await startMicrophone();
  addLocalTracks(pc, [screen, mic]);
  collectIceCandidates(roomId, "host");
  listenForRemoteCandidates(roomId, "host");
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await updateDoc(doc(getFirestoreInstance(), "rooms", roomId), { offer: { type: offer.type, sdp: offer.sdp } });
  listenForAnswer(roomId);
  return screen;
}

export function listenForAnswer(roomId: string) {
  const unsub = subscribeToRoom(roomId, async (room) => {
    if (!room?.answer || !peerConnection || peerConnection.currentRemoteDescription) return;
    await peerConnection.setRemoteDescription(new RTCSessionDescription(room.answer));
  });
  unsubs.push(unsub);
  return unsub;
}

export function listenForOffer(roomId: string, callback: (offer: RTCSessionDescriptionInit) => void) {
  const unsub = subscribeToRoom(roomId, (room) => {
    if (room?.offer) callback(room.offer);
  });
  unsubs.push(unsub);
  return unsub;
}

export async function joinAsGuest(roomId: string) {
  const pc = createPeerConnection();
  const mic = await startMicrophone();
  addLocalTracks(pc, [mic]);
  collectIceCandidates(roomId, "guest");
  listenForRemoteCandidates(roomId, "guest");

  return new Promise<void>((resolve, reject) => {
    let handled = false;
    const unsub = listenForOffer(roomId, async (offer) => {
      if (handled) return;
      handled = true;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await updateDoc(doc(getFirestoreInstance(), "rooms", roomId), { answer: { type: answer.type, sdp: answer.sdp } });
        unsub();
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
}

export function setMicEnabled(enabled: boolean) {
  if (micTrack) micTrack.enabled = enabled;
}

export function sendSpeaking(speaking: boolean) {
  if (dataChannel?.readyState === "open") {
    dataChannel.send(JSON.stringify({ type: "speaking", value: speaking }));
  }
}

export function getMicTrack() {
  return micTrack;
}

export function cleanupConnection() {
  unsubs.forEach((unsub) => unsub());
  unsubs = [];
  peerConnection?.close();
  peerConnection = null;
  dataChannel?.close();
  dataChannel = null;
  localScreenStream?.getTracks().forEach((track) => track.stop());
  localMicStream?.getTracks().forEach((track) => track.stop());
  remoteStream?.getTracks().forEach((track) => track.stop());
  localScreenStream = null;
  localMicStream = null;
  remoteStream = null;
  micTrack = null;
  localStreamHandler?.(null);
}
