import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { ExerciseIcon, getGroupColor } from "../components/ExerciseIcon";
import * as catalogService from "../services/catalogService";
import type { CatalogExercise } from "../types";

export function CatalogPage() {
  usePageTitle("Exercicios");
  const [catalog, setCatalog] = useState<CatalogExercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<CatalogExercise | null>(null);

  useEffect(() => {
    catalogService.getCatalog().then(setCatalog).finally(() => setIsLoading(false));
  }, []);

  async function confirmDelete() {
    if (!deleteTarget) return;
    await catalogService.deleteExercise(deleteTarget.id);
    setCatalog((prev) => prev.filter((c) => c.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  if (isLoading) return <div className="loader" />;

  const byCategory = catalog.reduce<Record<string, CatalogExercise[]>>((acc, c) => {
    (acc[c.category] ??= []).push(c);
    return acc;
  }, {});

  return (
    <div>
      <Link to="/profile" className="btn btn--ghost back-link">
        <i className="fa-solid fa-arrow-left" /> Conta
      </Link>
      <div className="page-header">
        <h1 className="page-title">Exercicios</h1>
        <button className="btn btn--primary" disabled style={{ opacity: 0.5, cursor: "not-allowed" }}>
          <i className="fa-solid fa-plus" /> Novo
        </button>
      </div>

      {catalog.length === 0 ? (
        <div className="empty">
          <div className="empty__icon"><i className="fa-solid fa-book-open" /></div>
          <p className="empty__text">Catalogo vazio. Os exercicios que voce adicionar aparecem aqui.</p>
        </div>
      ) : (
        Object.entries(byCategory).map(([cat, items]) => (
          <section key={cat} className="section--flush">
            <div className="section__header">
              <h2 className="section__title">{cat}</h2>
              <span className="badge">{items.length}</span>
            </div>
            <div className="exercise-list">
              {items.map((ex) => (
                <div key={ex.id} className="exercise-item">
                  <span className="exercise-icon" style={{ color: getGroupColor(ex.category) }}>
                    <ExerciseIcon name={ex.name} />
                  </span>
                  <div className="exercise-info">
                    <div className="exercise-name">{ex.name}</div>
                    <div className="exercise-meta">
                      <span>{ex.exercise_type === "cardio" ? "Cardio" : "Forca"}</span>
                    </div>
                  </div>
                  <button className="btn btn--icon btn--ghost" disabled style={{ opacity: 0.3, cursor: "not-allowed" }}>
                    <i className="fa-solid fa-trash" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        ))
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir exercicio?"
        description={`"${deleteTarget?.name}" sera removido do catalogo.`}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
