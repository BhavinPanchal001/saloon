import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
  type Auth,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "glowy-771a3.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "glowy-771a3",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "glowy-771a3.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export const isFirebaseConfigured = (): boolean => {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.apiKey.trim() !== "" &&
      firebaseConfig.projectId
  );
};

export const getFirebaseAuth = (): Auth | null => {
  if (typeof window === "undefined") return null;
  if (!isFirebaseConfigured()) return null;

  if (!app) {
    app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  }
  if (!auth) {
    auth = getAuth(app);
  }
  return auth;
};

export const createRecaptchaVerifier = (
  containerId: string,
  onSolved?: () => void
): RecaptchaVerifier | null => {
  const firebaseAuth = getFirebaseAuth();
  if (!firebaseAuth || typeof window === "undefined") return null;

  try {
    const existing = (window as any).recaptchaVerifier;
    if (existing) {
      try {
        existing.clear();
      } catch (e) {
        // ignore cleanup error
      }
    }

    const verifier = new RecaptchaVerifier(firebaseAuth, containerId, {
      size: "invisible",
      callback: () => {
        if (onSolved) onSolved();
      },
      "expired-callback": () => {
        console.warn("Recaptcha expired. Please try again.");
      },
    });

    (window as any).recaptchaVerifier = verifier;
    return verifier;
  } catch (error) {
    console.error("Error creating RecaptchaVerifier:", error);
    return null;
  }
};

export type { ConfirmationResult };
