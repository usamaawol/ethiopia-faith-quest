import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import {
  doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, query, where, getDocs
} from "firebase/firestore";
import { BookOpen, CheckCircle2, Circle, Flame, Target, ChevronDown, ChevronUp, Plus, Minus } from "lucide-react";

const SALAH_PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

interface DailyChallenge {
  type: "pages" | "juz";
  target: number;
  progress: number;
  completed: boolean;
  prayerDistribution: Record<string, number>;
  date: string;
}

function CircleProgress({ value, max, size = 80 }: { value: number; max: number; size?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={6} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke="hsl(var(--gold))"
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        className="transition-all duration-700"
      />
    </svg>
  );
}

export default function QuranPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<"daily" | "weekly" | "monthly">("daily");
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingUp, setSettingUp] = useState(false);
  const [targetInput, setTargetInput] = useState(5);
  const [typeInput, setTypeInput] = useState<"pages" | "juz">("pages");
  const [weeklyTarget, setWeeklyTarget] = useState(50);
  const [weeklyProgress, setWeeklyProgress] = useState(0);
  const [monthlyTarget, setMonthlyTarget] = useState(1);
  const [monthlyProgress, setMonthlyProgress] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [expandPrayer, setExpandPrayer] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!user) return;
    loadChallenge();
  }, [user]);

  const loadChallenge = async () => {
    if (!user) return;
    setLoading(true);
    const ref = doc(db, "challenges", `${user.uid}_daily_${today}`);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      setChallenge(snap.data() as DailyChallenge);
    } else {
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
    const newProgress = Math.min(challenge.progress + amount, challenge.target);
    const completed = newProgress >= challenge.target;
    
    await updateDoc(doc(db, "challenges", `${user.uid}_daily_${today}`), {
      progress: newProgress,
      completed,
    });

    if (completed && !challenge.completed) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);
      // Award points
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        totalScore: (profile?.totalScore || 0) + 50,
        dailyScore: (profile?.dailyScore || 0) + 50,
      });
      await refreshProfile();
    }

    setChallenge({ ...challenge, progress: newProgress, completed });
  };

  const pct = challenge ? Math.round((challenge.progress / challenge.target) * 100) : 0;
  const unit = challenge?.type === "juz" ? "Juz" : "pages";

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
          {activeTab === "daily" && (
            <motion.div key="daily" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {loading ? (
                <div className="gradient-card rounded-2xl border border-border p-8 text-center">
                  <p className="text-muted-foreground">Loading...</p>
                </div>
              ) : !challenge || settingUp ? (
                <div className="gradient-card rounded-2xl border border-border shadow-card p-6 space-y-5">
                  <h2 className="font-semibold text-center text-foreground">Set Today's Goal</h2>
                  
                  <div className="flex gap-2">
                    {(["pages", "juz"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTypeInput(t)}
                        className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                          typeInput === t ? "border-gold text-gold bg-gold/10" : "border-border text-muted-foreground"
                        }`}
                      >
                        {t === "pages" ? "📄 Pages" : "📚 Juz"}
                      </button>
                    ))}
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Target {typeInput === "pages" ? "pages" : "Juz"}</p>
                    <div className="flex items-center gap-4 justify-center">
                      <button
                        onClick={() => setTargetInput(Math.max(1, targetInput - (typeInput === "pages" ? 5 : 1)))}
                        className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-3xl font-bold text-gold w-16 text-center">{targetInput}</span>
                      <button
                        onClick={() => setTargetInput(targetInput + (typeInput === "pages" ? 5 : 1))}
                        className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    {typeInput === "pages" && (
                      <div className="grid grid-cols-4 gap-2 mt-3">
                        {[5, 10, 15, 20].map((v) => (
                          <button
                            key={v}
                            onClick={() => setTargetInput(v)}
                            className={`py-1.5 rounded-lg text-xs font-medium border transition-all ${
                              targetInput === v ? "border-gold text-gold bg-gold/10" : "border-border text-muted-foreground"
                            }`}
                          >
                            {v} pg
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={createChallenge}
                    className="w-full py-3 gradient-gold text-primary-foreground rounded-xl font-semibold shadow-gold"
                  >
                    Start Challenge 🚀
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Progress Circle */}
                  <div className="gradient-card rounded-2xl border border-border shadow-card p-6">
                    <div className="flex items-center justify-center mb-4">
                      <div className="relative">
                        <CircleProgress value={challenge.progress} max={challenge.target} size={120} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-2xl font-bold text-gold">{pct}%</span>
                          <span className="text-xs text-muted-foreground">done</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-center mb-4">
                      <p className="text-lg font-bold text-foreground">
                        {challenge.progress} / {challenge.target} {unit}
                      </p>
                      {challenge.completed ? (
                        <p className="text-gold font-semibold">✅ Completed! +50 SAS Points</p>
                      ) : (
                        <p className="text-muted-foreground text-sm">{challenge.target - challenge.progress} {unit} remaining</p>
                      )}
                    </div>

                    {!challenge.completed && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => updateProgress(typeInput === "pages" ? 5 : 1)}
                          className="flex-1 py-3 gradient-gold rounded-xl font-semibold text-primary-foreground shadow-gold"
                        >
                          +{typeInput === "pages" ? "5 pages" : "1 Juz"} ✓
                        </button>
                        <button
                          onClick={() => updateProgress(1)}
                          className="px-4 py-3 bg-muted rounded-xl border border-border text-foreground text-sm"
                        >
                          +1
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => setSettingUp(true)}
                      className="w-full mt-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Change target
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
                                  {challenge.prayerDistribution[p] || 0} {unit}
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

          {activeTab === "weekly" && (
            <motion.div key="weekly" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="gradient-card rounded-2xl border border-border shadow-card p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-5 h-5 text-gold" />
                  <h2 className="font-semibold text-foreground">Weekly Goal</h2>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="text-gold font-semibold">{weeklyProgress}/{weeklyTarget} pages</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((weeklyProgress / weeklyTarget) * 100, 100)}%` }}
                      className="h-full gradient-gold rounded-full"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    {Math.round((weeklyProgress / weeklyTarget) * 100)}% complete this week
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Set Weekly Target (pages)</p>
                  <div className="flex items-center gap-3 justify-center">
                    <button onClick={() => setWeeklyTarget(Math.max(10, weeklyTarget - 10))} className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-3xl font-bold text-gold w-20 text-center">{weeklyTarget}</span>
                    <button onClick={() => setWeeklyTarget(weeklyTarget + 10)} className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {["S","M","T","W","T","F","S"].map((d, i) => (
                    <div key={i} className="aspect-square rounded-lg bg-muted flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">{d}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "monthly" && (
            <motion.div key="monthly" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="gradient-card rounded-2xl border border-border shadow-card p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="w-5 h-5 text-gold" />
                  <h2 className="font-semibold text-foreground">Monthly Goal</h2>
                </div>
                <p className="text-sm text-muted-foreground">How many full Quran completions this month?</p>
                <div className="flex items-center gap-4 justify-center">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setMonthlyTarget(n)}
                      className={`w-12 h-12 rounded-xl font-bold text-lg border transition-all ${
                        monthlyTarget === n ? "gradient-gold text-primary-foreground border-transparent shadow-gold" : "bg-muted border-border text-foreground"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <div className="bg-muted rounded-xl p-4 text-center">
                  <p className="text-sm text-muted-foreground">Daily pages needed</p>
                  <p className="text-3xl font-bold text-gold mt-1">
                    {Math.ceil((monthlyTarget * 604) / 30)}
                  </p>
                  <p className="text-xs text-muted-foreground">pages/day (604 pages per Quran)</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Completions</span>
                  <div className="flex gap-2">
                    {Array.from({ length: monthlyTarget }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setMonthlyProgress(i < monthlyProgress ? i : i + 1)}
                        className={`w-8 h-8 rounded-lg text-sm font-bold border transition-all ${
                          i < monthlyProgress ? "gradient-gold text-primary-foreground border-transparent" : "bg-muted border-border text-muted-foreground"
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Celebration */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="fixed inset-0 flex items-center justify-center z-50 bg-background/80 backdrop-blur-sm"
          >
            <div className="gradient-card border border-gold rounded-3xl p-8 text-center shadow-glow">
              <div className="text-6xl mb-4 animate-float">🎉</div>
              <h2 className="text-2xl font-bold text-gold mb-2">Masha'Allah!</h2>
              <p className="text-foreground">Daily goal completed!</p>
              <p className="text-gold font-bold mt-2">+50 SAS Points 🌟</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
