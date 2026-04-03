import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faLock, faCheck, faXmark } from "@fortawesome/free-solid-svg-icons";
import { LogoHero } from "../components/Logo";
import { useAuth } from "../hooks/useAuth";
import { usePageTitle } from "../hooks/usePageTitle";

export function RegisterPage() {
  usePageTitle("Cadastro");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const passwordChecks = [
    { label: "Mínimo 8 caracteres", valid: password.length >= 8 },
    { label: "Uma letra maiúscula", valid: /[A-Z]/.test(password) },
    { label: "Um número", valid: /\d/.test(password) },
    { label: "Um símbolo", valid: /[^a-zA-Z0-9]/.test(password) },
  ];
  const allValid = passwordChecks.every((c) => c.valid);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!allValid) {
      setError("A senha não atende todos os requisitos.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setIsLoading(true);
    try {
      await register({ email, password });
      navigate("/");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          .response?.data?.error?.message;
      setError(msg || "Erro ao criar conta. Tente novamente.");
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
        <h1 className="auth-title">
          Criar <span>Conta</span>
        </h1>
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
                onBlur={() => setPasswordTouched(true)}
                required
              />
            </div>
          </div>
          {password.length > 0 && (
            <ul className="password-checklist">
              {passwordChecks.map((check) => (
                <li key={check.label} className={check.valid ? "check-pass" : passwordTouched ? "check-error" : "check-fail"}>
                  <FontAwesomeIcon icon={check.valid ? faCheck : faXmark} />
                  {check.label}
                </li>
              ))}
            </ul>
          )}
          <div className="form-group">
            <div className="input-icon-wrap">
              <FontAwesomeIcon icon={faLock} className="input-icon" aria-hidden="true" />
              <input
                className="form-input form-input--icon"
                id="confirmPassword"
                type="password"
                placeholder="Confirmar senha"
                aria-label="Confirmar senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>
          {error && <p className="form-error">{error}</p>}
          <div className="form-actions">
            <button className="btn btn--primary btn--full btn--lg" type="submit" disabled={isLoading}>
              {isLoading ? "Criando conta..." : "Criar Conta"}
            </button>
          </div>
        </form>
        <p className="auth-footer">
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
