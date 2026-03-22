import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
  type Unsubscribe,
} from "firebase/auth";
import { getFirebaseAuth } from "./config";

const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle(): Promise<User> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase not configured");
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOut(): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) return;
  await firebaseSignOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void): Unsubscribe {
  const auth = getFirebaseAuth();
  if (!auth) {
    // No Firebase configured — treat as no user
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export type { User };
