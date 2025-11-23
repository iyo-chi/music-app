import { useState, useEffect, useRef } from "react";
import "./theme.css";

// ======================
// タスク定義
// ======================
const TASKS = [
  { key: "piano", label: "ピアノ", type: "daily", xpKey: "basicXp", lvKey: "basicLv" },
  { key: "solfege", label: "視唱", type: "daily", xpKey: "basicXp", lvKey: "basicLv" },
  { key: "study", label: "座学", type: "daily", xpKey: "basicXp", lvKey: "basicLv" },
  { key: "vocal", label: "歌", type: "alt", xpKey: "vocalXp", lvKey: "vocalLv" },
  { key: "conducting", label: "指揮の譜読み", type: "alt", xpKey: "condXp", lvKey: "condLv" },
];

const todayStr = () => new Date().toISOString().slice(0, 10);

const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x.toISOString().slice(0, 10);
};

const emptyDay = (date) => ({
  date,
  piano: 0,
  solfege: 0,
  study: 0,
  vocal: 0,
  conducting: 0,
  details: [], // [{type,title,mins,id,at}]
});

const emptyLevels = () => ({
  basicXp: 0, basicLv: 1,
  vocalXp: 0, vocalLv: 1,
  condXp: 0, condLv: 1,
});

const needXp = (lv) => lv * 100;

// ======================
// localStorage
// ======================
const load = (k, d) => {
  try {
    return JSON.parse(localStorage.getItem(k)) ?? d;
  } catch {
    return d;
  }
};
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

// ======================
// 達成判定
// ======================
const isDailyDone = (day) =>
  (day.piano || 0) > 0 && (day.solfege || 0) > 0 && (day.study || 0) > 0;

const isAltDone = (day, prev) => {
  const okToday = (day.vocal || 0) > 0 || (day.conducting || 0) > 0;
  const okPrev = prev ? (prev.vocal || 0) > 0 || (prev.conducting || 0) > 0 : false;
  return okToday || okPrev;
};

const dayColorClass = (day, prev) => {
  if (!day) return "day-none";
  if (isDailyDone(day) && isAltDone(day, prev)) return "day-good";

  const sum =
    (day.piano || 0) +
    (day.solfege || 0) +
    (day.study || 0) +
    (day.vocal || 0) +
    (day.conducting || 0);

  if (sum > 0) return "day-bad";
  return "day-none";
};

// ======================
// 時間表示
// ======================
const fmtHMS = (sec) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const secToMins = (sec) => {
  const mins = sec / 60;
  return Math.round(mins * 10) / 10; // 小数1位
};

