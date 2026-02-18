import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { getPrayerTimes, getCurrentAndNextPrayer, PrayerTime } from "@/lib/prayerTimes";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, MapPin, Flame, Star, ChevronRight, Book, Heart } from "lucide-react";

const dailyTips = [
  { type: "Quran", text: "\"Indeed, with hardship will be ease.\" (Quran 94:6)", icon: "📖" },
  { type: "Hadith", text: "\"The best of you are those who learn the Quran and teach it.\" (Bukhari)", icon: "✨" },
  { type: "Reminder", text: "Every step towards the masjid is a reward. Keep going!", icon: "🕌" },
  { type: "Quran", text: "\"And He is with you wherever you are.\" (Quran 57:4)", icon: "📖" },
  { type: "Hadith", text: "\"Whoever says SubhanAllah 100 times, his sins are erased.\" (Muslim)", icon: "✨" },
];

function PrayerCard({ prayer, isActive, isNext }: { prayer: PrayerTime; isActive: boolean; isNext: boolean }) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
      isActive
        ? "gradient-gold shadow-gold"
        : isNext
        ? "bg-muted border border-gold-dim"
        : "bg-muted/50"
    }`}>
      <div className="flex items-center gap-3">
        <span className="text-xl">{prayer.icon}</span>
        <div>
          <p className={`text-sm font-semibold ${isActive ? "text-primary-foreground" : "text-foreground"}`}>
            {prayer.name}
          </p>
          <p className={`font-arabic text-xs ${isActive ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
            {prayer.arabic}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-sm font-bold ${isActive ? "text-primary-foreground" : isNext ? "text-gold" : "text-foreground"}`}>
          {prayer.time}
        </p>
        {isNext && <p className="text-xs text-gold animate-glow-pulse">Next</p>}
        {isActive && <p className="text-xs text-primary-foreground/80">Now</p>}
      </div>
    </div>
  );
}

export default function HomePage() {
  const { profile } = useAuth();
  const [prayers] = useState(() => getPrayerTimes());
  const [prayerInfo, setPrayerInfo] = useState(() => getCurrentAndNextPrayer());
  const [time, setTime] = useState(new Date());
  const [todayTip] = useState(() => dailyTips[new Date().getDay() % dailyTips.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
      setPrayerInfo(getCurrentAndNextPrayer());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const timeStr = time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  const dateStr = time.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const streaks = profile?.streakData || { quran: 0, azkar: 0, salah: 0, total: 0 };

  return (
    <div className="min-h-screen geometric-bg islamic-pattern pb-24">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-navy-card to-transparent" />
        <div className="relative px-4 pt-12 pb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-muted-foreground text-sm">السلام عليكم</p>
              <h1 className="text-2xl font-bold text-foreground">
                {profile?.name?.split(" ")[0] || "Believer"} 👋
              </h1>
              <div className="flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3 text-gold" />
                <span className="text-xs text-muted-foreground">Addis Ababa, Ethiopia 🇪🇹</span>
              </div>
            </div>
            <button className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center">
              <Bell className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Time Display */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6"
          >
            <p className="text-5xl font-bold text-gold font-mono">{timeStr}</p>
            <p className="text-sm text-muted-foreground mt-1">{dateStr}</p>
          </motion.div>

          {/* Next Prayer Countdown */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="gradient-card border border-gold-dim rounded-2xl p-4 text-center shadow-card"
          >
            <p className="text-xs text-muted-foreground mb-1">Next Prayer</p>
            <p className="text-xl font-bold text-gold">{prayerInfo.next.name}</p>
            <p className="font-arabic text-sm text-muted-foreground">{prayerInfo.next.arabic}</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className="w-2 h-2 rounded-full bg-gold animate-pulse-gold" />
              <p className="text-sm font-semibold text-foreground">{prayerInfo.countdown} away</p>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* Streak Banner */}
        {streaks.total > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="gradient-gold rounded-2xl p-4 flex items-center gap-3 shadow-gold"
          >
            <Flame className="w-8 h-8 text-primary-foreground" />
            <div>
              <p className="font-bold text-primary-foreground">{streaks.total} Day Streak! 🔥</p>
              <p className="text-xs text-primary-foreground/80">Keep building your Akhirah</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-2xl font-bold text-primary-foreground">{profile?.totalScore || 0}</p>
              <p className="text-xs text-primary-foreground/80">Total SAS</p>
            </div>
          </motion.div>
        )}

        {/* Prayer Times */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="gradient-card rounded-2xl border border-border shadow-card overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="font-semibold text-sm text-foreground">Prayer Times</h2>
            <span className="text-xs text-muted-foreground">Addis Ababa</span>
          </div>
          <div className="p-3 space-y-2">
            {prayers.map((prayer) => (
              <PrayerCard
                key={prayer.name}
                prayer={prayer}
                isActive={prayerInfo.current?.name === prayer.name}
                isNext={prayerInfo.next.name === prayer.name && prayerInfo.current?.name !== prayer.name}
              />
            ))}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="font-semibold text-sm text-foreground mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: "📖", label: "Quran", sub: "Daily Goal", path: "/quran", color: "from-blue-900/50 to-blue-800/30 border-blue-700/30" },
              { icon: "🕌", label: "Azkar", sub: "Morning & Evening", path: "/azkar", color: "from-emerald-900/50 to-emerald-800/30 border-emerald-700/30" },
              { icon: "🏆", label: "Leaderboard", sub: `Rank #${profile?.totalScore ? "?" : "-"}`, path: "/leaderboard", color: "from-yellow-900/50 to-yellow-800/30 border-yellow-700/30" },
              { icon: "👥", label: "Community", sub: "Connect & Share", path: "/community", color: "from-purple-900/50 to-purple-800/30 border-purple-700/30" },
            ].map((item) => (
              <a
                key={item.path}
                href={item.path}
                className={`gradient-card bg-gradient-to-br ${item.color} border rounded-2xl p-4 flex flex-col gap-2 hover:scale-[1.02] active:scale-95 transition-transform shadow-card`}
              >
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <p className="font-semibold text-sm text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.sub}</p>
                </div>
              </a>
            ))}
          </div>
        </motion.div>

        {/* Streak Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="gradient-card rounded-2xl border border-border shadow-card p-4"
        >
          <h2 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
            <Flame className="w-4 h-4 text-gold" />
            Your Streaks
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Quran", days: streaks.quran, icon: "📖" },
              { label: "Azkar", days: streaks.azkar, icon: "🤲" },
              { label: "Salah", days: streaks.salah, icon: "🕌" },
            ].map((s) => (
              <div key={s.label} className="bg-muted rounded-xl p-3 text-center">
                <span className="text-xl">{s.icon}</span>
                <p className="text-xl font-bold text-gold mt-1">{s.days}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xs text-muted-foreground">days</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Daily Tip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="gradient-card rounded-2xl border border-gold-dim shadow-card p-4 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-gold/5 rounded-full -translate-y-8 translate-x-8" />
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-4 h-4 text-gold" />
            <span className="text-xs font-medium text-gold">Daily {todayTip.type}</span>
          </div>
          <p className="text-sm text-foreground leading-relaxed italic">{todayTip.text}</p>
          <div className="absolute bottom-4 right-4 text-3xl opacity-20">{todayTip.icon}</div>
        </motion.div>

        {/* Badges */}
        {profile?.badges && profile.badges.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="gradient-card rounded-2xl border border-border shadow-card p-4"
          >
            <h2 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
              <Heart className="w-4 h-4 text-gold" />
              Your Badges
            </h2>
            <div className="flex gap-2 flex-wrap">
              {profile.badges.map((badge) => (
                <span key={badge} className="text-2xl" title={badge}>
                  {badge.includes("7") ? "🥉" : badge.includes("30") ? "🥈" : "🥇"}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
