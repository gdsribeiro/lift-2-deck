import { NavLink } from "react-router-dom";

export function BottomNav({ hasActiveSession }: { hasActiveSession: boolean }) {
  const navItems = [
    { to: "/", iconClass: "fa-solid fa-home", label: "Home" },
    { to: hasActiveSession ? "/session/active" : "/treino", iconClass: "fa-solid fa-dumbbell", label: "Treino" },
    { to: "/progress", iconClass: "fa-solid fa-chart-line", label: "Progresso" },
    { to: "/profile", iconClass: "fa-solid fa-user", label: "Conta" },
  ];

  return (
    <nav className="bottom-nav" aria-label="Navegacao principal">
      {navItems.map((item) => (
        <NavLink
          key={item.label}
          to={item.to}
          end={item.to === "/"}
          className={({ isActive }) => `nav-link${isActive ? " active" : ""}${item.label === "Treino" ? " nav-link--primary" : ""}`}
        >
          <span style={{ position: "relative" }}>
            <i className={item.iconClass} />
            {item.label === "Treino" && hasActiveSession && (
              <span className="nav-badge" />
            )}
          </span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
