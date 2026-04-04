import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppShell } from "./components/AppShell";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { PlansPage } from "./pages/PlansPage";
import { PlanDetailPage } from "./pages/PlanDetailPage";
import { StartWorkoutPage } from "./pages/StartWorkoutPage";
import { ActiveSessionPage } from "./pages/ActiveSessionPage";
import { ProgressPage } from "./pages/ProgressPage";
import { CatalogPage } from "./pages/CatalogPage";
import { CreatePlanPage } from "./pages/CreatePlanPage";
import { CreateExercisePage } from "./pages/CreateExercisePage";
import { ProfilePage } from "./pages/ProfilePage";
import { NotFoundPage } from "./pages/NotFoundPage";

function App() {
  return (
    <BrowserRouter basename="/app">
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/plans" element={<PlansPage />} />
              <Route path="/plans/new" element={<CreatePlanPage />} />
              <Route path="/plans/:planId" element={<PlanDetailPage />} />
              <Route path="/treino" element={<StartWorkoutPage />} />
              <Route path="/session/active" element={<ActiveSessionPage />} />
              <Route path="/progress" element={<ProgressPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/catalog" element={<CatalogPage />} />
              <Route path="/catalog/new" element={<CreateExercisePage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
