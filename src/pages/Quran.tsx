import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import {
  doc, getDoc, setDoc, updateDoc, serverTimestamp
} from "firebase/firestore";
import { BookOpen, Target, Flame, ChevronDown, ChevronUp, Plus, Minus, Save, Edit2 } from "lucide-react";

const SALAH_PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
const QURAN_PAGES = 604;
const QURAN_JUZ = 30;
const QURAN_SURAHS = 114;

type GoalType = "pages" | "juz" | "surah";

interface DailyChallenge {
  type: GoalType;
  target: number;
  progress: number;
  completed: boolean;
  prayerDistribution: Record<string, number>;
  date: string;
}

interface WeeklyGoal {
  type: GoalType;
  target: number;
  progress: number;
  weekStart: string;
  saved: boolean;
}

interface MonthlyGoal {
  completions: number; // how many full Quran completions
  progress: number; // how many completed so far
  monthKey: string;
  saved: boolean;
}

function CircleProgress({ value, max, size = 120 }: { value: number; max: number; size?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={8} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke="hsl(var(--gold))"
        strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        className="transition-all duration-700"
      />
    </svg>
  );
}

function unitLabel(type: GoalType, n: number = 1) {
  if (type === "juz") return n === 1 ? "Juz" : "Juz";
  if (type === "surah") return n === 1 ? "Surah" : "Surahs";
  return n === 1 ? "page" : "pages";
}

function getWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d.toISOString().split("T")[0];
}

function getMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}`;
}

export default function QuranPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<"daily" | "weekly" | "monthly">("daily");
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingUp, setSettingUp] = useState(false);
  const [targetInput, setTargetInput] = useState(5);
  const [typeInput, setTypeInput] = useState<GoalType>("pages");
  const [showCelebration, setShowCelebration] = useState(false);
  const [expandPrayer, setExpandPrayer] = useState(false);

  // Weekly
  const [weeklyGoal, setWeeklyGoal] = useState<WeeklyGoal | null>(null);
  const [weeklyType, setWeeklyType] = useState<GoalType>("pages");
  const [weeklyTarget, setWeeklyTarget] = useState(50);
  const [weeklyLoading, setWeeklyLoading] = useState(true);
  const [weeklyEditing, setWeeklyEditing] = useState(false);

  // Monthly
  const [monthlyGoal, setMonthlyGoal] = useState<MonthlyGoal | null>(null);
  const [monthlyCompletions, setMonthlyCompletions] = useState(1);
  const [monthlyLoading, setMonthlyLoading] = useState(true);
  const [monthlyEditing, setMonthlyEditing] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!user) return;
    loadChallenge();
    loadWeeklyGoal();
    loadMonthlyGoal();
  }, [user]);

  // ─── Daily ───────────────────────────────────────────────────────────────────

  const loadChallenge = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const ref = doc(db, "challenges", `${user.uid}_daily_${today}`);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setChallenge(snap.data() as DailyChallenge);
      } else {
        setChallenge(null);
      }
    } catch (e) {
      setChallenge(null);
    }
    setLoading(false);
  };

  const createChallenge = async () => {
    if (!user) return;
    const distribution: Record<string, number> = {};
    const perPrayer = Math.floor(targetInput / SALAH_PRAYERS.length);
    SALAH_PRAYERS.forEach((p, i) => {
      distribution[p] = i < targetInput % SALAH_PRAYERS.length ? perPrayer + 1 : perPrayer;
    });

    const data: DailyChallenge = {
      type: typeInput,
      target: targetInput,
      progress: 0,
      completed: false,
      prayerDistribution: distribution,
      date: today,
    };

    await setDoc(doc(db, "challenges", `${user.uid}_daily_${today}`), {
      ...data,
      userId: user.uid,
      createdAt: serverTimestamp(),
    });
    setChallenge(data);
    setSettingUp(false);
  };

  const updateProgress = async (amount: number) => {
    if (!user || !challenge) return;
    const newProgress = Math.max(0, Math.min(challenge.progress + amount, challenge.target));
    const completed = newProgress >= challenge.target;

    await updateDoc(doc(db, "challenges", `${user.uid}_daily_${today}`), {
      progress: newProgress,
      completed,
    });

    if (completed && !challenge.completed) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);
      try {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          totalScore: (profile?.totalScore || 0) + 50,
          dailyScore: (profile?.dailyScore || 0) + 50,
          "streakData.quran": (profile?.streakData?.quran || 0) + 1,
          "streakData.total": (profile?.streakData?.total || 0) + 1,
        });
        await refreshProfile();
      } catch (_) {}
    }

    setChallenge({ ...challenge, progress: newProgress, completed });
  };

  // ─── Weekly ───────────────────────────────────────────────────────────────────

  const loadWeeklyGoal = async () => {
    if (!user) return;
    setWeeklyLoading(true);
    try {
      const ref = doc(db, "weeklyGoals", `${user.uid}_${getWeekStart()}`);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as WeeklyGoal;
        setWeeklyGoal(data);
        setWeeklyType(data.type);
        setWeeklyTarget(data.target);
      } else {
        setWeeklyGoal(null);
        setWeeklyEditing(true);
      }
    } catch (_) {}
    setWeeklyLoading(false);
  };

  const saveWeeklyGoal = async () => {
    if (!user) return;
    const data: WeeklyGoal = {
      type: weeklyType,
      target: weeklyTarget,
      progress: weeklyGoal?.progress || 0,
      weekStart: getWeekStart(),
      saved: true,
    };
    await setDoc(doc(db, "weeklyGoals", `${user.uid}_${getWeekStart()}`), {
      ...data,
      userId: user.uid,
      updatedAt: serverTimestamp(),
    });
    setWeeklyGoal(data);
    setWeeklyEditing(false);
  };

  const updateWeeklyProgress = async (amount: number) => {
    if (!user || !weeklyGoal) return;
    const newProg = Math.max(0, Math.min(weeklyGoal.progress + amount, weeklyGoal.target));
    await updateDoc(doc(db, "weeklyGoals", `${user.uid}_${getWeekStart()}`), { progress: newProg });
    setWeeklyGoal({ ...weeklyGoal, progress: newProg });
  };

  // ─── Monthly ───────────────────────────────────────────────────────────────────

  const loadMonthlyGoal = async () => {
    if (!user) return;
    setMonthlyLoading(true);
    try {
      const ref = doc(db, "monthlyGoals", `${user.uid}_${getMonthKey()}`);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as MonthlyGoal;
        setMonthlyGoal(data);
        setMonthlyCompletions(data.completions);
      } else {
        setMonthlyGoal(null);
        setMonthlyEditing(true);
      }
    } catch (_) {}
    setMonthlyLoading(false);
  };

  const saveMonthlyGoal = async () => {
    if (!user) return;
    const data: MonthlyGoal = {
      completions: monthlyCompletions,
      progress: monthlyGoal?.progress || 0,
      monthKey: getMonthKey(),
      saved: true,
    };
    await setDoc(doc(db, "monthlyGoals", `${user.uid}_${getMonthKey()}`), {
      ...data,
      userId: user.uid,
      updatedAt: serverTimestamp(),
    });
    setMonthlyGoal(data);
    setMonthlyEditing(false);
  };

  const updateMonthlyProgress = async (newProg: number) => {
    if (!user || !monthlyGoal) return;
    const clamped = Math.max(0, Math.min(newProg, monthlyGoal.completions));
    await updateDoc(doc(db, "monthlyGoals", `${user.uid}_${getMonthKey()}`), { progress: clamped });
    setMonthlyGoal({ ...monthlyGoal, progress: clamped });
  };

  const pct = challenge ? Math.round((challenge.progress / challenge.target) * 100) : 0;
  const dailyPagesNeeded = monthlyGoal ? Math.ceil((monthlyGoal.completions * QURAN_PAGES) / 30) : 0;

  return (
    <div className="min-h-screen geometric-bg pb-24">
      {/* Header */}
      <div className="px-4 pt-12 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 gradient-gold rounded-xl flex items-center justify-center shadow-gold">
            <BookOpen className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Quran Challenge</h1>
            <p className="text-xs text-muted-foreground">Track your recitation journey</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-muted rounded-xl p-1">
          {(["daily", "weekly", "monthly"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${
                activeTab === tab ? "gradient-gold text-primary-foreground shadow-gold" : "text-muted-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-4">
        <AnimatePresence mode="wait">

          {/* ───── DAILY TAB ───── */}
          {activeTab === "daily" && (
            <motion.div key="daily" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {loading ? (
                <div className="gradient-card rounded-2xl border border-border p-8 text-center">
                  <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">Loading your challenge...</p>
                </div>
              ) : !challenge || settingUp ? (
                /* ── Setup Form ── */
                <div className="gradient-card rounded-2xl border border-border shadow-card p-6 space-y-5">
                  <h2 className="font-semibold text-center text-foreground text-lg">Set Today's Goal</h2>

                  {/* Type selector */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2 font-medium">Reading Unit</p>
                    <div className="flex gap-2">
                      {(["pages", "surah", "juz"] as GoalType[]).map((t) => (
                        <button
                          key={t}
                          onClick={() => {
                            setTypeInput(t);
                            setTargetInput(t === "pages" ? 5 : t === "surah" ? 1 : 1);
                          }}
                          className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                            typeInput === t
                              ? "border-gold text-gold bg-gold/10"
                              : "border-border text-muted-foreground bg-muted"
                          }`}
                        >
                          {t === "pages" ? "📄 Pages" : t === "surah" ? "📜 Surah" : "📚 Juz"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Target counter */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Target {typeInput === "pages" ? "Pages" : typeInput === "surah" ? "Surahs" : "Juz"}
                      {typeInput !== "pages" && (
                        <span className="ml-1 text-gold text-xs">
                          (max {typeInput === "juz" ? QURAN_JUZ : QURAN_SURAHS})
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-4 justify-center">
                      <button
                        onClick={() => setTargetInput(Math.max(1, targetInput - (typeInput === "pages" ? 5 : 1)))}
                        className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center active:scale-95 transition-transform"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-4xl font-bold text-gold w-20 text-center">{targetInput}</span>
                      <button
                        onClick={() => {
                          const max = typeInput === "pages" ? QURAN_PAGES : typeInput === "juz" ? QURAN_JUZ : QURAN_SURAHS;
                          setTargetInput(Math.min(max, targetInput + (typeInput === "pages" ? 5 : 1)));
                        }}
                        className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center active:scale-95 transition-transform"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Quick presets */}
                    {typeInput === "pages" && (
                      <div className="grid grid-cols-4 gap-2 mt-3">
                        {[5, 10, 15, 20].map((v) => (
                          <button
                            key={v}
                            onClick={() => setTargetInput(v)}
                            className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                              targetInput === v ? "border-gold text-gold bg-gold/10" : "border-border text-muted-foreground bg-muted"
                            }`}
                          >
                            {v} pg
                          </button>
                        ))}
                      </div>
                    )}
                    {typeInput === "juz" && (
                      <div className="grid grid-cols-5 gap-2 mt-3">
                        {[1, 2, 3, 5, 10].map((v) => (
                          <button
                            key={v}
                            onClick={() => setTargetInput(v)}
                            className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                              targetInput === v ? "border-gold text-gold bg-gold/10" : "border-border text-muted-foreground bg-muted"
                            }`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    )}
                    {typeInput === "surah" && (
                      <div className="grid grid-cols-4 gap-2 mt-3">
                        {[1, 2, 5, 10].map((v) => (
                          <button
                            key={v}
                            onClick={() => setTargetInput(v)}
                            className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                              targetInput === v ? "border-gold text-gold bg-gold/10" : "border-border text-muted-foreground bg-muted"
                            }`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={createChallenge}
                    className="w-full py-3.5 gradient-gold text-primary-foreground rounded-xl font-bold text-sm shadow-gold active:scale-95 transition-transform"
                  >
                    🚀 Start Today's Challenge
                  </button>
                  {settingUp && (
                    <button onClick={() => setSettingUp(false)} className="w-full text-xs text-muted-foreground py-1">
                      Cancel
                    </button>
                  )}
                </div>
              ) : (
                /* ── Active Challenge ── */
                <div className="space-y-4">
                  {/* Progress Circle */}
                  <div className="gradient-card rounded-2xl border border-border shadow-card p-6">
                    <div className="flex items-center justify-center mb-4">
                      <div className="relative">
                        <CircleProgress value={challenge.progress} max={challenge.target} size={140} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-3xl font-bold text-gold">{pct}%</span>
                          <span className="text-xs text-muted-foreground">complete</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-center mb-5">
                      <p className="text-xl font-bold text-foreground">
                        {challenge.progress} / {challenge.target} {unitLabel(challenge.type, challenge.target)}
                      </p>
                      {challenge.completed ? (
                        <p className="text-gold font-semibold mt-1">✅ Completed! +50 SAS Points</p>
                      ) : (
                        <p className="text-muted-foreground text-sm mt-1">
                          {challenge.target - challenge.progress} {unitLabel(challenge.type)} remaining
                        </p>
                      )}
                    </div>

                    {!challenge.completed && (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateProgress(challenge.type === "pages" ? 5 : 1)}
                            className="flex-1 py-3 gradient-gold rounded-xl font-bold text-primary-foreground shadow-gold active:scale-95 transition-transform"
                          >
                            +{challenge.type === "pages" ? "5 pages" : challenge.type === "juz" ? "1 Juz" : "1 Surah"} ✓
                          </button>
                          <button
                            onClick={() => updateProgress(1)}
                            className="px-5 py-3 bg-muted rounded-xl border border-border text-foreground font-semibold text-sm active:scale-95 transition-transform"
                          >
                            +1
                          </button>
                        </div>
                        {/* Undo */}
                        <button
                          onClick={() => updateProgress(-1)}
                          className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          ← Undo last (+1)
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => setSettingUp(true)}
                      className="w-full mt-2 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" /> Change target
                    </button>
                  </div>

                  {/* Prayer Distribution */}
                  <div className="gradient-card rounded-2xl border border-border shadow-card overflow-hidden">
                    <button
                      onClick={() => setExpandPrayer(!expandPrayer)}
                      className="flex items-center justify-between w-full px-4 py-3"
                    >
                      <span className="text-sm font-semibold text-foreground">Reading by Prayer</span>
                      {expandPrayer ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </button>
                    <AnimatePresence>
                      {expandPrayer && (
                        <motion.div
                          initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 space-y-2">
                            {SALAH_PRAYERS.map((p) => (
                              <div key={p} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                                <span className="text-sm text-foreground">{p}</span>
                                <span className="text-sm font-medium text-gold">
                                  {challenge.prayerDistribution[p] || 0} {unitLabel(challenge.type)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ───── WEEKLY TAB ───── */}
          {activeTab === "weekly" && (
            <motion.div key="weekly" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {weeklyLoading ? (
                <div className="gradient-card rounded-2xl border border-border p-8 text-center">
                  <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">Loading weekly goal...</p>
                </div>
              ) : weeklyEditing || !weeklyGoal ? (
                /* ── Weekly Setup ── */
                <div className="gradient-card rounded-2xl border border-border shadow-card p-6 space-y-5">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-gold" />
                    <h2 className="font-semibold text-foreground text-lg">Weekly Reading Goal</h2>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-2 font-medium">Reading Unit</p>
                    <div className="flex gap-2">
                      {(["pages", "surah", "juz"] as GoalType[]).map((t) => (
                        <button
                          key={t}
                          onClick={() => {
                            setWeeklyType(t);
                            setWeeklyTarget(t === "pages" ? 50 : t === "surah" ? 5 : 3);
                          }}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                            weeklyType === t ? "border-gold text-gold bg-gold/10" : "border-border text-muted-foreground bg-muted"
                          }`}
                        >
                          {t === "pages" ? "📄 Pages" : t === "surah" ? "📜 Surah" : "📚 Juz"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-3">Weekly Target</p>
                    <div className="flex items-center gap-4 justify-center">
                      <button
                        onClick={() => setWeeklyTarget(Math.max(1, weeklyTarget - (weeklyType === "pages" ? 10 : 1)))}
                        className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-4xl font-bold text-gold w-20 text-center">{weeklyTarget}</span>
                      <button
                        onClick={() => setWeeklyTarget(weeklyTarget + (weeklyType === "pages" ? 10 : 1))}
                        className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    {weeklyType === "pages" && (
                      <div className="grid grid-cols-4 gap-2 mt-3">
                        {[30, 50, 100, 150].map((v) => (
                          <button key={v} onClick={() => setWeeklyTarget(v)}
                            className={`py-2 rounded-xl text-xs font-semibold border transition-all ${weeklyTarget === v ? "border-gold text-gold bg-gold/10" : "border-border text-muted-foreground bg-muted"}`}>
                            {v}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-muted rounded-xl p-3 text-center">
                    <p className="text-xs text-muted-foreground">Daily target needed</p>
                    <p className="text-2xl font-bold text-gold mt-1">
                      {Math.ceil(weeklyTarget / 7)} {unitLabel(weeklyType)}
                    </p>
                    <p className="text-xs text-muted-foreground">per day</p>
                  </div>

                  <button onClick={saveWeeklyGoal}
                    className="w-full py-3.5 gradient-gold text-primary-foreground rounded-xl font-bold text-sm shadow-gold flex items-center justify-center gap-2 active:scale-95 transition-transform">
                    <Save className="w-4 h-4" /> Save Weekly Goal
                  </button>
                  {weeklyGoal && (
                    <button onClick={() => setWeeklyEditing(false)} className="w-full text-xs text-muted-foreground py-1">Cancel</button>
                  )}
                </div>
              ) : (
                /* ── Weekly Progress ── */
                <div className="gradient-card rounded-2xl border border-border shadow-card p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-gold" />
                      <h2 className="font-semibold text-foreground">Weekly Goal</h2>
                    </div>
                    <button onClick={() => setWeeklyEditing(true)}
                      className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center">
                      <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="text-gold font-bold">{weeklyGoal.progress}/{weeklyGoal.target} {unitLabel(weeklyGoal.type)}</span>
                    </div>
                    <div className="h-4 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((weeklyGoal.progress / weeklyGoal.target) * 100, 100)}%` }}
                        className="h-full gradient-gold rounded-full"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      {Math.round((weeklyGoal.progress / weeklyGoal.target) * 100)}% complete this week
                    </p>
                  </div>

                  {/* Add progress */}
                  {weeklyGoal.progress < weeklyGoal.target && (
                    <div className="flex gap-2">
                      <button onClick={() => updateWeeklyProgress(weeklyGoal.type === "pages" ? 5 : 1)}
                        className="flex-1 py-3 gradient-gold rounded-xl font-bold text-primary-foreground shadow-gold text-sm active:scale-95 transition-transform">
                        +{weeklyGoal.type === "pages" ? "5 pages" : weeklyGoal.type === "juz" ? "1 Juz" : "1 Surah"}
                      </button>
                      <button onClick={() => updateWeeklyProgress(1)}
                        className="px-4 py-3 bg-muted rounded-xl border border-border text-foreground font-semibold text-sm active:scale-95 transition-transform">
                        +1
                      </button>
                      <button onClick={() => updateWeeklyProgress(-1)}
                        className="px-4 py-3 bg-muted rounded-xl border border-border text-muted-foreground text-sm active:scale-95 transition-transform">
                        -1
                      </button>
                    </div>
                  )}
                  {weeklyGoal.progress >= weeklyGoal.target && (
                    <div className="text-center py-2">
                      <p className="text-gold font-bold text-lg">✅ Weekly goal complete!</p>
                      <p className="text-muted-foreground text-sm">Masha'Allah! Keep going!</p>
                    </div>
                  )}

                  {/* Week days grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => {
                      const today = new Date().getDay();
                      const isPast = i <= today;
                      return (
                        <div key={i} className={`aspect-square rounded-lg flex items-center justify-center text-xs font-medium ${i === today ? "gradient-gold text-primary-foreground" : isPast ? "bg-gold/20 text-gold" : "bg-muted text-muted-foreground"}`}>
                          {d}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ───── MONTHLY TAB ───── */}
          {activeTab === "monthly" && (
            <motion.div key="monthly" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {monthlyLoading ? (
                <div className="gradient-card rounded-2xl border border-border p-8 text-center">
                  <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">Loading monthly goal...</p>
                </div>
              ) : monthlyEditing || !monthlyGoal ? (
                /* ── Monthly Setup ── */
                <div className="gradient-card rounded-2xl border border-border shadow-card p-6 space-y-5">
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-gold" />
                    <h2 className="font-semibold text-foreground text-lg">Monthly Quran Goal</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">How many full Quran completions this month?</p>

                  <div className="flex items-center gap-3 justify-center flex-wrap">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => setMonthlyCompletions(n)}
                        className={`w-14 h-14 rounded-2xl font-bold text-xl border-2 transition-all active:scale-95 ${
                          monthlyCompletions === n
                            ? "gradient-gold text-primary-foreground border-transparent shadow-gold"
                            : "bg-muted border-border text-foreground"
                        }`}
                      >
                        {n}×
                      </button>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="space-y-2">
                    <div className="bg-muted rounded-xl p-4 flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Daily pages needed</span>
                      <span className="text-2xl font-bold text-gold">{Math.ceil((monthlyCompletions * QURAN_PAGES) / 30)}</span>
                    </div>
                    <div className="bg-muted rounded-xl p-4 flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Daily Juz needed</span>
                      <span className="text-2xl font-bold text-gold">{Math.ceil((monthlyCompletions * QURAN_JUZ) / 30)}</span>
                    </div>
                    <div className="bg-muted rounded-xl p-4 flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total pages</span>
                      <span className="text-lg font-bold text-muted-foreground">{monthlyCompletions * QURAN_PAGES}</span>
                    </div>
                  </div>

                  <button onClick={saveMonthlyGoal}
                    className="w-full py-3.5 gradient-gold text-primary-foreground rounded-xl font-bold text-sm shadow-gold flex items-center justify-center gap-2 active:scale-95 transition-transform">
                    <Save className="w-4 h-4" /> Save Monthly Goal
                  </button>
                  {monthlyGoal && (
                    <button onClick={() => setMonthlyEditing(false)} className="w-full text-xs text-muted-foreground py-1">Cancel</button>
                  )}
                </div>
              ) : (
                /* ── Monthly Progress ── */
                <div className="space-y-4">
                  <div className="gradient-card rounded-2xl border border-border shadow-card p-6 space-y-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Flame className="w-5 h-5 text-gold" />
                        <h2 className="font-semibold text-foreground">Monthly Goal</h2>
                      </div>
                      <button onClick={() => setMonthlyEditing(true)}
                        className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center">
                        <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      Target: <span className="text-gold font-bold">{monthlyGoal.completions}×</span> full Quran this month
                    </p>

                    {/* Completions tracker */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-3 font-medium">Tap to mark completions</p>
                      <div className="flex gap-2 flex-wrap">
                        {Array.from({ length: monthlyGoal.completions }).map((_, i) => (
                          <button
                            key={i}
                            onClick={() => updateMonthlyProgress(i < monthlyGoal.progress ? i : i + 1)}
                            className={`w-14 h-14 rounded-2xl text-sm font-bold border-2 transition-all active:scale-95 ${
                              i < monthlyGoal.progress
                                ? "gradient-gold text-primary-foreground border-transparent shadow-gold"
                                : "bg-muted border-border text-muted-foreground"
                            }`}
                          >
                            {i < monthlyGoal.progress ? "✓" : i + 1}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-muted rounded-xl p-3 text-center">
                        <p className="text-xs text-muted-foreground">Daily pages needed</p>
                        <p className="text-2xl font-bold text-gold mt-1">{dailyPagesNeeded}</p>
                      </div>
                      <div className="bg-muted rounded-xl p-3 text-center">
                        <p className="text-xs text-muted-foreground">Completed</p>
                        <p className="text-2xl font-bold text-gold mt-1">{monthlyGoal.progress}/{monthlyGoal.completions}</p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((monthlyGoal.progress / monthlyGoal.completions) * 100, 100)}%` }}
                          className="h-full gradient-gold rounded-full"
                        />
                      </div>
                      <p className="text-xs text-center text-muted-foreground mt-2">
                        {Math.round((monthlyGoal.progress / monthlyGoal.completions) * 100)}% complete this month
                      </p>
                    </div>

                    {monthlyGoal.progress >= monthlyGoal.completions && (
                      <div className="text-center py-2 border border-gold/30 rounded-xl bg-gold/5">
                        <p className="text-gold font-bold text-lg">🎉 Monthly goal complete!</p>
                        <p className="text-muted-foreground text-sm">Subhan'Allah! Amazing dedication!</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Celebration Overlay */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 bg-background/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.5 }} animate={{ scale: 1 }} exit={{ scale: 0.5 }}
              className="gradient-card border border-gold rounded-3xl p-8 text-center shadow-glow mx-6"
            >
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-gold mb-2">Masha'Allah!</h2>
              <p className="text-foreground">Daily Quran goal completed!</p>
              <p className="text-gold font-bold mt-2">+50 SAS Points 🌟</p>
              <p className="text-muted-foreground text-sm mt-1">Quran streak extended! 🔥</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
