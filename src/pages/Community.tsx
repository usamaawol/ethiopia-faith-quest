import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import {
  collection, query, orderBy, limit, getDocs, addDoc, updateDoc,
  doc, arrayUnion, arrayRemove, deleteDoc, serverTimestamp, onSnapshot
} from "firebase/firestore";
import { Heart, MessageCircle, Trash2, Flag, Send, Pin } from "lucide-react";

interface Post {
  id: string;
  userId: string;
  userName: string;
  content: string;
  likes: string[];
  replies: Reply[];
  createdAt: { seconds: number };
  pinned?: boolean;
  reported?: string[];
}

interface Reply {
  userId: string;
  userName: string;
  content: string;
  createdAt: number;
}

function timeAgo(seconds: number): string {
  const diff = Math.floor(Date.now() / 1000) - seconds;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function CommunityPage() {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    const q = query(collection(db, "communityPosts"), orderBy("createdAt", "desc"), limit(50));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Post));
      // Sort pinned first
      data.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
      setPosts(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handlePost = async () => {
    if (!user || !newPost.trim() || submitting) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, "communityPosts"), {
        userId: user.uid,
        userName: profile?.name || "Believer",
        content: newPost.trim(),
        likes: [],
        replies: [],
        reported: [],
        pinned: false,
        createdAt: serverTimestamp(),
      });
      setNewPost("");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleLike = async (post: Post) => {
    if (!user) return;
    const ref = doc(db, "communityPosts", post.id);
    const liked = post.likes?.includes(user.uid);
    await updateDoc(ref, {
      likes: liked ? arrayRemove(user.uid) : arrayUnion(user.uid),
    });
  };

  const handleReply = async (postId: string) => {
    if (!user || !replyText.trim()) return;
    const ref = doc(db, "communityPosts", postId);
    await updateDoc(ref, {
      replies: arrayUnion({
        userId: user.uid,
        userName: profile?.name || "Believer",
        content: replyText.trim(),
        createdAt: Date.now(),
      }),
    });
    setReplyText("");
    setReplyingTo(null);
  };

  const deletePost = async (postId: string) => {
    await deleteDoc(doc(db, "communityPosts", postId));
  };

  return (
    <div className="min-h-screen geometric-bg pb-24">
      {/* Header */}
      <div className="px-4 pt-12 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-700 to-purple-900 rounded-xl flex items-center justify-center">
            <span className="text-xl">👥</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Community</h1>
            <p className="text-xs text-muted-foreground">🇪🇹 Ethiopian Muslim Community</p>
          </div>
        </div>

        {/* Post composer */}
        <div className="gradient-card rounded-2xl border border-border shadow-card p-4">
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="Share a reflection, dua, or reminder... 🌙"
            rows={3}
            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground text-sm resize-none focus:outline-none"
          />
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-muted-foreground">{newPost.length}/500</span>
            <button
              onClick={handlePost}
              disabled={!newPost.trim() || submitting}
              className="flex items-center gap-2 px-4 py-2 gradient-gold text-primary-foreground rounded-xl text-sm font-semibold shadow-gold disabled:opacity-50 active:scale-95 transition-all"
            >
              <Send className="w-3 h-3" />
              Share
            </button>
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="px-4 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="gradient-card rounded-2xl border border-border p-4 animate-pulse space-y-3">
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-muted rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-muted rounded w-1/3" />
                    <div className="h-2 bg-muted rounded w-1/4" />
                  </div>
                </div>
                <div className="h-12 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">💬</p>
            <p className="text-foreground font-semibold">Be the first to share!</p>
            <p className="text-muted-foreground text-sm mt-1">Share a dua, reminder, or reflection</p>
          </div>
        ) : (
          posts.map((post, i) => {
            const liked = post.likes?.includes(user?.uid || "");
            const isOwn = post.userId === user?.uid;
            const isAdmin = profile?.role === "admin";

            return (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`gradient-card rounded-2xl border shadow-card overflow-hidden ${
                  post.pinned ? "border-gold-dim" : "border-border"
                }`}
              >
                {post.pinned && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-gold/10 border-b border-gold-dim">
                    <Pin className="w-3 h-3 text-gold" />
                    <span className="text-xs text-gold font-medium">Pinned by Admin</span>
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full gradient-gold flex items-center justify-center text-primary-foreground font-bold text-sm shadow-gold">
                        {post.userName?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{post.userName}</p>
                        <p className="text-xs text-muted-foreground">
                          {post.createdAt?.seconds ? timeAgo(post.createdAt.seconds) : "just now"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!isOwn && (
                        <button className="text-muted-foreground hover:text-destructive transition-colors">
                          <Flag className="w-4 h-4" />
                        </button>
                      )}
                      {(isOwn || isAdmin) && (
                        <button
                          onClick={() => deletePost(post.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-foreground leading-relaxed mb-4">{post.content}</p>

                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => toggleLike(post)}
                      className={`flex items-center gap-1.5 text-xs font-medium transition-all active:scale-95 ${
                        liked ? "text-red-400" : "text-muted-foreground hover:text-red-400"
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${liked ? "fill-red-400" : ""}`} />
                      {post.likes?.length || 0}
                    </button>

                    <button
                      onClick={() => setReplyingTo(replyingTo === post.id ? null : post.id)}
                      className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      {post.replies?.length || 0}
                    </button>
                  </div>

                  {/* Replies */}
                  {post.replies && post.replies.length > 0 && (
                    <div className="mt-3 space-y-2 pl-4 border-l-2 border-border">
                      {post.replies.slice(-3).map((reply, ri) => (
                        <div key={ri}>
                          <span className="text-xs font-semibold text-gold">{reply.userName}: </span>
                          <span className="text-xs text-foreground">{reply.content}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <AnimatePresence>
                    {replyingTo === post.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3"
                      >
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Write a reply..."
                            className="flex-1 bg-muted rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none border border-border focus:border-gold"
                            onKeyDown={(e) => e.key === "Enter" && handleReply(post.id)}
                          />
                          <button
                            onClick={() => handleReply(post.id)}
                            className="w-10 h-10 gradient-gold rounded-xl flex items-center justify-center shadow-gold"
                          >
                            <Send className="w-4 h-4 text-primary-foreground" />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
