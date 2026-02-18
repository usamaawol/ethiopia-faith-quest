import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, BookOpen, Compass, Trophy, Users, User } from "lucide-react";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: BookOpen, label: "Quran", path: "/quran" },
  { icon: Compass, label: "Azkar", path: "/azkar" },
  { icon: Trophy, label: "Leaderboard", path: "/leaderboard" },
  { icon: Users, label: "Community", path: "/community" },
  { icon: User, label: "Profile", path: "/profile" },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border safe-area-inset-bottom">
      <div className="flex justify-around items-center px-2 py-2 max-w-lg mx-auto">
        {navItems.map(({ icon: Icon, label, path }) => {
          const active = pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex flex-col items-center gap-1 px-3 py-1 relative flex-1"
            >
              {active && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-0.5 gradient-gold rounded-full"
                />
              )}
              <motion.div
                animate={{ scale: active ? 1.1 : 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className={`p-1.5 rounded-xl transition-colors ${
                  active ? "text-gold" : "text-muted-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
              </motion.div>
              <span className={`text-[10px] font-medium leading-none ${active ? "text-gold" : "text-muted-foreground"}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
      <div className="h-safe-bottom" />
    </nav>
  );
}
