"use client";

import { useEffect, useState } from "react";
import { auth } from "../lib/firebase";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";

export default function Home() {
  const [uid, setUid] = useState("");

  useEffect(() => {
    (async () => {
      await signInAnonymously(auth);
      const unsub = onAuthStateChanged(auth, (user) => {
        if (user) setUid(user.uid);
      });
      return () => unsub();
    })();
  }, []);

  return (
    <main style={{ padding: 40 }}>
      <h1>Firebase 연결 테스트</h1>
      <p>UID: {uid || "로그인 중..."}</p>
    </main>
  );
}