"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { onAuthStateChanged, signInAnonymously, type User } from "firebase/auth";
import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "../../../lib/firebase";

type Lang = "jp" | "en";
type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

const DAYS: { key: DayKey; jp: string; en: string }[] = [
  { key: "mon", jp: "月", en: "Mon" },
  { key: "tue", jp: "火", en: "Tue" },
  { key: "wed", jp: "水", en: "Wed" },
  { key: "thu", jp: "木", en: "Thu" },
  { key: "fri", jp: "金", en: "Fri" },
  { key: "sat", jp: "土", en: "Sat" },
  { key: "sun", jp: "日", en: "Sun" },
];

const TEXT = {
  jp: {
    needInvite: "招待リンクが必要です。招待URLから開いてください。",
    inviteUsed: "この招待リンクは既に使用されています。",
    roomFull: "参加上限に達しました（7名）。",
    titleSuffix: "の祈りリスト",
    completedTitle: "叶えられた祈りリスト",
    addPrompt: "新しい祈りの内容を入力してください",
    noTodo: "まだ祈り項目がありません。",
    noDone: "まだ完了した祈りはありません。",
    completeButton: "今日の祈り完了",
    completeToastTue: "火曜日の担当者に通知（デモ）を表示しました。",
    completeToast: (d: string) => `${d} の祈りが完了しました。`,
    saving: "読み込み中...",
  },
  en: {
    needInvite: "Invite link is required. Please open the invite URL.",
    inviteUsed: "This invite link is already used.",
    roomFull: "Room is full (7 members).",
    titleSuffix: "'s Prayer List",
    completedTitle: "Answered Prayer List",
    addPrompt: "Enter a new prayer request",
    noTodo: "No prayer requests yet.",
    noDone: "No completed prayers yet.",
    completeButton: "Mark Today's Prayer as Completed",
    completeToastTue: "Displayed a notification to Tuesday leader (demo).",
    completeToast: (d: string) => `${d} prayer completed.`,
    saving: "Loading...",
  },
};

type ItemDoc = {
  text: string;
  done: boolean;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  doneAt?: Timestamp | null;
};

function dayLabel(lang: Lang, day: DayKey) {
  const d = DAYS.find((x) => x.key === day)!;
  return lang === "jp" ? d.jp : d.en;
}

