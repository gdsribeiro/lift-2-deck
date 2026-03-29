import { type FormEvent, type TouchEvent, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faDumbbell,
  faRobot,
  faPlus,
  faTimes,
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import * as sessionService from "../services/sessionService";
import * as planService from "../services/planService";
import * as catalogService from "../services/catalogService";
import { useRestTimer } from "../hooks/useRestTimer";
import { ExerciseIcon, getGroupColor } from "../components/ExerciseIcon";
import { ConfirmDialog } from "../components/ConfirmDialog";
import type {
  WorkoutSession,
  Exercise,
  ExerciseType,
  CreateWorkoutLogRequest,
  CatalogExercise,
} from "../types";

interface LocalLog {
  exercise_id: string;
  exercise_name: string;
  set_number: number;
  weight_kg: number | null;
  reps: number | null;
  duration_min: number | null;
  distance_km: number | null;
  logged_at: string;
}

interface ExerciseState {
  id: string;
  name: string;
  muscleGroup: string;
  exerciseType: ExerciseType;
  targetSets: number;
  repsTarget: string;
  restSeconds: number;
  sets: LocalLog[];
  done: boolean;
}

function exerciseToState(ex: Exercise): ExerciseState {
  const isCardio = ex.exercise_type === "cardio";
  return {
    id: ex.id,
    name: ex.name,
    muscleGroup: ex.muscle_group,
    exerciseType: ex.exercise_type ?? "strength",
    targetSets: isCardio ? 1 : ex.sets,
    repsTarget: isCardio ? "" : ex.reps_target,
    restSeconds: isCardio ? 0 : ex.rest_seconds,
    sets: [],
    done: false,
  };
}

function catalogToState(cat: CatalogExercise): ExerciseState {
  const isCardio = cat.exercise_type === "cardio";
  return {
    id: cat.id,
    name: cat.name,
    muscleGroup: cat.category,
    exerciseType: cat.exercise_type ?? "strength",
    targetSets: isCardio ? 1 : 3,
    repsTarget: isCardio ? "" : "8-12",
    restSeconds: isCardio ? 0 : 90,
    sets: [],
    done: false,
  };
}

export function ActiveSessionPage() {
  usePageTitle("Sessao Ativa");
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [exerciseStates, setExerciseStates] = useState<ExerciseState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isFreeMode, setIsFreeMode] = useState(false);
  const [pendingAdvance, setPendingAdvance] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const navigate = useNavigate();
  const timer = useRestTimer();
  const timerTotalRef = useRef(0);

  const [showPicker, setShowPicker] = useState(false);
  const [catalog, setCatalog] = useState<CatalogExercise[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [duration, setDuration] = useState("");
  const [distance, setDistance] = useState("");
  const [workoutDate, setWorkoutDate] = useState(() => new Date().toISOString().split("T")[0]);

  const exerciseStatesRef = useRef(exerciseStates);
  exerciseStatesRef.current = exerciseStates;
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  useEffect(() => {
    sessionService
      .getActiveSession()
      .then(async (activeSession) => {
        if (!activeSession) {
          setIsLoading(false);
          return;
        }
        setSession(activeSession);

        if (activeSession.plan_id) {
          const planDetail = await planService.getPlanDetail(activeSession.plan_id);
          setExerciseStates(planDetail.exercises.map(exerciseToState));
        } else {
          setIsFreeMode(true);
          const items = await catalogService.getCatalog();
          setCatalog(items);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const current = exerciseStates[currentIndex];
  const currentSetNumber = current ? current.sets.length + 1 : 0;
  const doneCount = exerciseStates.filter((es) => es.done).length;
  const totalCount = exerciseStates.length;

  // When timer ends and there's a pending advance, move to next exercise
  useEffect(() => {
    if (!timer.isRunning && pendingAdvance) {
      setPendingAdvance(false);
      const states = exerciseStatesRef.current;
      const idx = currentIndexRef.current;
      const nextUndone = states.findIndex((es, i) => i > idx && !es.done);
      if (nextUndone !== -1) {
        setCurrentIndex(nextUndone);
      }
    }
  }, [timer.isRunning, pendingAdvance]);

  // Auto-finish when all exercises are done
  useEffect(() => {
    if (totalCount > 0 && doneCount === totalCount && !isFinishing && feedback === null) {
      handleFinish();
    }
  }, [doneCount, totalCount]);

  function handleLogSet(e: FormEvent) {
    e.preventDefault();
    if (!current) return;

    const isCardio = current.exerciseType === "cardio";
    const log: LocalLog = {
      exercise_id: current.id,
      exercise_name: current.name,
      set_number: isCardio ? 1 : currentSetNumber,
      weight_kg: isCardio ? null : (weight ? Number(weight) : null),
      reps: isCardio ? null : (reps ? Number(reps) : null),
      duration_min: isCardio && duration ? Number(duration) : null,
      distance_km: isCardio && distance ? Number(distance) : null,
      logged_at: `${workoutDate}T${new Date().toTimeString().slice(0, 8)}Z`,
    };

    const newSetCount = current.sets.length + 1;
    const isLastSet = newSetCount >= current.targetSets;

    if (isCardio) {
      // Cardio: update state and advance in the same callback to avoid stale closure
      setExerciseStates((prev) => {
        const updated = prev.map((es, i) =>
          i === currentIndex
            ? { ...es, sets: [...es.sets, log], done: true }
            : es
        );
        const nextUndone = updated.findIndex((es, i) => i > currentIndex && !es.done);
        if (nextUndone !== -1) setCurrentIndex(nextUndone);
        return updated;
      });
    } else {
      setExerciseStates((prev) =>
        prev.map((es, i) =>
          i === currentIndex
            ? { ...es, sets: [...es.sets, log], done: isLastSet ? true : es.done }
            : es
        )
      );
      timerTotalRef.current = current.restSeconds;
      timer.start(current.restSeconds);
      if (isLastSet) {
        setPendingAdvance(true);
      }
    }
  }

  // Auto-fill weight/reps from last set (strength only)
  useEffect(() => {
    if (!current || current.sets.length === 0) {
      setWeight("");
      setReps("");
      setDuration("");
      setDistance("");
      return;
    }
    if (current.exerciseType === "cardio") {
      setDuration("");
      setDistance("");
      return;
    }
    const lastSet = current.sets[current.sets.length - 1];
    setWeight(lastSet.weight_kg !== null ? String(lastSet.weight_kg) : "");
    setReps(lastSet.reps !== null ? String(lastSet.reps) : "");
  }, [currentIndex, current?.sets.length]);

  function handleSaveExercise() {
    if (!current) return;
    setExerciseStates((prev) =>
      prev.map((es, i) => (i === currentIndex ? { ...es, done: true } : es))
    );
    const nextUndone = exerciseStates.findIndex((es, i) => i > currentIndex && !es.done);
    if (nextUndone !== -1) setCurrentIndex(nextUndone);
  }

  // Navigation: only forward to undone exercises, or back to undone ones
  const canGoNext = exerciseStates.some((es, i) => i > currentIndex && !es.done);
  const canGoPrev = exerciseStates.some((es, i) => i < currentIndex && !es.done);

  function goNext() {
    if (timer.isRunning) return;
    const next = exerciseStates.findIndex((es, i) => i > currentIndex && !es.done);
    if (next !== -1) setCurrentIndex(next);
  }

  function goPrev() {
    if (timer.isRunning) return;
    // Find closest undone exercise before current
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (!exerciseStates[i].done) {
        setCurrentIndex(i);
        return;
      }
    }
  }

  // Swipe handling
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (timer.isRunning) return;
      const states = exerciseStatesRef.current;
      const idx = currentIndexRef.current;
      if (dx < 0) {
        const next = states.findIndex((es, i) => i > idx && !es.done);
        if (next !== -1) setCurrentIndex(next);
      } else {
        for (let i = idx - 1; i >= 0; i--) {
          if (!states[i].done) { setCurrentIndex(i); break; }
        }
      }
    }
  }, [timer.isRunning]);

  function addFromCatalog(cat: CatalogExercise) {
    const state = catalogToState(cat);
    setExerciseStates((prev) => [...prev, state]);
    setCurrentIndex(exerciseStates.length);
    setShowPicker(false);
    setSearchQuery("");
  }

  async function handleFinish() {
    if (!session) return;
    setIsFinishing(true);

    const allLogs: CreateWorkoutLogRequest[] = exerciseStates.flatMap((es) =>
      es.sets.map((s) => ({
        exercise_id: s.exercise_id,
        exercise_name: s.exercise_name,
        set_number: s.set_number,
        weight_kg: s.weight_kg ?? undefined,
        reps: s.reps ?? undefined,
        duration_min: s.duration_min ?? undefined,
        distance_km: s.distance_km ?? undefined,
      }))
    );

    try {
      const finished = await sessionService.finishSession(session.id, { logs: allLogs });
      setFeedback(finished.ai_feedback ?? "");
    } finally {
      setIsFinishing(false);
    }
  }

  async function handleCancel() {
    if (!session) return;
    await sessionService.finishSession(session.id, { notes: "Cancelado" });
    navigate("/");
  }

  if (isLoading) return <div className="loader">Carregando</div>;

  if (!session) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Treinar</h1>
        </div>
        <div className="empty">
          <div className="empty__icon"><FontAwesomeIcon icon={faDumbbell} /></div>
          <p className="empty__text">Nenhuma sessao ativa</p>
          <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)", marginTop: "var(--space-sm)" }}>
            Inicie um treino na aba Treino.
          </p>
        </div>
      </div>
    );
  }

  if (feedback !== null) {
    const completedExercises = exerciseStates.filter((es) => es.sets.length > 0).length;
    const totalSets = exerciseStates.reduce((sum, es) => sum + es.sets.length, 0);
    const totalVolume = exerciseStates.reduce(
      (sum, es) => sum + es.sets.reduce((s, set) => s + (set.weight_kg ?? 0) * (set.reps ?? 0), 0),
      0
    );

    // Item 6: Find top lifts (potential PRs) — exercises with highest weight
    const topLifts = exerciseStates
      .filter((es) => es.exerciseType === "strength" && es.sets.length > 0)
      .map((es) => ({
        name: es.name,
        maxWeight: Math.max(...es.sets.map((s) => s.weight_kg ?? 0)),
      }))
      .filter((t) => t.maxWeight > 0)
      .sort((a, b) => b.maxWeight - a.maxWeight)
      .slice(0, 3);

    // Item 21: Milestones
    const milestones: string[] = [];
    if (totalSets >= 20) milestones.push("20+ séries numa sessão!");
    if (totalVolume >= 5000) milestones.push("5 toneladas de volume!");

    // Item 24: Share
    function handleShare() {
      const text = `Treino concluído! ${completedExercises} exercícios, ${totalSets} séries${totalVolume > 0 ? `, ${totalVolume >= 1000 ? (totalVolume / 1000).toFixed(1) + "t" : totalVolume + "kg"} de volume` : ""}.`;
      if (navigator.share) {
        navigator.share({ title: "Meu Treino", text });
      } else {
        navigator.clipboard.writeText(text);
        alert("Copiado para a área de transferência!");
      }
    }

    return (
      <div className="workout-complete">
        <div className="workout-complete__check">
          <svg viewBox="0 0 32 32"><path d="M8 16 L14 22 L24 10" /></svg>
        </div>
        <div className="workout-complete__title">Treino Finalizado!</div>
        <div className="workout-complete__stats">
          <div className="workout-complete__stat">
            <div className="workout-complete__stat-value">{completedExercises}</div>
            <div className="workout-complete__stat-label">exercícios</div>
          </div>
          <div className="workout-complete__stat">
            <div className="workout-complete__stat-value">{totalSets}</div>
            <div className="workout-complete__stat-label">séries</div>
          </div>
          {totalVolume > 0 && (
            <div className="workout-complete__stat">
              <div className="workout-complete__stat-value">
                {totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}t` : `${totalVolume}kg`}
              </div>
              <div className="workout-complete__stat-label">volume</div>
            </div>
          )}
        </div>

        {/* Item 6: Top lifts / potential PRs */}
        {topLifts.length > 0 && (
          <div className="card" style={{ marginBottom: "var(--space-md)", textAlign: "left" }}>
            <div style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", marginBottom: "var(--space-sm)", color: "var(--color-primary-bright)" }}>
              Destaques
            </div>
            {topLifts.map((t) => (
              <div key={t.name} style={{ display: "flex", justifyContent: "space-between", padding: "var(--space-xs) 0", fontSize: "var(--text-sm)" }}>
                <span>{t.name}</span>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: "var(--weight-bold)" }}>{t.maxWeight}kg</span>
              </div>
            ))}
          </div>
        )}

        {/* Item 21: Milestones */}
        {milestones.length > 0 && (
          <div style={{ marginBottom: "var(--space-md)" }}>
            {milestones.map((m) => (
              <div key={m} className="done-pill" style={{ display: "inline-flex", margin: "var(--space-xs)" }}>
                <span className="done-pill__check">🏆</span>
                {m}
              </div>
            ))}
          </div>
        )}

        {feedback && (
          <div className="card feedback-card" style={{ marginBottom: "var(--space-md)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", marginBottom: "var(--space-md)" }}>
              <FontAwesomeIcon icon={faRobot} className="feedback-card__icon" />
              <strong>Feedback do Treino</strong>
            </div>
            <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, color: "var(--color-text-muted)" }}>
              {feedback}
            </p>
          </div>
        )}

        {/* Item 24: Share as primary CTA */}
        <button className="btn btn--primary btn--full" onClick={handleShare} style={{ marginBottom: "var(--space-md)" }}>
          Compartilhar Treino
        </button>
        <button className="btn btn--ghost btn--full" onClick={() => navigate("/")}>
          Voltar
        </button>
      </div>
    );
  }

  const filteredCatalog = searchQuery
    ? catalog.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : catalog;

  const catalogByCategory = filteredCatalog.reduce<Record<string, CatalogExercise[]>>((acc, c) => {
    (acc[c.category] ??= []).push(c);
    return acc;
  }, {});

  const doneExercises = exerciseStates.filter((es, i) => es.done && i !== currentIndex);

  return (
    <div>
      {/* Rest timer dialog */}
      {timer.isRunning && (() => {
        const radius = 54;
        const circumference = 2 * Math.PI * radius;
        const progress = timerTotalRef.current > 0 ? timer.secondsLeft / timerTotalRef.current : 0;
        const dashOffset = circumference * (1 - progress);
        return (
          <div className="rest-dialog-overlay" aria-live="polite">
            <div className="rest-dialog">
              <div className="rest-dialog__title">Descanso</div>
              <div className="rest-ring">
                <svg viewBox="0 0 120 120">
                  <circle className="rest-ring__track" cx="60" cy="60" r={radius} />
                  <circle
                    className="rest-ring__fill"
                    cx="60" cy="60" r={radius}
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                  />
                </svg>
                <div className="rest-ring__time">{timer.secondsLeft}s</div>
              </div>
              <div className="rest-dialog__hint">Proximo exercicio sendo preparado...</div>
              <button className="rest-dialog__btn" onClick={timer.skip}>
                Pular Descanso
              </button>
            </div>
          </div>
        );
      })()}

      {/* Header */}
      <div className="workout-header">
        <h1 className="page-title">{isFreeMode ? "Treino Livre" : "Treino"}</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
          {totalCount > 0 && (
            <span className="workout-progress">
              <span>{doneCount}</span>/{totalCount}
            </span>
          )}
          <button className="btn btn--ghost" onClick={() => setShowCancelConfirm(true)} title="Cancelar">
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={showCancelConfirm}
        title="Cancelar treino?"
        description="Os dados desta sessão serão perdidos."
        confirmLabel="Sim, cancelar"
        cancelLabel="Voltar"
        variant="danger"
        onConfirm={handleCancel}
        onCancel={() => setShowCancelConfirm(false)}
      />

      {/* Date selector */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-lg)" }}>
        <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
          {new Date(workoutDate + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </span>
        {!showDatePicker ? (
          <button
            className="btn btn--ghost"
            onClick={() => setShowDatePicker(true)}
            style={{ fontSize: "var(--text-xs)", padding: "var(--space-xs) var(--space-sm)", minHeight: "auto" }}
          >
            Alterar
          </button>
        ) : (
          <input
            type="date"
            className="form-input"
            value={workoutDate}
            onChange={(e) => { setWorkoutDate(e.target.value); setShowDatePicker(false); }}
            style={{ width: "auto", padding: "var(--space-xs) var(--space-sm)", fontSize: "var(--text-xs)", minHeight: "auto" }}
            autoFocus
          />
        )}
      </div>

      {/* Done pills */}
      {doneExercises.length > 0 && (
        <div className="done-pills">
          {doneExercises.map((es, i) => (
            <span key={`done-${i}`} className="done-pill">
              <span className="done-pill__check">&#10003;</span>
              {es.name}
              <span>
                {es.exerciseType === "cardio"
                  ? `${es.sets[0]?.duration_min ?? 0}min${es.sets[0]?.distance_km ? ` · ${es.sets[0].distance_km}km` : ""}`
                  : `${es.sets.length}x · ${es.sets[0]?.weight_kg ?? 0}kg`}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* Flashcard stack */}
      <div
        className="exercise-stack"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {exerciseStates.map((es, idx) => {
          const isActive = idx === currentIndex;
          const isDone = es.done && !isActive;
          const offset = idx - currentIndex;
          const isCardio = es.exerciseType === "cardio";
          const cardColor = getGroupColor(es.muscleGroup);

          let cardClass = "game-card";
          if (isActive) cardClass += " game-card--active";
          else if (isDone) cardClass += " game-card--done";
          else if (offset === 1) cardClass += " game-card--next-1";
          else if (offset === 2) cardClass += " game-card--next-2";
          else cardClass += " game-card--next-3";

          const stats = isCardio
            ? [{ label: "TIPO", value: "CARD" }, { label: "DIST", value: "–" }, { label: "DUR", value: "–" }]
            : [{ label: "SER", value: String(es.targetSets) }, { label: "REPS", value: es.repsTarget }, { label: "DESC", value: `${es.restSeconds}s` }];

          return (
            <div key={`${es.id}-${idx}`} className={cardClass} style={{ "--card-color": cardColor } as React.CSSProperties}>
              <div className="game-card__inner">
                <div className="game-card__topbar">
                  {es.done
                    ? <span className="game-card__number" style={{ color: "var(--color-success)" }}>&#10003;</span>
                    : <span className="game-card__number">#{String(idx + 1).padStart(2, "0")}</span>
                  }
                  <span className="game-card__type">
                    <span className="game-card__type-dot" />
                    {isCardio ? "CARDIO" : "FORCA"}
                  </span>
                </div>

                <div className="game-card__art">
                  <div className="game-card__art-frame">
                    <ExerciseIcon name={es.name} />
                  </div>
                </div>

                <div className="game-card__title-area">
                  <div className="game-card__name">{es.name}</div>
                </div>

                <div className="game-card__divider" />

                <div className="game-card__stats">
                  {stats.map((s) => (
                    <div key={s.label} className="game-card__stat">
                      <span className="game-card__stat-label">{s.label}</span>
                      <span className="game-card__stat-value">{s.value}</span>
                    </div>
                  ))}
                </div>

                {isActive && (
                  <div className="game-card__body">
                    {es.sets.map((s, si) => (
                      <div key={s.set_number} className={`set-row${si === es.sets.length - 1 ? " set-row--new" : ""}`}>
                        <span className="set-row__number">{s.set_number}.</span>
                        <span className="set-row__detail">
                          {isCardio
                            ? `${s.duration_min ?? 0}min${s.distance_km ? ` · ${s.distance_km}km` : ""}`
                            : `${s.weight_kg ?? 0}kg x ${s.reps ?? 0}`}
                        </span>
                        <span className="set-row__check">&#10003;</span>
                      </div>
                    ))}

                    {!timer.isRunning && !es.done && (
                      <>
                        {isCardio ? (
                          <form onSubmit={handleLogSet} style={{ marginTop: "var(--space-md)" }}>
                            <div className="form-row">
                              <div className="form-group">
                                <label className="form-label">Duracao (min)</label>
                                <input className="form-input" type="number" placeholder="min" value={duration} onChange={(e) => setDuration(e.target.value)} min="1" required />
                              </div>
                              <div className="form-group">
                                <label className="form-label">Distancia (km)</label>
                                <input className="form-input" type="number" placeholder="km" value={distance} onChange={(e) => setDistance(e.target.value)} step="0.1" min="0" />
                              </div>
                            </div>
                            <button className="btn btn--primary btn--full" type="submit" style={{ marginTop: "var(--space-md)" }}>
                              <FontAwesomeIcon icon={faCheck} /> Registrar
                            </button>
                          </form>
                        ) : (
                          <>
                            <div className="game-card__set-label">
                              Serie <strong>{currentSetNumber}</strong> de {es.targetSets}
                            </div>
                            <form onSubmit={handleLogSet}>
                              <div className="form-row">
                                <div className="form-group">
                                  <input className="form-input" type="number" placeholder="kg" value={weight} onChange={(e) => setWeight(e.target.value)} step="0.5" min="0" />
                                </div>
                                <div className="form-group">
                                  <input className="form-input" type="number" placeholder="reps" value={reps} onChange={(e) => setReps(e.target.value)} min="0" />
                                </div>
                              </div>
                              <button className="btn btn--primary btn--full" type="submit" style={{ marginTop: "var(--space-md)" }}>
                                <FontAwesomeIcon icon={faCheck} /> Registrar
                              </button>
                            </form>
                          </>
                        )}
                      </>
                    )}

                    {!timer.isRunning && es.sets.length >= es.targetSets && !es.done && (
                      <div className="form-actions">
                        <button className="btn btn--primary btn--full" onClick={handleSaveExercise}>
                          Salvar Exercicio
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation arrows */}
      {totalCount > 1 && (
        <div className="card-nav">
          <button
            className="card-nav__btn"
            onClick={goPrev}
            disabled={!canGoPrev || timer.isRunning}
            aria-label="Exercício anterior"
          >
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
          <span className="card-nav__indicator">
            {totalCount - doneCount} restantes
          </span>
          <button
            className="card-nav__btn"
            onClick={goNext}
            disabled={!canGoNext || timer.isRunning}
            aria-label="Próximo exercício"
          >
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
        </div>
      )}

      {/* Add exercise (free mode) */}
      {isFreeMode && (
        <>
          {!showPicker ? (
            <button
              className="btn btn--secondary btn--full"
              onClick={() => setShowPicker(true)}
              style={{ marginTop: "var(--space-md)" }}
            >
              <FontAwesomeIcon icon={faPlus} /> Adicionar Exercicio
            </button>
          ) : (
            <div className="inline-form" style={{ marginTop: "var(--space-md)" }}>
              <div className="form-group" style={{ marginBottom: "var(--space-md)" }}>
                <input
                  className="form-input"
                  placeholder="Buscar exercicio..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
              <div style={{ maxHeight: 280, overflowY: "auto" }}>
                {/* Item 22: Recent exercises (from past added in this session) */}
                {!searchQuery && exerciseStates.length > 0 && (
                  <div style={{ marginBottom: "var(--space-md)" }}>
                    <div style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", color: "var(--color-primary-bright)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "var(--space-xs)" }}>
                      Recentes
                    </div>
                    {[...new Set(exerciseStates.map((es) => es.name))].map((name) => {
                      const cat = catalog.find((c) => c.name === name);
                      return cat ? (
                        <button key={`recent-${cat.id}`} className="btn btn--ghost btn--full btn--start" style={{ minHeight: 36 }} onClick={() => addFromCatalog(cat)}>
                          {cat.name}
                        </button>
                      ) : null;
                    })}
                  </div>
                )}
                {Object.entries(catalogByCategory).map(([category, items]) => (
                  <div key={category} style={{ marginBottom: "var(--space-md)" }}>
                    <div style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "var(--space-xs)" }}>
                      {category}
                    </div>
                    {items.map((cat) => (
                      <button
                        key={cat.id}
                        className="btn btn--ghost btn--full btn--start"
                        style={{ minHeight: 36 }}
                        onClick={() => addFromCatalog(cat)}
                      >
                        <span style={{ color: getGroupColor(cat.category) }}><ExerciseIcon name={cat.name} /></span>
                        {cat.name}
                      </button>
                    ))}
                  </div>
                ))}
                {filteredCatalog.length === 0 && (
                  <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)", textAlign: "center", padding: "var(--space-lg)" }}>
                    Nenhum exercicio encontrado.
                  </p>
                )}
              </div>
              <button
                className="btn btn--ghost btn--full"
                onClick={() => { setShowPicker(false); setSearchQuery(""); }}
                style={{ marginTop: "var(--space-sm)" }}
              >
                Cancelar
              </button>
            </div>
          )}
        </>
      )}

      {/* Finish */}
      <button
        className="btn btn--primary btn--full btn--lg"
        onClick={handleFinish}
        disabled={isFinishing || exerciseStates.flatMap((es) => es.sets).length === 0}
        style={{ marginTop: "var(--space-xl)" }}
      >
        <FontAwesomeIcon icon={faCheck} /> {isFinishing ? "Finalizando..." : "Finalizar Treino"}
      </button>
    </div>
  );
}
