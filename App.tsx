import { Toaster } from "sonner";
import { Route, Switch } from "wouter";
import React from "react";

import ErrorBoundary from "@/components/ErrorBoundary"; 
import Home from "@/pages/Home";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import Profile from "@/pages/Profile";
import Workouts from "@/pages/Workouts";
import Races from "@/pages/Races";
import Social from "@/pages/Social";
import TrainingPlan from "@/pages/TrainingPlan";
import AICoach from "@/pages/AICoach";
import WorkoutDetail from "@/pages/WorkoutDetail";
import Compare from "@/pages/Compare";
import DashboardLayout from "@/components/DashboardLayout";

function AppLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

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

export default App;
