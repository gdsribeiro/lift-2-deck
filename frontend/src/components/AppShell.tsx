import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import * as sessionService from "../services/sessionService";

export function AppShell() {
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const location = useLocation();

  useEffect(() => {
    sessionService.getActiveSession().then((s) => setHasActiveSession(s !== null));
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <main className="app-main">
        <Outlet />
      </main>
      <BottomNav hasActiveSession={hasActiveSession} />
    </div>
  );
}
