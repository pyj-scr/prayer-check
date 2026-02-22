import { initializeApp, getApps, getApp } from "firebase/app";
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

// ✅ 서버에서는 Firebase Auth/Firestore를 만들지 않음 (빌드/프리렌더 에러 방지)
const isBrowser = typeof window !== "undefined";

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// 아래 두 개는 브라우저에서만
export const auth = isBrowser ? getAuth(app) : (null as any);
export const db = isBrowser ? getFirestore(app) : (null as any);