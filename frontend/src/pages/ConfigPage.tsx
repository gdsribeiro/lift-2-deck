import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  // faSun,
  faMoon,
  faListCheck,
  faDumbbell,
  faDownload,
  faUpload,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../hooks/useAuth";
import * as authService from "../services/authService";
import client from "../api/client";

function getTheme(): "dark" | "light" {
  return (document.documentElement.getAttribute("data-theme") as "dark" | "light") || "dark";
}

// function setTheme(theme: "dark" | "light") {
//   document.documentElement.setAttribute("data-theme", theme);
//   localStorage.setItem("theme", theme);
//   const meta = document.querySelector('meta[name="theme-color"]');
//   if (meta) meta.setAttribute("content", theme === "dark" ? "#0a0a0a" : "#f5f5f0");
// }

export function ConfigPage() {
  usePageTitle("Configurações");
  const [_theme] = useState<"dark" | "light">(getTheme);
  const { user, logout } = useAuth();

  // Profile
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileEmail, setProfileEmail] = useState(user?.email ?? "");
  const [profileMsg, setProfileMsg] = useState("");

  // Delete
  const [confirmDelete, setConfirmDelete] = useState(false);

  // function toggleTheme() {
  //   const next = theme === "dark" ? "light" : "dark";
  //   setTheme(next);
  //   setThemeState(next);
  // }

  async function handleUpdateProfile(e: FormEvent) {
    e.preventDefault();
    try {
      await authService.updateProfile({ email: profileEmail });
      setProfileMsg("Perfil atualizado!");
      setEditingProfile(false);
      setTimeout(() => setProfileMsg(""), 3000);
    } catch {
      setProfileMsg("Erro ao atualizar perfil.");
    }
  }

  async function handleDeleteAccount() {
    await authService.deleteAccount();
    logout();
  }

  async function handleExport() {
    try {
      const [plans, catalog, history] = await Promise.all([
        client.get("/plans").then((r) => r.data),
        client.get("/catalog").then((r) => r.data),
        client.get("/history?limit=1000").then((r) => r.data),
      ]);
      const data = { plans, catalog, history, exported_at: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `liftdeck-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Erro ao exportar dados.");
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Configurações</h1>
      </div>

      {/* Meus Planos */}
      <Link to="/plans" className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", textDecoration: "none", color: "inherit" }}>
        <div>
          <div className="card__title">Meus Planos</div>
          <div className="card__subtitle">Gerenciar treinos e exercícios</div>
        </div>
        <FontAwesomeIcon icon={faListCheck} style={{ color: "var(--color-text-muted)", fontSize: "var(--text-lg)" }} />
      </Link>

      {/* Exercicios */}
      <Link to="/catalog" className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", textDecoration: "none", color: "inherit", marginTop: "var(--space-sm)" }}>
        <div>
          <div className="card__title">Exercicios</div>
          <div className="card__subtitle">Cadastrar e gerenciar exercicios</div>
        </div>
        <FontAwesomeIcon icon={faDumbbell} style={{ color: "var(--color-text-muted)", fontSize: "var(--text-lg)" }} />
      </Link>

      {/* Aparencia */}
      <section className="section">
        <div className="section__header">
          <h2 className="section__title">Aparência</h2>
        </div>
        <div className="card" style={{ opacity: 0.5, pointerEvents: "none" }}>
          <div className="card__row">
            <div>
              <div className="card__title">Tema</div>
              <div className="card__subtitle">Escuro — em breve mais opções</div>
            </div>
            <button className="btn btn--icon btn--secondary" disabled>
              <FontAwesomeIcon icon={faMoon} />
            </button>
          </div>
        </div>
      </section>

      {/* Conta */}
      <section className="section">
        <div className="section__header">
          <h2 className="section__title">Conta</h2>
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {/* Perfil */}
          {!editingProfile ? (
            <div style={{ padding: "var(--space-lg)" }}>
              <div className="card__row">
                <div>
                  <div className="card__title">{user?.email}</div>
                  <div className="card__subtitle">Email da conta</div>
                </div>
                <button className="btn btn--secondary" onClick={() => { setEditingProfile(true); setProfileEmail(user?.email ?? ""); }}>
                  Editar
                </button>
              </div>
              {profileMsg && <p style={{ color: "var(--color-success)", fontSize: "var(--text-sm)", marginTop: "var(--space-sm)" }}>{profileMsg}</p>}
            </div>
          ) : (
            <div style={{ padding: "var(--space-lg)" }}>
              <form onSubmit={handleUpdateProfile}>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} required />
                </div>
                <div className="form-actions">
                  <button className="btn btn--primary" type="submit">Salvar</button>
                  <button className="btn btn--secondary" type="button" onClick={() => setEditingProfile(false)}>Cancelar</button>
                </div>
              </form>
            </div>
          )}

          <div className="divider" />

          {/* Dados */}
          <div style={{ padding: "var(--space-lg)" }}>
            <div className="card__row" style={{ marginBottom: "var(--space-md)" }}>
              <div>
                <div className="card__title">Dados</div>
                <div className="card__subtitle">Exportar ou importar seus treinos</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "var(--space-md)" }}>
              <button className="btn btn--secondary" style={{ flex: 1 }} onClick={handleExport}>
                <FontAwesomeIcon icon={faDownload} /> Exportar
              </button>
              <button className="btn btn--secondary" style={{ flex: 1, opacity: 0.5, cursor: "not-allowed" }} disabled>
                <FontAwesomeIcon icon={faUpload} /> Importar
              </button>
            </div>
          </div>

          <div className="divider" />

          {/* Excluir conta */}
          <div style={{ padding: "var(--space-lg)" }}>
            {!confirmDelete ? (
              <button className="btn btn--ghost btn--full" style={{ color: "var(--color-danger)" }} onClick={() => setConfirmDelete(true)}>
                Excluir minha conta
              </button>
            ) : (
              <div style={{ borderLeft: "3px solid var(--color-danger)", paddingLeft: "var(--space-lg)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", marginBottom: "var(--space-md)" }}>
                  <FontAwesomeIcon icon={faTriangleExclamation} style={{ color: "var(--color-danger)" }} />
                  <strong>Tem certeza?</strong>
                </div>
                <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", marginBottom: "var(--space-lg)" }}>
                  Esta ação é irreversível. Todos os seus dados serão apagados.
                </p>
                <div className="form-actions">
                  <button className="btn btn--danger" onClick={handleDeleteAccount}>
                    Sim, excluir
                  </button>
                  <button className="btn btn--secondary" onClick={() => setConfirmDelete(false)}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

    </div>
  );
}
