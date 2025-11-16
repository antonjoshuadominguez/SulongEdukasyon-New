import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import GamePage from "@/pages/game-page";
import ClassPage from "@/pages/class-page";
import StatsPage from "@/pages/stats-page";
import HelpPage from "@/pages/help-page";
import LandingPage from "@/pages/landing-page";
import StudentLeaderboardPage from "@/pages/student-leaderboard-page";
import { ProtectedRoute } from "./lib/protected-route";
import TeacherHome from "@/pages/teacher-home";
import StudentHome from "@/pages/student-home";
import { AuthProvider } from "./hooks/use-auth";
import { LanguageProvider } from "./hooks/use-language";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <ProtectedRoute path="/dashboard" component={HomePage} />
      <ProtectedRoute path="/teacher" component={TeacherHome} roleRequired="teacher" />
      <ProtectedRoute path="/student" component={StudentHome} roleRequired="student" />
      <ProtectedRoute path="/class" component={ClassPage} roleRequired="teacher" />
      <ProtectedRoute path="/stats" component={StatsPage} />
      <ProtectedRoute path="/help" component={HelpPage} />
      <ProtectedRoute path="/game/:lobbyId" component={GamePage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <Router />
        <Toaster />
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
