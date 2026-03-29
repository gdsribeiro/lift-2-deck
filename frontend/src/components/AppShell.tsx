import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRightFromBracket } from "@fortawesome/free-solid-svg-icons";
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
        <span className="app-topbar__brand">Lift<span style={{ color: "var(--color-primary-bright)" }}>2</span>Deck</span>
        <button className="btn btn--ghost btn--icon" onClick={logout} title="Sair">
          <FontAwesomeIcon icon={faArrowRightFromBracket} />
        </button>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <BottomNav hasActiveSession={hasActiveSession} />
    </div>
  );
}
