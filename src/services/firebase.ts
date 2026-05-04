import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getFunctions, type Functions } from "firebase/functions";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const requiredConfigEntries = Object.entries(firebaseConfig);

export const isFirebaseConfigured = requiredConfigEntries.every(([, value]) => Boolean(value));
export const firebaseConfigError = isFirebaseConfigured
  ? null
  : `Missing Firebase environment variables: ${requiredConfigEntries
      .filter(([, value]) => !value)
      .map(([key]) => key)
      .join(", ")}`;

let firebaseApp: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;
let functions: Functions | null = null;

function requireFirebaseConfigured() {
  if (!isFirebaseConfigured) {
    throw new Error(firebaseConfigError || "Firebase is not configured.");
  }
}

export function getFirebaseApp() {
  requireFirebaseConfigured();
  if (!firebaseApp) firebaseApp = initializeApp(firebaseConfig);
  return firebaseApp;
}

export function getAuthInstance() {
  if (!auth) auth = getAuth(getFirebaseApp());
  return auth;
}

export function getFirestoreInstance() {
  if (!firestore) firestore = getFirestore(getFirebaseApp());
  return firestore;
}

export function getFunctionsInstance() {
  if (!functions) functions = getFunctions(getFirebaseApp());
  return functions;
}
