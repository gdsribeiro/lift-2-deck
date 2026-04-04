import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div style={{ textAlign: "center", padding: "var(--space-3xl) var(--space-lg)" }}>
      <div style={{ fontSize: "4rem", fontFamily: "var(--font-display)", fontWeight: "var(--weight-black)", color: "var(--color-text-muted)", marginBottom: "var(--space-md)" }}>
        404
      </div>
      <p style={{ color: "var(--color-text-muted)", marginBottom: "var(--space-xl)" }}>
        Pagina nao encontrada.
      </p>
      <Link to="/" className="btn btn--primary">
        Voltar ao inicio
      </Link>
    </div>
  );
}
