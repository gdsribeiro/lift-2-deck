import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faLock } from "@fortawesome/free-solid-svg-icons";
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
      setError("Email ou senha inválidos.");
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
            <div className="input-icon-wrap">
              <FontAwesomeIcon icon={faEnvelope} className="input-icon" aria-hidden="true" />
              <input
                className="form-input form-input--icon"
                id="email"
                type="email"
                placeholder="seu@email.com"
                aria-label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <div className="input-icon-wrap">
              <FontAwesomeIcon icon={faLock} className="input-icon" aria-hidden="true" />
              <input
                className="form-input form-input--icon"
                id="password"
                type="password"
                placeholder="Senha"
                aria-label="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>
          {error && <p className="form-error">{error}</p>}
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
