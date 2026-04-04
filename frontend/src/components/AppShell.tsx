import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { useAuth } from "../hooks/useAuth";
import * as sessionService from "../services/sessionService";

export function AppShell() {
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const { logout } = useAuth();
  const location = useLocation();

  useEffect(() => {
    sessionService.getActiveSession().then((s) => setHasActiveSession(s !== null));
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <span className="app-topbar__brand">Lift<span style={{ color: "var(--color-primary-bright)" }}>Deck</span></span>
        <button className="btn btn--ghost btn--icon" onClick={logout} title="Sair">
          <i className="fa-solid fa-arrow-right-from-bracket" />
        </button>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <BottomNav hasActiveSession={hasActiveSession} />
    </div>
  );
}
