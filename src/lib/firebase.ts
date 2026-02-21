import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const app =
  getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);

const NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSyAagcgMID0mwPRetbbawDGSuETmxL-4IEo"
const NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="prayer-check-3efed.firebaseapp.com"
const NEXT_PUBLIC_FIREBASE_PROJECT_ID="prayer-check-3efed"
const EXT_PUBLIC_FIREBASE_STORAGE_BUCKET="prayer-check-3efed.firebasestorage.app"
const NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="941135202156"
const NEXT_PUBLIC_FIREBASE_APP_ID="1:941135202156:web:fbe6ec962818732a961549"