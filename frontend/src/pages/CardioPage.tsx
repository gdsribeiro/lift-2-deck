import { type FormEvent, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import * as cardioService from "../services/cardioService";
import type { CardioLog } from "../types";

export function CardioPage() {
  const [logs, setLogs] = useState<CardioLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    activity: "",
    duration_min: 30,
    distance_km: "",
    notes: "",
  });

  useEffect(() => {
    cardioService
      .getCardioLogs()
      .then(setLogs)
      .finally(() => setIsLoading(false));
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const log = await cardioService.createCardioLog({
      activity: form.activity,
      duration_min: form.duration_min,
      distance_km: form.distance_km ? Number(form.distance_km) : undefined,
      notes: form.notes || undefined,
    });
    setLogs((prev) => [log, ...prev]);
    setForm({ activity: "", duration_min: 30, distance_km: "", notes: "" });
    setShowForm(false);
  }

  async function handleDelete(logId: string) {
    await cardioService.deleteCardioLog(logId);
    setLogs((prev) => prev.filter((l) => l.id !== logId));
  }

  if (isLoading) return <div className="loader">Carregando</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Cardio</h1>
        <button className="btn btn--primary" onClick={() => setShowForm(!showForm)}>
          <FontAwesomeIcon icon={faPlus} /> Nova
        </button>
      </div>

      {showForm && (
        <div className="inline-form" style={{ marginBottom: "var(--space-xl)" }}>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label">Atividade</label>
              <input
                className="form-input"
                placeholder="Ex: Corrida"
                value={form.activity}
                onChange={(e) => setForm({ ...form, activity: e.target.value })}
                required
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Duracao (min)</label>
                <input
                  className="form-input"
                  type="number"
                  value={form.duration_min}
                  onChange={(e) => setForm({ ...form, duration_min: Number(e.target.value) })}
                  min={1}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Distancia (km)</label>
                <input
                  className="form-input"
                  type="number"
                  placeholder="Opcional"
                  value={form.distance_km}
                  onChange={(e) => setForm({ ...form, distance_km: e.target.value })}
                  step="0.1"
                  min="0"
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notas</label>
              <input
                className="form-input"
                placeholder="Opcional"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <div className="form-actions">
              <button className="btn btn--primary" type="submit">Salvar</button>
              <button className="btn btn--secondary" type="button" onClick={() => setShowForm(false)}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {logs.length === 0 ? (
        <div className="empty">
          <p className="empty__text">Nenhuma sessao de cardio registrada.</p>
        </div>
      ) : (
        <div className="stagger">
          {logs.map((log) => (
            <div key={log.id} className="cardio-item">
              <div className="cardio-item__info">
                <div className="cardio-item__activity">{log.activity}</div>
                <div className="cardio-item__meta">
                  <span>{log.duration_min} min</span>
                  {log.distance_km !== null && <span>| {log.distance_km} km</span>}
                  <span>| {new Date(log.logged_at).toLocaleDateString("pt-BR")}</span>
                </div>
              </div>
              <button className="btn btn--icon btn--danger" onClick={() => handleDelete(log.id)}>
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
