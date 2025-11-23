import { useEffect, useMemo, useState } from "react";

const TASKS = [
  { key: "piano", label: "ピアノ", type: "daily" },
  { key: "solfege", label: "視唱", type: "daily" },
  { key: "study", label: "座学", type: "daily" },
  { key: "vocal", label: "歌", type: "alt" },
  { key: "conducting", label: "指揮の譜読み", type: "alt" },
];

const LS_KEY = "logs_v1";

const todayStr = () => new Date().toISOString().slice(0, 10);
const addDays = (dStr, delta) => {
  const d = new Date(dStr);
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
};

function loadLogs() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveLogs(logs) {
  localStorage.setItem(LS_KEY, JSON.stringify(logs));
}

function ensureDay(logs, date) {
  const found = logs.find((l) => l.date === date);
  if (found) return found;
  const fresh = {
    date,
    piano: 0,
    solfege: 0,
    study: 0,
    vocal: 0,
    conducting: 0,
  };
  logs.push(fresh);
  logs.sort((a, b) => a.date.localeCompare(b.date));
  return fresh;
}

function isDailyDone(day) {
  return day.piano > 0 && day.solfege > 0 && day.study > 0;
}

function isAltDone(day, prevDay) {
  const todayAlt = day.vocal > 0 || day.conducting > 0;
  const prevAlt = prevDay
    ? prevDay.vocal > 0 || prevDay.conducting > 0
    : false;
  return todayAlt || prevAlt;
}

function isAllDone(day, prevDay) {
  return isDailyDone(day) && isAltDone(day, prevDay);
}

function calcStreak(sortedLogs) {
  let streak = 0;
  for (let i = sortedLogs.length - 1; i >= 0; i--) {
    const day = sortedLogs[i];
    const prev = i > 0 ? sortedLogs[i - 1] : null;
    if (isAllDone(day, prev)) streak++;
    else break;
  }
  return streak;
}

function dayColor(day, prevDay) {
  if (!day) return "#eee";
  if (isAllDone(day, prevDay)) return "#b8f2c2"; // 緑
  if (
    day.piano +
      day.solfege +
      day.study +
      day.vocal +
      day.conducting >
    0
  )
    return "#f7c0c0"; // 赤
  return "#eee"; // グレー
}