export default function RoomPage() {
  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId;

  const search = useSearchParams();
  const inviteId = (search.get("invite") ?? "").trim(); // 초대 링크 파라미터

  const [lang, setLang] = useState<Lang>("jp");
  const t = TEXT[lang];

  const [activeDay, setActiveDay] = useState<DayKey>("tue");
  const [toast, setToast] = useState("");

  const [user, setUser] = useState<User | null>(null);
  const uid = user?.uid ?? "";

  const [joined, setJoined] = useState<boolean>(false);
  const [joiningError, setJoiningError] = useState<string>("");

  const [nickname, setNickname] = useState<string>("");
  const [nicknameInput, setNicknameInput] = useState<string>("");

  const [todo, setTodo] = useState<{ id: string; data: ItemDoc }[]>([]);
  const [done, setDone] = useState<{ id: string; data: ItemDoc }[]>([]);
  const [loadingItems, setLoadingItems] = useState<boolean>(true);

  // 1) 익명 로그인
  useEffect(() => {
    signInAnonymously(auth).catch(() => {});
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  // 2) 닉네임 로컬 저장 로드
  useEffect(() => {
    if (!roomId) return;
    const key = `prayer:${roomId}:nickname`;
    const saved = localStorage.getItem(key);
    if (typeof saved === "string" && saved.trim()) {
      setNickname(saved.trim());
      setNicknameInput(saved.trim());
    }
  }, [roomId]);

  // 3) 가입 처리: 이미 member면 OK / 아니면 invite로 1회 가입(7명 제한)
  useEffect(() => {
    if (!db || !roomId || !uid) return;

    (async () => {
      setJoiningError("");
      setJoined(false);

      const memberRef = doc(db, "rooms", roomId, "members", uid);
      const memberSnap = await getDoc(memberRef);

      // 이미 가입된 유저면 invite 없어도 OK
      if (memberSnap.exists()) {
        const nn = String(memberSnap.data().nickname ?? "");
        if (nn && !nickname) {
          setNickname(nn);
          setNicknameInput(nn);
        }
        setJoined(true);
        return;
      }

      // 아직 가입 안 된 유저 → invite 필수
      if (!inviteId) {
        setJoiningError(t.needInvite);
        return;
      }

      const inviteRef = doc(db, "rooms", roomId, "invites", inviteId);

      try {
        await runTransaction(db, async (tx) => {
          const invSnap = await tx.get(inviteRef);
          if (!invSnap.exists()) throw new Error("INVITE_NOT_FOUND");

          const claimedBy = invSnap.data().claimedBy ?? null;

          // 다른 사람이 이미 사용
          if (claimedBy && claimedBy !== uid) throw new Error("INVITE_USED");

          // 내가 아직 선점 안 했으면 선점
          if (!claimedBy) {
            tx.update(inviteRef, { claimedBy: uid, claimedAt: Timestamp.now() });
          }

          // members 생성 (닉네임은 나중에 저장해도 되지만 일단 빈값으로 생성)
          tx.set(
            memberRef,
            {
              nickname: nickname || "",
              inviteId,
              joinedAt: Timestamp.now(),
            },
            { merge: true }
          );
        });

        setJoined(true);
      } catch (e: any) {
        const msg =
          e?.message === "INVITE_USED"
            ? t.inviteUsed
            : e?.message === "INVITE_NOT_FOUND"
            ? t.needInvite
            : t.roomFull;
        setJoiningError(msg);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, uid]);

  // 4) 아이템 실시간 로드 (joined 된 경우에만)
  useEffect(() => {
    if (!db || !roomId || !uid || !joined) return;

    setLoadingItems(true);

    const itemsCol = collection(db, "rooms", roomId, "days", activeDay, "users", uid, "items");
    const qy = query(itemsCol, orderBy("createdAt", "asc"));

    const unsub = onSnapshot(
      qy,
      (qs) => {
        const all: { id: string; data: ItemDoc }[] = [];
        qs.forEach((d) => all.push({ id: d.id, data: d.data() as ItemDoc }));

        setTodo(all.filter((x) => !x.data.done));
        setDone(all.filter((x) => !!x.data.done).reverse()); // 최신 완료가 위로
        setLoadingItems(false);
      },
      () => setLoadingItems(false)
    );

    return () => unsub();
  }, [roomId, uid, joined, activeDay]);

  async function saveNickname() {
    const nn = nicknameInput.trim();
    if (!nn) return;

    const key = `prayer:${roomId}:nickname`;
    localStorage.setItem(key, nn);
    setNickname(nn);

    if (!db || !uid) return;

    // members에 닉네임 저장
    await setDoc(
      doc(db, "rooms", roomId, "members", uid),
      { nickname: nn, updatedAt: serverTimestamp() },
      { merge: true }
    );
  }

  async function addItem() {
    if (!db || !uid || !joined) return;

    const text = window.prompt(t.addPrompt);
    if (!text) return;
    const v = text.trim();
    if (!v) return;

    const itemsCol = collection(db, "rooms", roomId, "days", activeDay, "users", uid, "items");
    await addDoc(itemsCol, {
      text: v,
      done: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      doneAt: null,
    });
  }

  async function markDone(itemId: string) {
    if (!db || !uid || !joined) return;
    const ref = doc(db, "rooms", roomId, "days", activeDay, "users", uid, "items", itemId);
    await updateDoc(ref, {
      done: true,
      doneAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  async function undoDone(itemId: string) {
    if (!db || !uid || !joined) return;
    const ref = doc(db, "rooms", roomId, "days", activeDay, "users", uid, "items", itemId);
    await updateDoc(ref, {
      done: false,
      doneAt: null,
      updatedAt: serverTimestamp(),
    });
  }

  function completeToday() {
    // 이번 단계는 토스트(알림 기능은 다음 단계에서 확장)
    if (activeDay === "tue") {
      setToast(t.completeToastTue);
    } else {
      setToast(t.completeToast(dayLabel(lang, activeDay)));
    }
    window.setTimeout(() => setToast(""), 2200);
  }

  // UI
  const userName = nickname || "User";

  return (
    <main
      style={{
        padding: 12,
        maxWidth: 560,
        margin: "0 auto",
        color: "#000",
        background: "#fff",
        minHeight: "100vh",
        paddingBottom: 110, // 하단 고정 버튼 공간
      }}
    >
      {/* Lang toggle */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 8 }}>
        <button
          onClick={() => setLang("jp")}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid #000",
            background: lang === "jp" ? "#f2f2f2" : "#fff",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          JP
        </button>
        <button
          onClick={() => setLang("en")}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid #000",
            background: lang === "en" ? "#f2f2f2" : "#fff",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          EN
        </button>
      </div>

      {/* join gate */}
      {joiningError && (
        <div
          style={{
            border: "2px solid #000",
            borderRadius: 10,
            padding: 14,
            background: "#fff",
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 18 }}>Access denied</div>
          <div style={{ marginTop: 8 }}>{joiningError}</div>
        </div>
      )}

      {!joiningError && (
        <div style={{ border: "2px solid #000", background: "#fff", borderRadius: 8, overflow: "hidden" }}>
          {/* Day tabs sticky */}
          <div style={{ position: "sticky", top: 0, zIndex: 10, background: "#fff" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
              {DAYS.map((d, idx) => {
                const active = d.key === activeDay;
                const isLast = idx === DAYS.length - 1;
                return (
                  <button
                    key={d.key}
                    onClick={() => setActiveDay(d.key)}
                    style={{
                      padding: "10px 0",
                      fontWeight: 900,
                      fontSize: 16,
                      borderRight: isLast ? "none" : "2px solid #000",
                      borderBottom: "2px solid #000",
                      background: active ? "#f2f2f2" : "#fff",
                      cursor: "pointer",
                    }}
                  >
                    {lang === "jp" ? d.jp : d.en}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ padding: 16 }}>
            {/* nickname */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
              <input
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                placeholder={lang === "jp" ? "ニックネーム" : "Nickname"}
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid #000",
                  fontSize: 16,
                }}
              />
              <button
                onClick={saveNickname}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #000",
                  background: "#111",
                  color: "#fff",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {lang === "jp" ? "保存" : "Save"}
              </button>
            </div>

            {/* title */}
            <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 12 }}>
              {userName}
              {t.titleSuffix}
            </div>

            {/* todo + add */}
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                {loadingItems && <div style={{ opacity: 0.8 }}>{t.saving}</div>}

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {todo.map((x) => (
                    <button
                      key={x.id}
                      onClick={() => markDone(x.id)}
                      style={{
                        textAlign: "left",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "8px 6px",
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                      }}
                      title="tap to mark done"
                    >
                      <span
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 999,
                          border: "2px solid #000",
                          display: "inline-block",
                          flex: "0 0 auto",
                        }}
                      />
                      <span style={{ fontSize: 18, fontWeight: 800, color: "#000" }}>{x.data.text}</span>
                    </button>
                  ))}
                  {!loadingItems && todo.length === 0 && <div style={{ opacity: 0.85 }}>{t.noTodo}</div>}
                </div>
              </div>

              {/* + button: small square, light pink */}
              <button
                onClick={addItem}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 6,
                  border: "1.5px solid #f3a6b6",
                  background: "#ffe6ec",
                  color: "#c2185b",
                  fontSize: 20,
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "0 2px 0 #f3a6b6",
                }}
                aria-label="Add"
                title="Add"
              >
                +
              </button>
            </div>

            {/* done list */}
            <div style={{ marginTop: 26 }}>
              <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>{t.completedTitle}</div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {done.map((x) => (
                  <button
                    key={x.id}
                    onClick={() => undoDone(x.id)}
                    style={{
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "8px 6px",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                    }}
                    title="tap to undo"
                  >
                    <span style={{ width: 20, display: "inline-block", fontSize: 20, flex: "0 0 auto" }}>☑</span>
                    <span style={{ fontSize: 18, fontWeight: 800, color: "#000" }}>{x.data.text}</span>
                  </button>
                ))}
                {!loadingItems && done.length === 0 && <div style={{ opacity: 0.85 }}>{t.noDone}</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* fixed bottom button */}
      {!joiningError && (
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 14,
            display: "flex",
            justifyContent: "center",
            padding: "0 12px",
            zIndex: 20,
            pointerEvents: "none",
          }}
        >
          <button
            onClick={completeToday}
            style={{
              pointerEvents: "auto",
              width: "min(420px, 100%)",
              padding: "16px 12px",
              borderRadius: 14,
              border: "2px solid #0a3a52",
              background: "#0f5a7a",
              color: "#fff",
              fontSize: 18,
              fontWeight: 900,
              cursor: "pointer",
              boxShadow: "0 6px 0 rgba(0,0,0,0.22)",
            }}
          >
            {t.completeButton}
          </button>
        </div>
      )}

      {/* toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 86,
            display: "flex",
            justifyContent: "center",
            pointerEvents: "none",
            zIndex: 30,
          }}
        >
          <div
            style={{
              background: "#111",
              color: "#fff",
              padding: "10px 14px",
              borderRadius: 999,
              opacity: 0.95,
              maxWidth: 560,
              margin: "0 16px",
            }}
          >
            {toast}
          </div>
        </div>
      )}
    </main>
  );
}