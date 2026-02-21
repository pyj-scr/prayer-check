"use client";

import { useMemo, useState } from "react";

type Lang = "jp" | "en";

const TEXT = {
  jp: {
    days: ["月", "火", "水", "木", "金", "土", "日"],
    title: "の祈りリスト",
    noTodo: "まだ祈り項目がありません。",
    noDone: "まだ完了した祈りはありません。",
    completedTitle: "叶えられた祈りリスト",
    addPrompt: "新しい祈りの内容を入力してください",
    completeButton: "今日の祈り完了",
    completeMessage: (day: string) => `${day} の祈りが完了しました。`,
    tuesdayNotify: "火曜日の担当者に通知を送りました。（デモ）",
  },
  en: {
    days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    title: "'s Prayer List",
    noTodo: "No prayer requests yet.",
    noDone: "No completed prayers yet.",
    completedTitle: "Answered Prayer List",
    addPrompt: "Enter a new prayer request",
    completeButton: "Mark Today's Prayer as Completed",
    completeMessage: (day: string) => `${day} prayer completed.`,
    tuesdayNotify: "Notification sent to Tuesday leader (demo).",
  },
};

type DayKey = 0 | 1 | 2 | 3 | 4 | 5 | 6;

type Item = { id: string; text: string };

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export default function PrayerRoom() {
  const [lang, setLang] = useState<Lang>("jp");
  const t = TEXT[lang];

  const userName = "Youngja";
  const [activeDay, setActiveDay] = useState<DayKey>(1);

  const [todoByDay, setTodoByDay] = useState<Record<DayKey, Item[]>>({
    0: [],
    1: [{ id: uid(), text: "健康" }],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
  });

  const [doneByDay, setDoneByDay] = useState<Record<DayKey, Item[]>>({
    0: [],
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
  });

  const [toast, setToast] = useState("");

  const activeTodo = todoByDay[activeDay];
  const activeDone = doneByDay[activeDay];

  function addItem() {
    const text = window.prompt(t.addPrompt);
    if (!text) return;
    const v = text.trim();
    if (!v) return;

    setTodoByDay((prev) => ({
      ...prev,
      [activeDay]: [...prev[activeDay], { id: uid(), text: v }],
    }));
  }

  function moveToDone(id: string) {
    const item = activeTodo.find((x) => x.id === id);
    if (!item) return;

    setTodoByDay((prev) => ({
      ...prev,
      [activeDay]: prev[activeDay].filter((x) => x.id !== id),
    }));
    setDoneByDay((prev) => ({
      ...prev,
      [activeDay]: [item, ...prev[activeDay]],
    }));
  }

  function completeToday() {
    if (activeDay === 1) {
      setToast(t.tuesdayNotify);
    } else {
      setToast(t.completeMessage(t.days[activeDay]));
    }
    setTimeout(() => setToast(""), 2200);
  }

  return (
    <main
      style={{
        padding: 16,
        maxWidth: 560,
        margin: "0 auto",
        color: "#000",
        background: "#fff",
        minHeight: "100vh",
        paddingBottom: 100,
      }}
    >
      {/* Language Toggle */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button onClick={() => setLang("jp")}>JP</button>
        <button onClick={() => setLang("en")}>EN</button>
      </div>

      <div style={{ border: "2px solid #000", borderRadius: 8, overflow: "hidden" }}>
        {/* Day Tabs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {t.days.map((d, idx) => (
            <button
              key={idx}
              onClick={() => setActiveDay(idx as DayKey)}
              style={{
                padding: "10px 0",
                fontWeight: 900,
                borderRight: "1px solid #000",
                borderBottom: "2px solid #000",
                background: activeDay === idx ? "#f2f2f2" : "#fff",
              }}
            >
              {d}
            </button>
          ))}
        </div>

        <div style={{ padding: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 900 }}>
            {userName}
            {t.title}
          </div>

          {/* Todo */}
          <div style={{ marginTop: 12 }}>
            {activeTodo.map((item) => (
              <div
                key={item.id}
                onClick={() => moveToDone(item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                  padding: "6px 0",
                }}
              >
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    border: "2px solid #000",
                  }}
                />
                <span style={{ fontSize: 18, fontWeight: 800 }}>{item.text}</span>
              </div>
            ))}
            {activeTodo.length === 0 && <div>{t.noTodo}</div>}
          </div>

          <button
            onClick={addItem}
            style={{
              width: 36,
              height: 36,
              borderRadius: 6,
              border: "1.5px solid #f3a6b6",
              background: "#ffe6ec", // 연한 핑크
              color: "#c2185b",
              fontSize: 20,
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 2px 0 #f3a6b6",
              transition: "all 0.1s ease",
              justifyContent: "center",
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = "translateY(1px)";
              e.currentTarget.style.boxShadow = "0 1px 0 #f3a6b6";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 0 #f3a6b6";
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.transform = "translateY(1px)";
              e.currentTarget.style.boxShadow = "0 1px 0 #f3a6b6";
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 0 #f3a6b6";
            }}
          >
            +
          </button>
          {/* Done */}
          <div style={{ marginTop: 24 }}>
            <div style={{ fontWeight: 900 }}>{t.completedTitle}</div>
            {activeDone.map((item) => (
              <div key={item.id} style={{ display: "flex", gap: 8 }}>
                <span>☑</span>
                <span>{item.text}</span>
              </div>
            ))}
            {activeDone.length === 0 && <div>{t.noDone}</div>}
          </div>
        </div>
      </div>

      {/* Fixed Complete Button */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 16,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <button
          onClick={completeToday}
          style={{
            width: "min(420px, 100%)",
            padding: 14,
            background: "#0f5a7a",
            color: "#fff",
            fontWeight: 900,
            borderRadius: 12,
          }}
        >
          {t.completeButton}
        </button>
      </div>

      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 80,
            left: 0,
            right: 0,
            textAlign: "center",
          }}
        >
          {toast}
        </div>
      )}
    </main>
  );
}