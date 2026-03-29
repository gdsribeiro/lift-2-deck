import { NavLink } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faDumbbell,
  faChartLine,
  faGear,
} from "@fortawesome/free-solid-svg-icons";

export function BottomNav({ hasActiveSession }: { hasActiveSession: boolean }) {
  const navItems = [
    { to: "/", icon: faHome, label: "Home" },
    { to: hasActiveSession ? "/session/active" : "/treino", icon: faDumbbell, label: "Treino" },
    { to: "/progress", icon: faChartLine, label: "Progresso" },
    { to: "/config", icon: faGear, label: "Configurações" },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => (
        <NavLink
          key={item.label}
          to={item.to}
          end={item.to === "/"}
          className={({ isActive }) => `nav-link${isActive ? " active" : ""}${item.label === "Treino" ? " nav-link--primary" : ""}`}
        >
          <span style={{ position: "relative" }}>
            <FontAwesomeIcon icon={item.icon} />
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
