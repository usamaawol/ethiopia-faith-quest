import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: "user" | "admin";
  totalScore: number;
  dailyScore: number;
  weeklyScore: number;
  streakData: {
    quran: number;
    azkar: number;
    salah: number;
    total: number;
  };
  badges: string[];
  createdAt: unknown;
  photoURL?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function createUserProfile(user: User, name?: string): Promise<UserProfile> {
  const profile: UserProfile = {
    uid: user.uid,
    name: name || user.displayName || "Believer",
    email: user.email || "",
    role: "user",
    totalScore: 0,
    dailyScore: 0,
    weeklyScore: 0,
    streakData: { quran: 0, azkar: 0, salah: 0, total: 0 },
    badges: [],
    createdAt: serverTimestamp(),
    ...(user.photoURL ? { photoURL: user.photoURL } : {}),
  };
  await setDoc(doc(db, "users", user.uid), profile, { merge: true });
  return profile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (u: User) => {
    const ref = doc(db, "users", u.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      setProfile(snap.data() as UserProfile);
    } else {
      const p = await createUserProfile(u);
      setProfile(p);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      try {
        if (u) await loadProfile(u);
        else setProfile(null);
      } catch (err) {
        console.error("Failed to load profile:", err);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, name: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    await createUserProfile(cred.user, name);
  };

  const signInWithGoogle = async () => {
    const cred = await signInWithPopup(auth, googleProvider);
    const ref = doc(db, "users", cred.user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await createUserProfile(cred.user);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signInWithGoogle, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