export default function App() {
  // ======================
  // state
  // ======================
  const [logs, setLogs] = useState({});
  const [levels, setLevels] = useState(emptyLevels());

  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [tab, setTab] = useState("home");

  const [inputMins, setInputMins] = useState(30);
  const [inputTitle, setInputTitle] = useState("");

  // timer
  const [timerTask, setTimerTask] = useState("piano");
  const [timerDate, setTimerDate] = useState(todayStr());
  const [running, setRunning] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const tickRef = useRef(null);

  // ======================
  // 初回ロード
  // ======================
  useEffect(() => {
    const l = load("logs_v2", {});
    const lv = load("levels_v2", emptyLevels());

    if (!l[todayStr()]) l[todayStr()] = emptyDay(todayStr());

    setLogs(l);
    setLevels(lv);
  }, []);

  // 選択日がなければ生成
  useEffect(() => {
    if (!logs[selectedDate]) {
      const newLogs = { ...logs, [selectedDate]: emptyDay(selectedDate) };
      updateLogs(newLogs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const day = logs[selectedDate] ?? emptyDay(selectedDate);

  // ======================
  // 保存ラッパ
  // ======================
  const updateLogs = (newLogs) => {
    setLogs(newLogs);
    save("logs_v2", newLogs);
  };

  const updateLevels = (newLevels) => {
    setLevels(newLevels);
    save("levels_v2", newLevels);
  };

  // ======================
  // XP加算/減算
  // ======================
  const addXp = (taskKey, diff) => {
    const t = TASKS.find((x) => x.key === taskKey);
    if (!t) return;

    const xpKey = t.xpKey;
    const lvKey = t.lvKey;

    const curXp = levels[xpKey] ?? 0;
    const curLv = levels[lvKey] ?? 1;

    let nxtXp = curXp + diff;
    let nxtLv = curLv;

    // レベルアップ
    while (nxtXp >= needXp(nxtLv)) {
      nxtXp -= needXp(nxtLv);
      nxtLv += 1;
    }
    // レベルダウン（diffマイナスの時）
    while (nxtXp < 0 && nxtLv > 1) {
      nxtLv -= 1;
      nxtXp += needXp(nxtLv);
    }

    nxtXp = Math.max(0, nxtXp);

    updateLevels({ ...levels, [xpKey]: nxtXp, [lvKey]: nxtLv });
  };

  // ======================
  // 手動 ＋
  // ======================
  const addMinutes = (taskKey, minsArg, titleArg, dateArg) => {
    const mins = minsArg ?? (inputMins > 0 ? inputMins : 30);
    const date = dateArg ?? selectedDate;

    const newLogs = { ...logs };
    const d = newLogs[date] ?? emptyDay(date);

    d[taskKey] = (d[taskKey] ?? 0) + mins;

    d.details = [
      ...(d.details ?? []),
      {
        type: taskKey,
        title:
          titleArg ||
          inputTitle ||
          TASKS.find((t) => t.key === taskKey).label,
        mins,
        id: Math.random().toString(36).slice(2),
        at: Date.now(),
      },
    ];

    newLogs[date] = d;
    updateLogs(newLogs);
    addXp(taskKey, mins);
    setInputTitle("");
  };

  // ======================
  // 手動 −
  // ======================
  const subMinutes = (taskKey) => {
    const mins = inputMins > 0 ? inputMins : 30;

    const newLogs = { ...logs };
    const d = newLogs[selectedDate] ?? emptyDay(selectedDate);

    const before = d[taskKey] ?? 0;
    const actual = Math.min(before, mins);

    d[taskKey] = before - actual;

    // detailsから最後の1件を削る
    const idx = d.details.slice().reverse().findIndex((x) => x.type === taskKey);
    if (idx !== -1) {
      const realIndex = d.details.length - 1 - idx;
      d.details.splice(realIndex, 1);
    }

    newLogs[selectedDate] = d;
    updateLogs(newLogs);
    addXp(taskKey, -actual);
  };

  // ======================
  // ★ 本日分リセット（XPも戻す）
  // ======================
  const resetTodayFull = () => {
    if (!window.confirm("本日分の記録をリセットしますか？（XPも元に戻します）")) return;

    const before = logs[selectedDate];
    if (!before) return;

    // 使った分だけXPを引き戻す
    let lv = { ...levels };

    TASKS.forEach((t) => {
      const used = before[t.key] ?? 0;
      if (used <= 0) return;

      const xpKey = t.xpKey;
      const lvKey = t.lvKey;

      let curXp = lv[xpKey] ?? 0;
      let curLv = lv[lvKey] ?? 1;

      curXp -= used;

      while (curXp < 0 && curLv > 1) {
        curLv -= 1;
        curXp += needXp(curLv);
      }
      if (curXp < 0) curXp = 0;

      lv[xpKey] = curXp;
      lv[lvKey] = curLv;
    });

    const newLogs = { ...logs, [selectedDate]: emptyDay(selectedDate) };
    updateLogs(newLogs);
    updateLevels(lv);
  };

  // ======================
  // ★ 全部リセット（ログ＆レベル）
  // ======================
  const resetAll = () => {
    if (!window.confirm("全部リセットしますか？（ログもレベルも全部消えます）")) return;

    const freshLogs = { [todayStr()]: emptyDay(todayStr()) };
    const freshLevels = emptyLevels();

    updateLogs(freshLogs);
    updateLevels(freshLevels);

    setSelectedDate(todayStr());
    setTimerDate(todayStr());
    setElapsedSec(0);
    setRunning(false);
    setTab("home");
  };

  // ======================
  // タイマー進行
  // ======================
  useEffect(() => {
    if (running) {
      tickRef.current = setInterval(() => {
        setElapsedSec((s) => s + 1);
      }, 1000);
    } else {
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = null;
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [running]);

  const startTimer = () => setRunning(true);
  const pauseTimer = () => setRunning(false);
  const resetTimer = () => {
    setRunning(false);
    setElapsedSec(0);
  };

  const commitTimer = () => {
    const mins = secToMins(elapsedSec);
    if (mins <= 0) {
      alert("計測が短すぎる！もうちょい測ってから保存しよ");
      return;
    }

    addMinutes(timerTask, mins, "タイマー記録", timerDate);

    setSelectedDate(timerDate);
    resetTimer();
    setTab("home");
  };

  // ======================
  // 集計
  // ======================
  const sortedLogs = Object.values(logs).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  const streak = (() => {
    let s = 0;
    for (let i = sortedLogs.length - 1; i >= 0; i--) {
      const d = sortedLogs[i];
      const prev = i > 0 ? sortedLogs[i - 1] : null;
      if (isDailyDone(d) && isAltDone(d, prev)) s++;
      else break;
    }
    return s;
  })();

  const totalToday = TASKS.reduce((sum, t) => sum + (day[t.key] || 0), 0);
  const totalAll = sortedLogs.reduce((sum, d) => {
    return sum + TASKS.reduce((s, t) => s + (d[t.key] || 0), 0);
  }, 0);

  const getBar = (xpKey, lvKey) => {
    const xp = levels[xpKey] ?? 0;
    const lv = levels[lvKey] ?? 1;
    const req = needXp(lv);
    const pct = Math.min(100, Math.floor((xp / req) * 100));
    return { xp, lv, req, pct };
  };

  const basic = getBar("basicXp", "basicLv");
  const vocal = getBar("vocalXp", "vocalLv");
  const cond = getBar("condXp", "condLv");

  // ======================
  // カレンダー表示
  // ======================
  const base = new Date(selectedDate);
  base.setDate(1);
  const start = base.toISOString().slice(0, 10);
  const daysInMonth = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  const calDates = Array.from({ length: daysInMonth }, (_, i) => addDays(start, i));

  // ======================
  // UI
  // ======================
  return (
    <div className="app-wrap">
      {/* ヘッダー */}
      <header className="app-header">
        <h1 className="app-title">音楽家への道 🎼</h1>
        <div className="app-streak">
          連続達成：<b>{streak}日</b>
        </div>
      </header>

      {/* レベルバー */}
      <div className="level-section">
        <div className="level-label">基礎 Lv {basic.lv}（{basic.xp}/{basic.req}）</div>
        <div className="progress-bar">
          <div className="progress-fill basic-fill" style={{ width: basic.pct + "%" }} />
        </div>
      </div>

      <div className="level-section">
        <div className="level-label">表現 Lv {vocal.lv}（{vocal.xp}/{vocal.req}）</div>
        <div className="progress-bar">
          <div className="progress-fill vocal-fill" style={{ width: vocal.pct + "%" }} />
        </div>
      </div>

      <div className="level-section">
        <div className="level-label">指揮 Lv {cond.lv}（{cond.xp}/{cond.req}）</div>
        <div className="progress-bar">
          <div className="progress-fill cond-fill" style={{ width: cond.pct + "%" }} />
        </div>
      </div>

      {/* 合計＆全体リセット */}
      <div className="card row-between">
        <div style={{ fontSize: 14 }}>
          合計：<b>{totalAll}分</b>
        </div>
        <button className="btn btn-danger" onClick={resetAll}>
          全部リセット
        </button>
      </div>

      {/* タブ */}
      <div className="tab-row">
        <button className={`tab ${tab === "home" ? "tab-active" : ""}`} onClick={() => setTab("home")}>
          今日
        </button>
        <button className={`tab ${tab === "timer" ? "tab-active" : ""}`} onClick={() => setTab("timer")}>
          タイマー
        </button>
        <button className={`tab ${tab === "cal" ? "tab-active" : ""}`} onClick={() => setTab("cal")}>
          カレンダー
        </button>
        <button className={`tab ${tab === "dash" ? "tab-active" : ""}`} onClick={() => setTab("dash")}>
          日別詳細
        </button>
      </div>

      {/* ======================
          HOME
      ====================== */}
      {tab === "home" && (
        <main style={{ marginTop: 16 }}>
          {/* 日付＆今日の合計 */}
          <div className="card row-between">
            <div style={{ flex: 1, marginRight: 8 }}>
              <div className="label-muted">日付</div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div style={{ minWidth: 120 }}>
              <div className="label-muted">今日の合計</div>
              <div style={{ fontSize: 20, fontWeight: 900 }}>{totalToday}分</div>
            </div>
          </div>

          {/* 本日分リセット（XPも戻す） */}
          <button
            className="btn btn-ghost"
            style={{ width: "100%", marginTop: 10 }}
            onClick={resetTodayFull}
          >
            本日分の記録をリセット
          </button>

          {/* 入力 */}
          <div className="card">
            <div style={{ fontWeight: 900 }}>追加/削除する時間（分）</div>
            <input
              type="number"
              step={0.1}
              min={0.1}
              value={inputMins}
              onChange={(e) => setInputMins(Number(e.target.value) || 30)}
              style={{ marginTop: 6 }}
            />
          </div>

          <div className="card">
            <div style={{ fontWeight: 900 }}>曲 / 教材名（任意）</div>
            <input
              placeholder="例：ハノン1番 / Ave Maria / 指揮3小節目"
              value={inputTitle}
              onChange={(e) => setInputTitle(e.target.value)}
              style={{ marginTop: 6 }}
            />
          </div>

          {/* タスクリスト */}
          {TASKS.map((t) => (
            <div key={t.key} className="card row-between">
              <div>
                <div style={{ fontSize: 16, fontWeight: 900 }}>{t.label}</div>
                <div className="label-muted">
                  {t.type === "daily" ? "毎日必須" : "2日に1回"}
                </div>
              </div>

              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <div style={{ width: 70, textAlign: "right", fontWeight: 900 }}>
                  {day[t.key] || 0}分
                </div>
                <button className="btn btn-ghost" onClick={() => subMinutes(t.key)}>
                  −{inputMins}
                </button>
                <button className="btn" onClick={() => addMinutes(t.key)}>
                  +{inputMins}
                </button>
              </div>
            </div>
          ))}
        </main>
      )}

      {/* ======================
          TIMER
      ====================== */}
      {tab === "timer" && (
        <main style={{ marginTop: 16 }}>
          <div className="card">
            <div style={{ fontWeight: 900 }}>記録する日付</div>
            <input
              type="date"
              value={timerDate}
              onChange={(e) => setTimerDate(e.target.value)}
              style={{ marginTop: 6 }}
            />
          </div>

          <div className="card">
            <div style={{ fontWeight: 900 }}>練習項目</div>
            <select
              value={timerTask}
              onChange={(e) => setTimerTask(e.target.value)}
              style={{ marginTop: 6 }}
            >
              {TASKS.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="card" style={{ textAlign: "center" }}>
            <div className="label-muted">経過時間</div>
            <div style={{ fontSize: 40, fontWeight: 900 }}>
              {fmtHMS(elapsedSec)}
            </div>
            <div className="label-muted" style={{ marginTop: 6 }}>
              保存すると {secToMins(elapsedSec)} 分として記録
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12 }}>
              {!running ? (
                <button className="btn" onClick={startTimer}>スタート</button>
              ) : (
                <button className="btn" onClick={pauseTimer}>一時停止</button>
              )}
              <button className="btn btn-ghost" onClick={resetTimer}>リセット</button>
            </div>

            <button className="btn" style={{ marginTop: 12 }} onClick={commitTimer}>
              終了して保存（{secToMins(elapsedSec)}分）
            </button>
          </div>
        </main>
      )}

      {/* ======================
          CALENDAR
      ====================== */}
      {tab === "cal" && (
        <main style={{ marginTop: 16 }}>
          <div className="label-muted" style={{ marginBottom: 8 }}>
            月の達成状況（タップで日別詳細へ）
          </div>

          <div className="calendar-grid">
            {calDates.map((d, i) => {
              const dayObj = logs[d];
              const prev = logs[addDays(d, -1)];
              const cl = dayColorClass(dayObj, prev);

              return (
                <button
                  key={d}
                  className={`calendar-day ${cl}`}
                  onClick={() => {
                    setSelectedDate(d);
                    setTab("dash");
                  }}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          <div className="note">
            緑＝全部達成 / 赤＝何かしたが未達 / 灰＝なし
          </div>
        </main>
      )}

      {/* ======================
          DASH（日別詳細）
      ====================== */}
      {tab === "dash" && (
        <main style={{ marginTop: 16 }}>
          <div className="card">
            <div className="row-between">
              <button className="btn btn-ghost" onClick={() => setSelectedDate(addDays(selectedDate, -1))}>
                ← 前日
              </button>

              <div style={{ textAlign: "center" }}>
                <div className="label-muted">日別詳細</div>
                <div style={{ fontSize: 18, fontWeight: 900 }}>{selectedDate}</div>
                <div className="label-muted">合計 {totalToday}分</div>
              </div>

              <button className="btn btn-ghost" onClick={() => setSelectedDate(addDays(selectedDate, +1))}>
                翌日 →
              </button>
            </div>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ marginTop: 8 }}
            />
          </div>

          <div className="card row-between">
            <div>
              基礎（毎日必須）：
              <b style={{ marginLeft: 6 }}>
                {isDailyDone(day) ? "OK ✅" : "未達 ❌"}
              </b>
            </div>
            <div>
              隔日（歌/指揮）：
              <b style={{ marginLeft: 6 }}>
                {isAltDone(day, logs[addDays(selectedDate, -1)]) ? "OK ✅" : "未達 ❌"}
              </b>
            </div>
          </div>

          {TASKS.map((t) => {
            const mins = day[t.key] || 0;
            const list = (day.details || []).filter((x) => x.type === t.key);

            return (
              <div key={t.key} className="card">
                <div className="row-between">
                  <div style={{ fontWeight: 900 }}>{t.label}</div>
                  <div style={{ fontWeight: 900 }}>{mins}分</div>
                </div>

                {list.length === 0 ? (
                  <div className="label-muted" style={{ marginTop: 6 }}>
                    詳細なし
                  </div>
                ) : (
                  <div style={{ marginTop: 6, display: "grid", gap: 4 }}>
                    {list.map((it) => (
                      <div key={it.id} className="row-between" style={{ fontSize: 14 }}>
                        <div>・{it.title}</div>
                        <div><b>{it.mins}分</b></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div className="card">
            <div style={{ fontWeight: 900, marginBottom: 6 }}>この日のログ</div>

            {(day.details || []).length === 0 ? (
              <div className="label-muted">まだ記録がありません。</div>
            ) : (
              <div style={{ display: "grid", gap: 6 }}>
                {(day.details || []).map((it, idx) => (
                  <div key={it.id || idx} className="row-between" style={{ fontSize: 14 }}>
                    <div>
                      {TASKS.find((t) => t.key === it.type)?.label} / {it.title}
                    </div>
                    <div><b>{it.mins}分</b></div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            className="btn"
            style={{ marginTop: 10, width: "100%" }}
            onClick={() => setTab("home")}
          >
            今日の編集に戻る
          </button>
        </main>
      )}
    </div>
  );
}
