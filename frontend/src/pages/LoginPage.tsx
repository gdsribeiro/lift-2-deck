import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogoHero } from "../components/Logo";
import { useAuth } from "../hooks/useAuth";
import { usePageTitle } from "../hooks/usePageTitle";

export function LoginPage() {
  usePageTitle("Login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await login({ email, password });
      navigate("/");
    } catch {
      setError("Credenciais incorretas!");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-hero">
          <LogoHero />
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <div className="input-icon-wrap">
              <i className="fa-solid fa-envelope input-icon" aria-hidden="true" />
              <input
                className="form-input form-input--icon"
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="password">Senha</label>
            <div className="input-icon-wrap">
              <i className="fa-solid fa-lock input-icon" aria-hidden="true" />
              <input
                className="form-input form-input--icon"
                id="password"
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>
          {error && <div className="alert alert--error">{error}</div>}
          <div className="form-actions">
            <button className="btn btn--primary btn--full btn--lg" type="submit" disabled={isLoading}>
              {isLoading ? "Entrando..." : "Entrar"}
            </button>
          </div>
        </form>
        <p className="auth-footer">
          Não tem conta? <Link to="/register">Cadastre-se</Link>
        </p>
      </div>
    </div>
  );
}
