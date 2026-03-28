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
import { CardioPage } from "./pages/CardioPage";
import { ConfigPage } from "./pages/ConfigPage";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/plans" element={<PlansPage />} />
              <Route path="/plans/:planId" element={<PlanDetailPage />} />
              <Route path="/treino" element={<StartWorkoutPage />} />
              <Route path="/session/active" element={<ActiveSessionPage />} />
              <Route path="/progress" element={<ProgressPage />} />
              <Route path="/cardio" element={<CardioPage />} />
              <Route path="/config" element={<ConfigPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