export default function App() {
  const [logs, setLogs] = useState([]);
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [tab, setTab] = useState("home");
  const [inputMins, setInputMins] = useState(30);

  useEffect(() => {
    const l = loadLogs();
    ensureDay(l, todayStr());
    saveLogs(l);
    setLogs(l);
  }, []);

  const sortedLogs = useMemo(
    () => [...logs].sort((a, b) => a.date.localeCompare(b.date)),
    [logs]
  );

  const selected = useMemo(() => {
    const l = [...logs];
    return ensureDay(l, selectedDate);
  }, [logs, selectedDate]);

  const prevSelected = useMemo(() => {
    const prevDate = addDays(selectedDate, -1);
    return logs.find((l) => l.date === prevDate) || null;
  }, [logs, selectedDate]);

  const streak = useMemo(() => calcStreak(sortedLogs), [sortedLogs]);

  const totalToday = TASKS.reduce(
    (s, t) => s + (selected[t.key] || 0),
    0
  );

  function addMinutes(taskKey, mins) {
    const next = [...logs];
    const day = ensureDay(next, selectedDate);
    day[taskKey] += mins;
    saveLogs(next);
    setLogs(next);
  }

  const calDates = useMemo(() => {
    const base = new Date(selectedDate);
    base.setDate(1);
    const start = base.toISOString().slice(0, 10);
    const daysInMonth = new Date(
      base.getFullYear(),
      base.getMonth() + 1,
      0
    ).getDate();
    return Array.from({ length: daysInMonth }, (_, i) =>
      addDays(start, i)
    );
  }, [selectedDate]);

  const allDoneToday = isAllDone(selected, prevSelected);

  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        background: "white",
        minHeight: "100vh",
        padding: "16px",
        color: "#111",
        maxWidth: 520,
        margin: "0 auto",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h1 style={{ fontSize: 22, margin: 0 }}>音楽家への道</h1>
        <div style={{ fontSize: 14 }}>
          連続達成: <b>{streak}日</b>
        </div>
      </header>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button
          onClick={() => setTab("home")}
          style={{
            flex: 1,
            padding: 10,
            borderRadius: 12,
            border: "1px solid #ddd",
            background: tab === "home" ? "#111" : "#fff",
            color: tab === "home" ? "#fff" : "#111",
          }}
        >
          今日
        </button>
        <button
          onClick={() => setTab("cal")}
          style={{
            flex: 1,
            padding: 10,
            borderRadius: 12,
            border: "1px solid #ddd",
            background: tab === "cal" ? "#111" : "#fff",
            color: tab === "cal" ? "#fff" : "#111",
          }}
        >
          カレンダー
        </button>
      </div>

      {tab === "home" && (
        <main style={{ marginTop: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: 12, color: "#666" }}>日付</div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  fontSize: 16,
                  padding: 6,
                  borderRadius: 8,
                  border: "1px solid #ddd",
                }}
              />
            </div>

            <div
              style={{
                padding: "8px 12px",
                borderRadius: 12,
                background: allDoneToday ? "#e8fff0" : "#fff4f4",
                border: "1px solid #eee",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 12, color: "#666" }}>今日の合計</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                {totalToday} 分
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 14,
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 14, color: "#666" }}>
              追加する時間
            </span>
            <input
              type="number"
              min={1}
              value={inputMins}
              onChange={(e) => setInputMins(Number(e.target.value))}
              style={{
                width: 80,
                padding: 6,
                borderRadius: 8,
                border: "1px solid #ddd",
              }}
            />
            <span style={{ fontSize: 14, color: "#666" }}>分</span>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {TASKS.map((t) => (
              <div
                key={t.key}
                style={{
                  border: "1px solid #eee",
                  borderRadius: 14,
                  padding: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                }}
              >
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>
                    {t.label}
                  </div>
                  <div style={{ fontSize: 12, color: "#666" }}>
                    {t.type === "daily" ? "毎日必須" : "2日に1回必須"}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      fontSize: 16,
                      width: 70,
                      textAlign: "right",
                    }}
                  >
                    {selected[t.key]}分
                  </div>
                  <button
                    onClick={() => addMinutes(t.key, inputMins)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: "1px solid #ddd",
                      background: "#fff",
                    }}
                  >
                    +{inputMins}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 12,
              border: "1px dashed #ddd",
            }}
          >
            {allDoneToday ? (
              <div style={{ fontWeight: 700 }}>
                いえーーい！！全部達成！！🎉
              </div>
            ) : (
              <div style={{ fontWeight: 700 }}>まだ地獄の入口にいる…🔥</div>
            )}

            <div
              style={{
                fontSize: 13,
                color: "#666",
                marginTop: 6,
              }}
            >
              毎日必須: ピアノ/視唱/座学  
              2日に1回必須: 歌 or 指揮（直近2日どっちかやってればOK）
            </div>
          </div>
        </main>
      )}

      {tab === "cal" && (
        <main style={{ marginTop: 16 }}>
          <div
            style={{
              fontSize: 14,
              color: "#666",
              marginBottom: 8,
            }}
          >
            月の達成状況（タップで日付移動）
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 6,
            }}
          >
            {calDates.map((d, idx) => {
              const day = logs.find((l) => l.date === d) || null;
              const prev =
                logs.find((l) => l.date === addDays(d, -1)) || null;
              return (
                <button
                  key={d}
                  onClick={() => {
                    setSelectedDate(d);
                    setTab("home");
                  }}
                  style={{
                    height: 44,
                    borderRadius: 10,
                    border:
                      d === todayStr()
                        ? "2px solid #111"
                        : "1px solid #eee",
                    background: dayColor(day, prev),
                    fontSize: 12,
                  }}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div
            style={{
              marginTop: 12,
              fontSize: 12,
              color: "#666",
            }}
          >
            緑=全部達成 / 赤=何かやったけど未達 / 灰=記録なし
          </div>
        </main>
      )}
    </div>
  );
}
