import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAnalytics,
  type Analytics,
  isSupported as isAnalyticsSupported,
} from "firebase/analytics";
import {
  getAuth,
  type Auth,
  GoogleAuthProvider,
  OAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import {
  getFirestore,
  type Firestore,
  collection,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp | undefined;
let analytics: Analytics | null = null;
let auth: Auth | undefined;
let firestore: Firestore | undefined;

export const getFirebaseApp = (): FirebaseApp => {
  if (!app) {
    app = initializeApp(firebaseConfig);
  }
  return app;
};

export const getFirebaseAnalytics = async (): Promise<Analytics | null> => {
  if (analytics) return analytics;
  const supported = await isAnalyticsSupported();
  if (!supported) return null;
  analytics = getAnalytics(getFirebaseApp());
  return analytics;
};

export const getFirebaseAuth = (): Auth => {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }
  return auth;
};

export const getFirebaseFirestore = (): Firestore => {
  if (!firestore) {
    firestore = getFirestore(getFirebaseApp());
  }
  return firestore;
};

export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider("apple.com");
appleProvider.addScope("email");
appleProvider.addScope("name");

export const firebaseAuthHelpers = {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
};

export const firestoreHelpers = {
  collection,
  doc,
  getDoc,
  setDoc,
};

export type { User };
