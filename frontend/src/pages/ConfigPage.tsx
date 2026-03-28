import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSun, faMoon, faArrowRightFromBracket } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../hooks/useAuth";

function getTheme(): "dark" | "light" {
  return (document.documentElement.getAttribute("data-theme") as "dark" | "light") || "dark";
}

function setTheme(theme: "dark" | "light") {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
}

export function ConfigPage() {
  const [theme, setThemeState] = useState<"dark" | "light">(getTheme);
  const { logout } = useAuth();

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setThemeState(next);
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Config</h1>
      </div>

      <section className="section" style={{ marginTop: 0 }}>
        <div className="section__header">
          <h2 className="section__title">Aparencia</h2>
        </div>
        <div className="card">
          <div className="card__row">
            <div>
              <div className="card__title">Tema</div>
              <div className="card__subtitle">{theme === "dark" ? "Escuro" : "Claro"}</div>
            </div>
            <button className="btn btn--icon btn--secondary" onClick={toggleTheme}>
              <FontAwesomeIcon icon={theme === "dark" ? faSun : faMoon} />
            </button>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section__header">
          <h2 className="section__title">Conta</h2>
        </div>
        <button className="btn btn--danger btn--full" onClick={logout}>
          <FontAwesomeIcon icon={faArrowRightFromBracket} /> Sair
        </button>
      </section>
    </div>
  );
}
