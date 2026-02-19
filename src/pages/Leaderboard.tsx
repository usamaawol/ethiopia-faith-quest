import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { Trophy, Crown, Flame, Star, Share2, Copy, Check } from "lucide-react";

interface LeaderboardUser {
  uid: string;
  name: string;
  totalScore: number;
  weeklyScore: number;
  streakData: { total: number; quran: number; azkar: number };
  badges: string[];
  rank?: number;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
  if (rank === 2) return <span className="text-lg">🥈</span>;
  if (rank === 3) return <span className="text-lg">🥉</span>;
  return <span className="text-muted-foreground text-sm font-bold">#{rank}</span>;
}

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "lg" ? "w-16 h-16 text-2xl" : size === "sm" ? "w-9 h-9 text-sm" : "w-11 h-11 text-base";
  return (
    <div className={`${sizeClass} rounded-full gradient-gold flex items-center justify-center text-primary-foreground font-bold shadow-gold shrink-0`}>
      {name?.charAt(0)?.toUpperCase() || "?"}
    </div>
  );
}

function LeaderRow({ user, rank, isMe }: { user: LeaderboardUser; rank: number; isMe: boolean }) {
  const bgClass =
    rank === 1 ? "bg-gradient-to-r from-yellow-900/50 to-yellow-800/20 border-yellow-600/40 shadow-gold" :
    rank === 2 ? "bg-gradient-to-r from-slate-700/50 to-slate-600/20 border-slate-500/40" :
    rank === 3 ? "bg-gradient-to-r from-amber-900/50 to-amber-800/20 border-amber-700/40" :
    isMe ? "bg-gold/10 border-gold/40 shadow-gold" :
    "gradient-card border-border";

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(rank * 0.04, 0.5) }}
      className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all ${bgClass}`}
    >
      {/* Rank */}
      <div className="w-9 flex items-center justify-center shrink-0">
        <RankBadge rank={rank} />
      </div>

      {/* Avatar */}
      <Avatar name={user.name} size="sm" />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className={`text-sm font-bold truncate ${isMe ? "text-gold" : "text-foreground"}`}>
            {user.name || "Anonymous"}
          </p>
          {isMe && <span className="text-xs bg-gold/20 text-gold px-1.5 py-0.5 rounded-full shrink-0">You</span>}
          {rank === 1 && <Crown className="w-3 h-3 text-yellow-400 shrink-0" />}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          {(user.streakData?.total || 0) > 0 && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Flame className="w-3 h-3 text-orange-400" />
              {user.streakData.total}d
            </span>
          )}
          {(user.streakData?.quran || 0) > 0 && (
            <span className="text-xs text-muted-foreground">📖 {user.streakData.quran}d</span>
          )}
          {(user.badges?.length || 0) > 0 && (
            <span className="text-xs text-gold">🏅 {user.badges.length}</span>
          )}
        </div>
      </div>

      {/* Score */}
      <div className="text-right shrink-0">
        <p className={`font-bold text-base ${rank <= 3 || isMe ? "text-gold" : "text-foreground"}`}>
          {(user.totalScore || 0).toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground">SAS pts</p>
      </div>
    </motion.div>
  );
}

function PodiumBlock({ user, rank }: { user: LeaderboardUser; rank: number }) {
  const heights = { 1: "h-24", 2: "h-16", 3: "h-12" };
  const labels: Record<number, string> = { 1: "👑", 2: "🥈", 3: "🥉" };
  const isFirst = rank === 1;

  return (
    <div className="flex flex-col items-center gap-1">
      {isFirst && <Crown className="w-7 h-7 text-yellow-400 mb-1" />}
      <Avatar name={user.name} size={isFirst ? "lg" : "md"} />
      <p className="text-xs font-bold text-foreground truncate max-w-[70px] text-center">
        {user.name?.split(" ")[0] || "—"}
      </p>
      <p className="text-xs text-gold font-semibold">{user.totalScore.toLocaleString()}</p>
      <div className={`${heights[rank as 1|2|3]} w-16 rounded-t-xl flex items-start justify-center pt-2 ${
        rank === 1 ? "gradient-gold shadow-gold" : rank === 2 ? "bg-slate-600/50" : "bg-amber-900/40"
      }`}>
        <span className="text-xl">{labels[rank]}</span>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<"national" | "friends">("national");
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadLeaderboard();
  }, [tab, user]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "users"), orderBy("totalScore", "desc"), limit(50));
      const snap = await getDocs(q);
      const data: LeaderboardUser[] = snap.docs.map((d, i) => ({
        ...(d.data() as LeaderboardUser),
        rank: i + 1,
      }));
      setUsers(data);
      const rank = data.findIndex((u) => u.uid === user?.uid);
      setMyRank(rank >= 0 ? rank + 1 : null);
    } catch (err) {
      console.error("Leaderboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const inviteLink = `https://ramadanfaith.app?ref=${user?.uid?.slice(0, 8) || "share"}`;

  const handleShare = async () => {
    const text = `🌙 Join me on RAMADAN FAITH – Build Your Akhirah!\nTrack Quran, Azkar & compete on Ethiopia's leaderboard.\n${inviteLink}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Ramadan Faith", text, url: inviteLink });
      } catch (_) {}
    } else {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const top3 = users.slice(0, 3);
  const rest = users.slice(3);

  return (
    <div className="min-h-screen geometric-bg pb-24">
      {/* Header */}
      <div className="px-4 pt-12 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 gradient-gold rounded-xl flex items-center justify-center shadow-gold">
            <Trophy className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Leaderboard</h1>
            <p className="text-xs text-muted-foreground">🇪🇹 Ethiopia Spiritual Rankings</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-muted rounded-xl p-1 mb-4">
          {([
            { id: "national", label: "🇪🇹 National" },
            { id: "friends", label: "👥 Friends" },
          ] as const).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
                tab === id ? "gradient-gold text-primary-foreground shadow-gold" : "text-muted-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* SAS Points mini info */}
        <div className="gradient-card rounded-xl border border-border p-3 mb-4">
          <p className="text-xs text-muted-foreground text-center mb-2 font-semibold">How to earn SAS Points</p>
          <div className="grid grid-cols-4 gap-1.5 text-center">
            {[
              { label: "Quran", pts: "+50", icon: "📖" },
              { label: "Morn. Azkar", pts: "+20", icon: "🌅" },
              { label: "5 Salah", pts: "+40", icon: "🕌" },
              { label: "7d Streak", pts: "+50", icon: "🔥" },
            ].map((s) => (
              <div key={s.label} className="bg-muted rounded-xl py-2 px-1">
                <p className="text-base">{s.icon}</p>
                <p className="text-gold font-bold text-xs">{s.pts}</p>
                <p className="text-muted-foreground text-[10px] leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 space-y-3">
        {/* My Rank Banner */}
        {myRank && (
          <div className="bg-gold/10 border border-gold/40 rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-gold" />
              <div>
                <p className="text-sm font-bold text-foreground">Your Rank</p>
                <p className="text-xs text-muted-foreground">{profile?.totalScore || 0} SAS pts</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gold">#{myRank}</p>
              {profile?.streakData?.total ? (
                <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                  <Flame className="w-3 h-3 text-orange-400" />{profile.streakData.total}d streak
                </p>
              ) : null}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="gradient-card rounded-2xl border border-border p-4 animate-pulse h-16" />
            ))}
          </div>
        ) : tab === "national" ? (
          <>
            {/* Podium */}
            {top3.length >= 2 && (
              <div className="gradient-card rounded-2xl border border-gold/30 shadow-card p-5 mb-2">
                <p className="text-xs text-center text-gold font-bold mb-4 tracking-widest uppercase">🏆 Promotion Zone</p>
                <div className="flex items-end justify-center gap-4">
                  {top3[1] && <PodiumBlock user={top3[1]} rank={2} />}
                  {top3[0] && <PodiumBlock user={top3[0]} rank={1} />}
                  {top3[2] && <PodiumBlock user={top3[2]} rank={3} />}
                </div>
              </div>
            )}

            {/* All Ranks */}
            <div className="space-y-2">
              {users.map((u, i) => (
                <LeaderRow key={u.uid} user={u} rank={i + 1} isMe={u.uid === user?.uid} />
              ))}
              {users.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-5xl mb-4">🌙</p>
                  <p className="text-foreground font-semibold text-lg">Be the first!</p>
                  <p className="text-muted-foreground text-sm mt-1">Complete daily goals to earn SAS points</p>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Friends Tab */
          <div className="space-y-4">
            <div className="gradient-card rounded-2xl border border-border shadow-card p-6 text-center">
              <div className="w-16 h-16 gradient-gold rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-gold">
                <Share2 className="w-8 h-8 text-primary-foreground" />
              </div>
              <h2 className="font-bold text-foreground text-lg mb-2">Invite Friends & Earn!</h2>
              <p className="text-muted-foreground text-sm mb-1">Share your invite link.</p>
              <p className="text-gold font-semibold text-sm mb-5">
                🎁 +30 SAS Points for every friend who joins!
              </p>

              {/* Invite link */}
              <div className="bg-muted rounded-xl p-3 mb-4 text-left">
                <p className="text-xs text-muted-foreground mb-1">Your invite link</p>
                <p className="text-xs text-gold font-mono break-all">{inviteLink}</p>
              </div>

              <button
                onClick={handleShare}
                className="w-full py-3.5 gradient-gold text-primary-foreground rounded-xl font-bold shadow-gold flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                {copied ? "Copied to clipboard!" : "Share Invite Link"}
              </button>

              {copied && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-gold text-xs mt-2"
                >
                  Link copied! Share it with friends 🎉
                </motion.p>
              )}
            </div>

            {/* How it works */}
            <div className="gradient-card rounded-2xl border border-border p-4 space-y-3">
              <h3 className="font-semibold text-foreground text-sm">How it works</h3>
              {[
                { step: "1", text: "Share your unique invite link" },
                { step: "2", text: "Friend signs up using your link" },
                { step: "3", text: "You both get +30 SAS Points!" },
              ].map(({ step, text }) => (
                <div key={step} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full gradient-gold flex items-center justify-center text-primary-foreground font-bold text-xs shrink-0">
                    {step}
                  </div>
                  <p className="text-sm text-foreground">{text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
