import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithCustomToken,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { getAuthInstance, getFunctionsInstance } from "@/services/firebase";

export function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return signInWithPopup(getAuthInstance(), provider);
}

export async function signInWithQaRole(role: "host" | "guest") {
  const fn = httpsCallable<{ role: "host" | "guest" }, { token: string }>(getFunctionsInstance(), "getQaBypassToken");
  const { token } = (await fn({ role })).data;
  return signInWithCustomToken(getAuthInstance(), token);
}

export function logout() {
  return signOut(getAuthInstance());
}

export function listenToAuthState(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(getAuthInstance(), callback);
}
