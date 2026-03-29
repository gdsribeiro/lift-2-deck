import { NavLink } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faDumbbell,
  faChartLine,
  faGear,
} from "@fortawesome/free-solid-svg-icons";

const navItems = [
  { to: "/", icon: faHome, label: "Home" },
  { to: "/treino", icon: faDumbbell, label: "Treino" },
  { to: "/progress", icon: faChartLine, label: "Progresso" },
  { to: "/config", icon: faGear, label: "Configurações" },
];

export function BottomNav({ hasActiveSession }: { hasActiveSession: boolean }) {
  return (
    <nav className="bottom-nav">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          className={({ isActive }) => `nav-link${isActive ? " active" : ""}${item.to === "/treino" ? " nav-link--primary" : ""}`}
        >
          <span style={{ position: "relative" }}>
            <FontAwesomeIcon icon={item.icon} />
            {item.to === "/treino" && hasActiveSession && (
              <span className="nav-badge" />
            )}
          </span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
