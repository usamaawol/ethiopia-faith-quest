import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { Trophy, Crown, Flame, Star } from "lucide-react";

interface LeaderboardUser {
  uid: string;
  name: string;
  totalScore: number;
  weeklyScore: number;
  streakData: { total: number };
  badges: string[];
  rank?: number;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
  if (rank === 2) return <span className="font-bold text-slate-400 text-sm">🥈</span>;
  if (rank === 3) return <span className="font-bold text-amber-600 text-sm">🥉</span>;
  return <span className="text-muted-foreground text-xs font-bold">#{rank}</span>;
}

function LeaderRow({ user, rank, isMe }: { user: LeaderboardUser; rank: number; isMe: boolean }) {
  const isTop3 = rank <= 3;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.04 }}
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all ${
        rank === 1
          ? "gradient-rank1 border-yellow-600/30 shadow-gold"
          : rank === 2
          ? "gradient-rank2 bg-opacity-10 border-slate-600/30"
          : rank === 3
          ? "gradient-rank3 bg-opacity-10 border-amber-800/30"
          : isMe
          ? "bg-gold/10 border-gold-dim shadow-gold"
          : "gradient-card border-border"
      }`}
    >
      <div className="w-8 flex items-center justify-center shrink-0">
        <RankBadge rank={rank} />
      </div>

      <div className="w-10 h-10 rounded-full gradient-gold flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0 shadow-gold">
        {user.name?.charAt(0)?.toUpperCase() || "?"}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <p className={`text-sm font-semibold truncate ${rank <= 3 ? "text-foreground" : isMe ? "text-gold" : "text-foreground"}`}>
            {user.name || "Anonymous"}
            {isMe && <span className="ml-1 text-xs text-gold">(You)</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {user.streakData?.total > 0 && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Flame className="w-3 h-3 text-orange-400" />
              {user.streakData.total}d streak
            </span>
          )}
          {user.badges?.length > 0 && (
            <span className="text-xs text-gold">{user.badges.length} badges</span>
          )}
        </div>
      </div>

      <div className="text-right shrink-0">
        <p className={`font-bold text-sm ${rank <= 3 ? "text-foreground" : "text-gold"}`}>
          {user.totalScore.toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground">SAS pts</p>
      </div>
    </motion.div>
  );
}

export default function LeaderboardPage() {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<"national" | "friends">("national");
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState<number | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, [tab]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "users"),
        orderBy("totalScore", "desc"),
        limit(50)
      );
      const snap = await getDocs(q);
      const data: LeaderboardUser[] = snap.docs.map((d, i) => ({
        ...(d.data() as LeaderboardUser),
        rank: i + 1,
      }));
      setUsers(data);

      const rank = data.findIndex((u) => u.uid === user?.uid);
      setMyRank(rank >= 0 ? rank + 1 : null);
    } catch (err) {
      console.error("Failed to load leaderboard:", err);
    } finally {
      setLoading(false);
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
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                tab === id ? "gradient-gold text-primary-foreground shadow-gold" : "text-muted-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* SAS Points Info */}
        <div className="gradient-card rounded-xl border border-border p-3 mb-4">
          <p className="text-xs text-muted-foreground text-center mb-2 font-semibold">Spiritual Activity Score (SAS)</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Daily Quran", pts: "+50" },
              { label: "Morning Azkar", pts: "+20" },
              { label: "5 Salah", pts: "+40" },
            ].map((s) => (
              <div key={s.label} className="bg-muted rounded-lg py-2">
                <p className="text-gold font-bold text-xs">{s.pts}</p>
                <p className="text-muted-foreground text-xs leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 space-y-3">
        {/* My Rank Banner */}
        {myRank && (
          <div className="bg-gold/10 border border-gold-dim rounded-2xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-gold" />
              <span className="text-sm font-semibold text-foreground">Your rank</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-gold font-bold">#{myRank}</span>
              <span className="text-muted-foreground text-sm">{profile?.totalScore || 0} pts</span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="gradient-card rounded-2xl border border-border p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-muted rounded-full" />
                  <div className="w-10 h-10 bg-muted rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-muted rounded w-1/2" />
                    <div className="h-2 bg-muted rounded w-1/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : tab === "national" ? (
          <>
            {/* Top 3 Podium */}
            {top3.length > 0 && (
              <div className="gradient-card rounded-2xl border border-gold-dim shadow-card p-4 mb-2">
                <p className="text-xs text-center text-gold font-semibold mb-3">🏆 Promotion Zone</p>
                <div className="flex items-end justify-center gap-4">
                  {top3[1] && (
                    <div className="text-center flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full gradient-gold flex items-center justify-center text-primary-foreground font-bold shadow-gold mb-1">
                        {top3[1].name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className="bg-slate-700/50 rounded-t-xl w-16 h-16 flex flex-col items-center justify-center">
                        <span className="text-lg">🥈</span>
                        <p className="text-xs text-muted-foreground truncate w-full text-center px-1">{top3[1].name?.split(" ")[0]}</p>
                      </div>
                    </div>
                  )}
                  {top3[0] && (
                    <div className="text-center flex flex-col items-center">
                      <Crown className="w-6 h-6 text-yellow-400 mb-1" />
                      <div className="w-14 h-14 rounded-full gradient-gold flex items-center justify-center text-primary-foreground font-bold text-lg shadow-gold mb-1 ring-2 ring-yellow-400">
                        {top3[0].name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className="gradient-gold rounded-t-xl w-16 h-20 flex flex-col items-center justify-center shadow-gold">
                        <span className="text-xl">👑</span>
                        <p className="text-xs text-primary-foreground truncate w-full text-center px-1 font-bold">{top3[0].name?.split(" ")[0]}</p>
                        <p className="text-xs text-primary-foreground/80">{top3[0].totalScore}</p>
                      </div>
                    </div>
                  )}
                  {top3[2] && (
                    <div className="text-center flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full gradient-gold flex items-center justify-center text-primary-foreground font-bold shadow-gold mb-1">
                        {top3[2].name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className="bg-amber-900/30 rounded-t-xl w-16 h-12 flex flex-col items-center justify-center">
                        <span className="text-lg">🥉</span>
                        <p className="text-xs text-muted-foreground truncate w-full text-center px-1">{top3[2].name?.split(" ")[0]}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* All Ranks */}
            <div className="space-y-2">
              {users.map((u, i) => (
                <LeaderRow
                  key={u.uid}
                  user={u}
                  rank={i + 1}
                  isMe={u.uid === user?.uid}
                />
              ))}
              {users.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-4xl mb-3">🌙</p>
                  <p className="text-muted-foreground">Be the first to join the leaderboard!</p>
                  <p className="text-xs text-muted-foreground mt-1">Complete daily goals to earn SAS points</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">👥</p>
            <p className="text-foreground font-semibold">Friends Leaderboard</p>
            <p className="text-muted-foreground text-sm mt-1">Coming soon — invite friends to compete!</p>
          </div>
        )}
      </div>
    </div>
  );
}
