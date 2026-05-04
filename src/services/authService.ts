import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { getAuthInstance } from "@/services/firebase";

export function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return signInWithPopup(getAuthInstance(), provider);
}

export function logout() {
  return signOut(getAuthInstance());
}

export function listenToAuthState(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(getAuthInstance(), callback);
}
