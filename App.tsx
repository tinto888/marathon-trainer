import { Toaster } from "sonner";
import { Route, Switch } from "wouter";
import React from "react";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import Home from "./pages/Home.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Profile from "./pages/Profile.tsx";
import Workouts from "./pages/Workouts.tsx";
import Races from "./pages/Races.tsx";
import Social from "./pages/Social.tsx";
import TrainingPlan from "./pages/TrainingPlan.tsx";
import AICoach from "./pages/AICoach.tsx";
import WorkoutDetail from "./pages/WorkoutDetail.tsx";
import Compare from "./pages/Compare.tsx";
import DashboardLayout from "./components/DashboardLayout.tsx";

// 인증 및 테마 관련 기능이 파일 누락으로 에러를 유발할 수 있어 임시로 간소화 처리합니다.
function AppLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

// NotFound 페이지가 없을 경우를 대비해 기본 화면을 보여주도록 설정했습니다.
function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/dashboard">{() => <AppLayout><Dashboard /></AppLayout>}</Route>
      <Route path="/profile">{() => <AppLayout><Profile /></AppLayout>}</Route>
      <Route path="/workouts/:id">{() => <AppLayout><WorkoutDetail /></AppLayout>}</Route>
      <Route path="/workouts">{() => <AppLayout><Workouts /></AppLayout>}</Route>
      <Route path="/races">{() => <AppLayout><Races /></AppLayout>}</Route>
      <Route path="/social">{() => <AppLayout><Social /></AppLayout>}</Route>
      <Route path="/compare">{() => <AppLayout><Compare /></AppLayout>}</Route>
      <Route path="/training-plan">{() => <AppLayout><TrainingPlan /></AppLayout>}</Route>
      <Route path="/ai-coach">{() => <AppLayout><AICoach /></AppLayout>}</Route>
      <Route component={Home} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Toaster />
      <Router />
    </ErrorBoundary>
  );
}

export default App;---
