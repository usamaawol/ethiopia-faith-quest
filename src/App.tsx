import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";
import AuthPage from "@/pages/Auth";
import HomePage from "@/pages/Home";
import QuranPage from "@/pages/Quran";
import AzkarPage from "@/pages/Azkar";
import LeaderboardPage from "@/pages/Leaderboard";
import CommunityPage from "@/pages/Community";
import ProfilePage from "@/pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen geometric-bg islamic-pattern flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-float">🌙</div>
          <p className="text-gold font-arabic text-xl">رمضان فيث</p>
          <div className="mt-4 flex gap-1 justify-center">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-gold animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="max-w-lg mx-auto relative">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/quran" element={<QuranPage />} />
        <Route path="/azkar" element={<AzkarPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
