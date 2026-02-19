import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Star, Flame, Trophy, Book, Award, ChevronRight, Settings } from "lucide-react";

const BADGES = [
  { id: "streak_7", label: "7-Day Warrior", icon: "🥉", desc: "7 day streak" },
  { id: "streak_30", label: "30-Day Champion", icon: "🥈", desc: "30 day streak" },
  { id: "streak_100", label: "100-Day Legend", icon: "🥇", desc: "100 day streak" },
  { id: "ramadan", label: "Ramadan Completion", icon: "🌙", desc: "Completed full Ramadan" },
  { id: "last10", label: "Last 10 Nights Warrior", icon: "⭐", desc: "Active last 10 nights" },
];

export default function ProfilePage() {
  const { profile, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
  };

  const streaks = profile?.streakData || { quran: 0, azkar: 0, salah: 0, total: 0 };
  const earnedBadges = new Set(profile?.badges || []);

  return (
    <div className="min-h-screen geometric-bg pb-24">
      {/* Header Hero */}
      <div className="relative overflow-hidden px-4 pt-12 pb-8">
        <div className="absolute inset-0 bg-gradient-to-b from-gold/5 to-transparent pointer-events-none" />
        <div className="text-center">
          {/* Avatar */}
          <div className="relative inline-block mb-4">
            <div className="w-24 h-24 rounded-full gradient-gold flex items-center justify-center text-primary-foreground text-4xl font-bold shadow-gold animate-float mx-auto">
              {profile?.name?.charAt(0)?.toUpperCase() || "🌙"}
            </div>
            {profile?.role === "admin" && (
              <div className="absolute -bottom-1 -right-1 bg-gold text-primary-foreground text-xs rounded-full px-2 py-0.5 font-bold">
                Admin
              </div>
            )}
          </div>

          <h1 className="text-2xl font-bold text-foreground">{profile?.name || "Believer"}</h1>
          <p className="text-muted-foreground text-sm">{profile?.email}</p>

          {/* Score */}
          <div className="inline-flex items-center gap-2 mt-3 px-4 py-2 gradient-gold rounded-full shadow-gold">
            <Star className="w-4 h-4 text-primary-foreground" />
            <span className="font-bold text-primary-foreground">{profile?.totalScore || 0} SAS Points</span>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="gradient-card rounded-2xl border border-border shadow-card p-4"
        >
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-gold" />
            Statistics
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Total Score", value: profile?.totalScore || 0, icon: "⭐", unit: "pts" },
              { label: "Weekly Score", value: profile?.weeklyScore || 0, icon: "📅", unit: "pts" },
              { label: "Quran Streak", value: streaks.quran, icon: "📖", unit: "days" },
              { label: "Azkar Streak", value: streaks.azkar, icon: "🤲", unit: "days" },
              { label: "Salah Streak", value: streaks.salah, icon: "🕌", unit: "days" },
              { label: "Total Streak", value: streaks.total, icon: "🔥", unit: "days" },
            ].map((stat) => (
              <div key={stat.label} className="bg-muted rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">{stat.icon}</span>
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <p className="text-xl font-bold text-gold">
                  {stat.value}
                  <span className="text-xs text-muted-foreground ml-1">{stat.unit}</span>
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="gradient-card rounded-2xl border border-border shadow-card p-4"
        >
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-gold" />
            Badges & Achievements
          </h2>
          <div className="space-y-3">
            {BADGES.map((badge) => {
              const earned = earnedBadges.has(badge.id);
              return (
                <div
                  key={badge.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    earned
                      ? "bg-gold/10 border-gold-dim"
                      : "bg-muted/50 border-border opacity-50"
                  }`}
                >
                  <span className="text-2xl">{badge.icon}</span>
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${earned ? "text-foreground" : "text-muted-foreground"}`}>
                      {badge.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{badge.desc}</p>
                  </div>
                  {earned && <span className="text-gold text-xs font-bold">Earned!</span>}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Settings Menu */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="gradient-card rounded-2xl border border-border shadow-card overflow-hidden"
        >
          {[
            { icon: Book, label: "My Quran Progress", sub: "View reading history" },
            { icon: Flame, label: "Streak History", sub: "Track your consistency" },
            { icon: Settings, label: "Notification Settings", sub: "Prayer & reminder alerts" },
          ].map(({ icon: Icon, label, sub }) => (
            <button
              key={label}
              className="flex items-center gap-3 px-4 py-4 w-full hover:bg-muted/50 border-b border-border last:border-0 transition-colors"
            >
              <Icon className="w-5 h-5 text-gold" />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{sub}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </motion.div>

        {/* Logout */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full py-4 rounded-2xl border border-destructive/30 text-destructive flex items-center justify-center gap-2 font-medium text-sm hover:bg-destructive/10 transition-all active:scale-95 disabled:opacity-50"
        >
          <LogOut className="w-4 h-4" />
          {loggingOut ? "Signing out..." : "Sign Out"}
        </motion.button>

        <p className="text-center text-xs text-muted-foreground pb-4">
          RAMADAN FAITH 🌙 – Building Akhirah, One Day at a Time
        </p>
      </div>
    </div>
  );
}
