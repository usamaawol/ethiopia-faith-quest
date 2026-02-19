import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ChevronRight, CheckCircle2, RotateCcw, Flame } from "lucide-react";

interface AzkarItem {
  id: string;
  arabic: string;
  transliteration: string;
  translation: string;
  count: number;
  maxCount: number;
}

interface AzkarCategory {
  id: string;
  title: string;
  arabic: string;
  icon: string;
  color: string;
  points: number;
  azkar: AzkarItem[];
}

const azkarData: AzkarCategory[] = [
  {
    id: "morning",
    title: "Morning Azkar",
    arabic: "أذكار الصباح",
    icon: "🌅",
    color: "from-amber-900/40 to-amber-800/20 border-amber-700/30",
    points: 20,
    azkar: [
      { id: "m1", arabic: "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ", transliteration: "Asbahna wa asbahal mulku lillah walhamdu lillah", translation: "We have entered the morning and the entire kingdom belongs to Allah", count: 0, maxCount: 1 },
      { id: "m2", arabic: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ", transliteration: "SubhanAllahi wa bihamdihi", translation: "Glory be to Allah and His is the praise", count: 0, maxCount: 100 },
      { id: "m3", arabic: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ", transliteration: "La ilaha illallah wahdahu la sharika lah", translation: "There is none worthy of worship but Allah alone, with no partner", count: 0, maxCount: 10 },
      { id: "m4", arabic: "اللَّهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا", transliteration: "Allahumma bika asbahna wa bika amsayna", translation: "O Allah, by You we have entered the morning and by You we end the evening", count: 0, maxCount: 1 },
    ],
  },
  {
    id: "evening",
    title: "Evening Azkar",
    arabic: "أذكار المساء",
    icon: "🌙",
    color: "from-indigo-900/40 to-indigo-800/20 border-indigo-700/30",
    points: 20,
    azkar: [
      { id: "e1", arabic: "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ", transliteration: "Amsayna wa amsal mulku lillah walhamdu lillah", translation: "We have entered the evening and the entire kingdom belongs to Allah", count: 0, maxCount: 1 },
      { id: "e2", arabic: "اللَّهُمَّ بِكَ أَمْسَيْنَا وَبِكَ أَصْبَحْنَا", transliteration: "Allahumma bika amsayna wa bika asbahna", translation: "O Allah, by You we end the evening and by You we enter the morning", count: 0, maxCount: 1 },
      { id: "e3", arabic: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ", transliteration: "SubhanAllahi wa bihamdihi", translation: "Glory be to Allah and His is the praise", count: 0, maxCount: 100 },
    ],
  },
  {
    id: "after_salah",
    title: "After Salah",
    arabic: "أذكار بعد الصلاة",
    icon: "🕌",
    color: "from-emerald-900/40 to-emerald-800/20 border-emerald-700/30",
    points: 15,
    azkar: [
      { id: "s1", arabic: "سُبْحَانَ اللَّهِ", transliteration: "SubhanAllah", translation: "Glory be to Allah", count: 0, maxCount: 33 },
      { id: "s2", arabic: "الْحَمْدُ لِلَّهِ", transliteration: "Alhamdulillah", translation: "All praise is due to Allah", count: 0, maxCount: 33 },
      { id: "s3", arabic: "اللَّهُ أَكْبَرُ", transliteration: "Allahu Akbar", translation: "Allah is the Greatest", count: 0, maxCount: 33 },
      { id: "s4", arabic: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ", transliteration: "La ilaha illallah wahdahu la sharika lah, lahul mulku wa lahul hamd, wa huwa 'ala kulli shay'in qadir", translation: "There is none worthy of worship but Allah alone, with no partner or associate", count: 0, maxCount: 1 },
    ],
  },
  {
    id: "sleep",
    title: "Sleep Azkar",
    arabic: "أذكار النوم",
    icon: "😴",
    color: "from-purple-900/40 to-purple-800/20 border-purple-700/30",
    points: 10,
    azkar: [
      { id: "sl1", arabic: "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا", transliteration: "Bismika Allahumma amutu wa ahya", translation: "In Your name O Allah, I die and I live", count: 0, maxCount: 1 },
      { id: "sl2", arabic: "سُبْحَانَ اللَّهِ", transliteration: "SubhanAllah", translation: "Glory be to Allah", count: 0, maxCount: 33 },
    ],
  },
  {
    id: "general",
    title: "General Dua",
    arabic: "أدعية عامة",
    icon: "🤲",
    color: "from-rose-900/40 to-rose-800/20 border-rose-700/30",
    points: 10,
    azkar: [
      { id: "g1", arabic: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ", transliteration: "Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina azaban-nar", translation: "Our Lord, give us good in this world and good in the Hereafter and protect us from the punishment of the Fire", count: 0, maxCount: 3 },
      { id: "g2", arabic: "اللَّهُمَّ اغْفِرْ لِي وَتُبْ عَلَيَّ إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ", transliteration: "Allahummaghfir li wa tub 'alayya innaka antat-tawwabur-rahim", translation: "O Allah, forgive me and accept my repentance, You are the Most-Forgiving, the Most-Merciful", count: 0, maxCount: 100 },
    ],
  },
];

// Celebration banner component
function StreakBanner({ catTitle, points }: { catTitle: string; points: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -40, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -40, scale: 0.9 }}
      className="fixed top-4 left-4 right-4 z-50 gradient-gold rounded-2xl p-4 shadow-gold flex items-center gap-3"
    >
      <div className="text-3xl">🔥</div>
      <div>
        <p className="font-bold text-primary-foreground text-sm">{catTitle} completed!</p>
        <p className="text-primary-foreground/80 text-xs">+{points} SAS Points • Streak extended!</p>
      </div>
      <Flame className="w-6 h-6 text-primary-foreground ml-auto" />
    </motion.div>
  );
}

export default function AzkarPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [selected, setSelected] = useState<AzkarCategory | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [completedCategories, setCompletedCategories] = useState<Set<string>>(new Set());
  const [streakBanner, setStreakBanner] = useState<{ catTitle: string; points: number } | null>(null);
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!user) return;
    loadProgress();
  }, [user]);

  const loadProgress = async () => {
    if (!user) return;
    try {
      const ref = doc(db, "azkarCompletion", `${user.uid}_${today}`);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setCounts(data.counts || {});
        setCompletedCategories(new Set(data.completedCategories || []));
      }
    } catch (_) {}
  };

  const handleTap = async (item: AzkarItem, catId: string) => {
    if (!user) return;
    const key = `${catId}_${item.id}`;
    const current = counts[key] || 0;
    if (current >= item.maxCount) return;

    const newCounts = { ...counts, [key]: current + 1 };
    setCounts(newCounts);

    const cat = azkarData.find((c) => c.id === catId)!;
    const allDone = cat.azkar.every((a) => (newCounts[`${catId}_${a.id}`] || 0) >= a.maxCount);
    const newCompleted = new Set(completedCategories);
    const wasAlreadyDone = completedCategories.has(catId);

    if (allDone) newCompleted.add(catId);
    setCompletedCategories(newCompleted);

    // Save to Firestore
    await setDoc(doc(db, "azkarCompletion", `${user.uid}_${today}`), {
      userId: user.uid,
      date: today,
      counts: newCounts,
      completedCategories: Array.from(newCompleted),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    // Award points & streak IMMEDIATELY when category completes
    if (allDone && !wasAlreadyDone) {
      const points = cat.points;

      // Show streak banner
      setStreakBanner({ catTitle: cat.title, points });
      setTimeout(() => setStreakBanner(null), 3000);

      try {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          totalScore: (profile?.totalScore || 0) + points,
          dailyScore: (profile?.dailyScore || 0) + points,
          "streakData.azkar": (profile?.streakData?.azkar || 0) + 1,
          "streakData.total": (profile?.streakData?.total || 0) + 1,
        });
        await refreshProfile();
      } catch (_) {}
    }
  };

  const resetCategory = async (catId: string) => {
    const newCounts = { ...counts };
    const cat = azkarData.find((c) => c.id === catId)!;
    cat.azkar.forEach((a) => delete newCounts[`${catId}_${a.id}`]);
    setCounts(newCounts);
    const newCompleted = new Set(completedCategories);
    newCompleted.delete(catId);
    setCompletedCategories(newCompleted);

    if (user) {
      await setDoc(doc(db, "azkarCompletion", `${user.uid}_${today}`), {
        userId: user.uid,
        date: today,
        counts: newCounts,
        completedCategories: Array.from(newCompleted),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }
  };

  return (
    <div className="min-h-screen geometric-bg pb-24">
      {/* Streak banner */}
      <AnimatePresence>
        {streakBanner && <StreakBanner catTitle={streakBanner.catTitle} points={streakBanner.points} />}
      </AnimatePresence>

      {/* Header */}
      <div className="px-4 pt-12 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 gradient-emerald rounded-xl flex items-center justify-center">
            <span className="text-xl">🤲</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Azkar</h1>
            <p className="text-xs text-muted-foreground">Daily remembrance tracker</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 gradient-card rounded-xl border border-border p-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Today's Progress</span>
            <span className="text-gold font-semibold">{completedCategories.size}/{azkarData.length} completed</span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              animate={{ width: `${(completedCategories.size / azkarData.length) * 100}%` }}
              className="h-full gradient-gold rounded-full transition-all"
            />
          </div>
          {completedCategories.size === azkarData.length && (
            <p className="text-center text-gold text-xs font-semibold mt-2">🌟 All Azkar completed! Masha'Allah!</p>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!selected ? (
          <motion.div key="categories" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4 space-y-3">
            {azkarData.map((cat, i) => {
              const done = completedCategories.has(cat.id);
              const catCounts = cat.azkar.map((a) => counts[`${cat.id}_${a.id}`] || 0);
              const total = catCounts.reduce((a, b) => a + b, 0);
              const max = cat.azkar.reduce((a, b) => a + b.maxCount, 0);
              const pct = Math.min((total / max) * 100, 100);

              return (
                <motion.button
                  key={cat.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  onClick={() => setSelected(cat)}
                  className={`w-full gradient-card bg-gradient-to-r ${cat.color} border rounded-2xl p-4 flex items-center gap-4 shadow-card hover:scale-[1.01] active:scale-95 transition-transform`}
                >
                  <span className="text-3xl">{cat.icon}</span>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-foreground text-sm">{cat.title}</p>
                    <p className="font-arabic text-xs text-muted-foreground">{cat.arabic}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1.5 bg-background/30 rounded-full overflow-hidden">
                        <div
                          className="h-full gradient-gold rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gold font-medium shrink-0">+{cat.points}pts</span>
                    </div>
                  </div>
                  {done ? (
                    <CheckCircle2 className="w-6 h-6 text-gold shrink-0" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        ) : (
          <motion.div key="detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="px-4 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => setSelected(null)}
                className="flex items-center gap-2 text-gold text-sm font-medium"
              >
                ← Back
              </button>
              <div className="text-center">
                <p className="text-sm font-bold text-foreground">{selected.title}</p>
                <p className="font-arabic text-xs text-muted-foreground">{selected.arabic}</p>
              </div>
              <button
                onClick={() => resetCategory(selected.id)}
                className="text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Category completion banner */}
            {completedCategories.has(selected.id) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="gradient-gold rounded-2xl p-3 text-center shadow-gold"
              >
                <p className="font-bold text-primary-foreground">✅ {selected.title} Complete!</p>
                <p className="text-primary-foreground/80 text-xs">+{selected.points} SAS Points earned 🔥</p>
              </motion.div>
            )}

            {selected.azkar.map((item, i) => {
              const key = `${selected.id}_${item.id}`;
              const current = counts[key] || 0;
              const done = current >= item.maxCount;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`gradient-card rounded-2xl border shadow-card p-4 ${done ? "border-gold/50" : "border-border"}`}
                >
                  <p className="font-arabic text-xl text-right text-foreground leading-relaxed mb-2">
                    {item.arabic}
                  </p>
                  <p className="text-xs text-muted-foreground italic mb-1">{item.transliteration}</p>
                  <p className="text-xs text-muted-foreground mb-4">{item.translation}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleTap(item, selected.id)}
                        disabled={done}
                        className={`w-16 h-16 rounded-2xl font-bold text-lg transition-all active:scale-95 ${
                          done
                            ? "bg-gold/20 text-gold border-2 border-gold"
                            : "gradient-gold text-primary-foreground shadow-gold"
                        }`}
                      >
                        {done ? "✓" : current > 0 ? current : "tap"}
                      </button>
                      <div>
                        <p className="text-sm font-bold text-gold">{current}/{item.maxCount}</p>
                        <p className="text-xs text-muted-foreground">times</p>
                      </div>
                    </div>

                    {item.maxCount > 1 && (
                      <div className="flex gap-1 flex-wrap justify-end max-w-[120px]">
                        {Array.from({ length: Math.min(item.maxCount, 10) }).map((_, idx) => (
                          <div
                            key={idx}
                            className={`w-2.5 h-2.5 rounded-full transition-all ${
                              idx < Math.min(current, 10) ? "bg-gold" : "bg-muted"
                            }`}
                          />
                        ))}
                        {item.maxCount > 10 && <span className="text-xs text-muted-foreground ml-1">...</span>}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
