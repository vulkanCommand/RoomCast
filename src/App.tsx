import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppHeader } from "@/components/AppHeader";
import { useAuthStore } from "@/store/auth";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Join from "./pages/Join";
import Room from "./pages/Room";
import Ended from "./pages/Ended";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { isAuthed, isLoading } = useAuthStore();

  if (isLoading) return null;
  if (!isAuthed) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  const listenToAuthState = useAuthStore((state) => state.listenToAuthState);

  useEffect(() => listenToAuthState(), [listenToAuthState]);

  return (
    <>
      <AppHeader />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<RequireAuth><Home /></RequireAuth>} />
        <Route path="/join" element={<RequireAuth><Join /></RequireAuth>} />
        <Route path="/room/:roomId" element={<RequireAuth><Room /></RequireAuth>} />
        <Route path="/ended" element={<Ended />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
