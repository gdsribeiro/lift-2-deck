import jsonServer from "json-server";
import { v4 as uuid } from "uuid";

const server = jsonServer.create();
const router = jsonServer.router("db.json");
const middlewares = jsonServer.defaults({ noCors: false });

const PORT = 8080;
const FAKE_TOKEN = "mock-jwt-token-demo";

server.use(middlewares);
server.use(jsonServer.bodyParser);

// ─── Auth routes ────────────────────────────────────────────────────────────

server.post("/api/v1/auth/login", (req, res) => {
  const { email, password } = req.body;
  const db = router.db.getState();
  const user = db.users.find((u) => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  res.json({ access_token: FAKE_TOKEN, expires_in: 3600 });
});

server.post("/api/v1/auth/register", (req, res) => {
  const { email, password } = req.body;
  const db = router.db.getState();
  if (db.users.find((u) => u.email === email)) {
    return res.status(409).json({ error: "Email already registered" });
  }
  const user = { id: uuid(), email, password };
  db.users.push(user);
  router.db.setState(db);
  res.status(201).json({ access_token: FAKE_TOKEN, expires_in: 3600 });
});

server.post("/api/v1/auth/refresh", (_req, res) => {
  res.json({ access_token: FAKE_TOKEN, expires_in: 3600 });
});

server.post("/api/v1/auth/logout", (_req, res) => {
  res.status(204).end();
});

server.get("/api/v1/auth/me", (_req, res) => {
  const db = router.db.getState();
  const user = db.users[0];
  res.json({ id: user.id, email: user.email });
});

server.put("/api/v1/auth/profile", (req, res) => {
  const db = router.db.getState();
  const user = db.users[0];
  if (req.body.email !== undefined) user.email = req.body.email;
  router.db.setState(db);
  res.json({ id: user.id, email: user.email });
});

server.put("/api/v1/auth/password", (req, res) => {
  const db = router.db.getState();
  const user = db.users[0];
  if (req.body.current_password !== user.password) {
    return res.status(400).json({ error: "Senha atual incorreta" });
  }
  user.password = req.body.new_password;
  router.db.setState(db);
  res.status(204).end();
});

server.delete("/api/v1/auth/account", (_req, res) => {
  res.status(204).end();
});

// ─── Auth middleware (skip for auth routes) ─────────────────────────────────

server.use("/api/v1", (req, res, next) => {
  if (req.path.startsWith("/auth")) return next();
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
});

// ─── Dashboard Stats ────────────────────────────────────────────────────────

server.get("/api/v1/dashboard/stats", (_req, res) => {
  const db = router.db.getState();
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const finishedSessions = db.sessions.filter((s) => s.finished_at !== null);

  const daysThisWeek = new Set(
    finishedSessions
      .filter((s) => new Date(s.started_at) >= startOfWeek)
      .map((s) => new Date(s.started_at).toISOString().split("T")[0])
  ).size;

  const weekSessionIds = new Set(
    finishedSessions
      .filter((s) => new Date(s.started_at) >= startOfWeek)
      .map((s) => s.id)
  );
  const weeklyVolume = db.logs
    .filter((l) => weekSessionIds.has(l.session_id))
    .reduce((sum, l) => sum + (l.weight_kg || 0) * (l.reps || 0), 0);

  const sessionDates = [
    ...new Set(
      finishedSessions.map((s) => new Date(s.started_at).toISOString().split("T")[0])
    ),
  ].sort((a, b) => b.localeCompare(a));

  let streak = 0;
  const today = now.toISOString().split("T")[0];
  let checkDate = new Date(today);
  for (const date of sessionDates) {
    const diff = Math.floor((checkDate - new Date(date)) / 86400000);
    if (diff <= 1) {
      streak++;
      checkDate = new Date(date);
    } else {
      break;
    }
  }

  res.json({ days_this_week: daysThisWeek, weekly_volume: weeklyVolume, streak });
});

// ─── Exercise Catalog ───────────────────────────────────────────────────────

server.get("/api/v1/catalog", (req, res) => {
  const db = router.db.getState();
  let items = db.catalog;
  if (req.query.category) {
    items = items.filter((c) => c.category === req.query.category);
  }
  if (req.query.q) {
    const q = req.query.q.toLowerCase();
    items = items.filter((c) => c.name.toLowerCase().includes(q));
  }
  res.json(items);
});

server.post("/api/v1/catalog", (req, res) => {
  const db = router.db.getState();
  const item = { id: uuid(), name: req.body.name, category: req.body.category, exercise_type: req.body.exercise_type || "strength" };
  db.catalog.push(item);
  router.db.setState(db);
  res.status(201).json(item);
});

server.delete("/api/v1/catalog/:id", (req, res) => {
  const db = router.db.getState();
  db.catalog = db.catalog.filter((c) => c.id !== req.params.id);
  router.db.setState(db);
  res.status(204).end();
});

// ─── Plans ──────────────────────────────────────────────────────────────────

server.get("/api/v1/plans", (_req, res) => {
  const db = router.db.getState();
  const plans = db.plans.map(({ user_id, ...plan }) => plan);
  res.json(plans);
});

server.get("/api/v1/plans/:planId", (req, res) => {
  const db = router.db.getState();
  const plan = db.plans.find((p) => p.id === req.params.planId);
  if (!plan) return res.status(404).json({ error: "Plan not found" });

  const exercises = db.exercises
    .filter((e) => e.plan_id === plan.id)
    .sort((a, b) => a.order_index - b.order_index);

  const { user_id, ...planData } = plan;
  res.json({ ...planData, exercises });
});

server.post("/api/v1/plans", (req, res) => {
  const db = router.db.getState();
  const plan = {
    id: uuid(),
    user_id: "u1",
    name: req.body.name,
    created_at: new Date().toISOString(),
  };
  db.plans.push(plan);
  router.db.setState(db);
  const { user_id, ...data } = plan;
  res.status(201).json(data);
});

server.put("/api/v1/plans/:planId", (req, res) => {
  const db = router.db.getState();
  const idx = db.plans.findIndex((p) => p.id === req.params.planId);
  if (idx === -1) return res.status(404).json({ error: "Plan not found" });

  if (req.body.name !== undefined) db.plans[idx].name = req.body.name;
  router.db.setState(db);

  const { user_id, ...data } = db.plans[idx];
  res.json(data);
});

server.delete("/api/v1/plans/:planId", (req, res) => {
  const db = router.db.getState();
  const plan = db.plans.find((p) => p.id === req.params.planId);
  if (!plan) return res.status(404).json({ error: "Plan not found" });

  db.exercises = db.exercises.filter((e) => e.plan_id !== plan.id);
  db.plans = db.plans.filter((p) => p.id !== plan.id);
  router.db.setState(db);
  res.status(204).end();
});

// ─── Exercises ──────────────────────────────────────────────────────────────

server.post("/api/v1/plans/:planId/exercises", (req, res) => {
  const db = router.db.getState();
  if (!db.plans.find((p) => p.id === req.params.planId)) {
    return res.status(404).json({ error: "Plan not found" });
  }
  const ex = {
    id: uuid(),
    plan_id: req.params.planId,
    name: req.body.name,
    muscle_group: req.body.muscle_group,
    exercise_type: req.body.exercise_type || "strength",
    sets: req.body.sets,
    reps_target: req.body.reps_target,
    rest_seconds: req.body.rest_seconds,
    notes: req.body.notes || null,
    order_index: req.body.order_index ?? 0,
  };
  db.exercises.push(ex);
  router.db.setState(db);
  res.status(201).json(ex);
});

server.put("/api/v1/exercises/:exerciseId", (req, res) => {
  const db = router.db.getState();
  const idx = db.exercises.findIndex((e) => e.id === req.params.exerciseId);
  if (idx === -1) return res.status(404).json({ error: "Exercise not found" });

  const fields = ["name", "muscle_group", "exercise_type", "sets", "reps_target", "rest_seconds", "notes", "order_index"];
  for (const f of fields) {
    if (req.body[f] !== undefined) db.exercises[idx][f] = req.body[f];
  }
  router.db.setState(db);
  res.json(db.exercises[idx]);
});

server.delete("/api/v1/exercises/:exerciseId", (req, res) => {
  const db = router.db.getState();
  db.exercises = db.exercises.filter((e) => e.id !== req.params.exerciseId);
  router.db.setState(db);
  res.status(204).end();
});

server.patch("/api/v1/exercises/reorder", (req, res) => {
  const db = router.db.getState();
  for (const item of req.body) {
    const e = db.exercises.find((e) => e.id === item.id);
    if (e) e.order_index = item.order_index;
  }
  router.db.setState(db);
  res.status(204).end();
});

// ─── Sessions ───────────────────────────────────────────────────────────────

server.post("/api/v1/sessions", (req, res) => {
  const db = router.db.getState();
  // Auto-finish any existing active sessions
  for (const s of db.sessions) {
    if (s.finished_at === null) {
      s.finished_at = new Date().toISOString();
      s.notes = s.notes || "Cancelado automaticamente";
    }
  }
  const session = {
    id: uuid(),
    user_id: "u1",
    plan_id: req.body.plan_id || null,
    started_at: new Date().toISOString(),
    finished_at: null,
    notes: null,
    ai_feedback: null,
  };
  db.sessions.push(session);
  router.db.setState(db);
  const { user_id, ...data } = session;
  res.status(201).json(data);
});

server.get("/api/v1/sessions/active", (_req, res) => {
  const db = router.db.getState();
  const active = db.sessions.find((s) => s.finished_at === null);
  if (!active) return res.json(null);
  const { user_id, ...data } = active;
  res.json(data);
});

server.post("/api/v1/sessions/:sessionId/logs", (req, res) => {
  const db = router.db.getState();
  if (!db.sessions.find((s) => s.id === req.params.sessionId)) {
    return res.status(404).json({ error: "Session not found" });
  }
  const log = {
    id: uuid(),
    session_id: req.params.sessionId,
    exercise_id: req.body.exercise_id || null,
    exercise_name: req.body.exercise_name,
    set_number: req.body.set_number,
    weight_kg: req.body.weight_kg ?? null,
    reps: req.body.reps ?? null,
    duration_min: req.body.duration_min ?? null,
    distance_km: req.body.distance_km ?? null,
    logged_at: new Date().toISOString(),
  };
  db.logs.push(log);
  router.db.setState(db);
  res.status(201).json(log);
});

server.delete("/api/v1/sessions/:sessionId/logs/:logId", (req, res) => {
  const db = router.db.getState();
  db.logs = db.logs.filter((l) => l.id !== req.params.logId);
  router.db.setState(db);
  res.status(204).end();
});

server.post("/api/v1/sessions/:sessionId/logs/batch", (req, res) => {
  const db = router.db.getState();
  if (!db.sessions.find((s) => s.id === req.params.sessionId)) {
    return res.status(404).json({ error: "Session not found" });
  }
  const created = [];
  for (const item of req.body) {
    const log = {
      id: uuid(),
      session_id: req.params.sessionId,
      exercise_id: item.exercise_id || null,
      exercise_name: item.exercise_name,
      set_number: item.set_number,
      weight_kg: item.weight_kg ?? null,
      reps: item.reps ?? null,
      duration_min: item.duration_min ?? null,
      distance_km: item.distance_km ?? null,
      logged_at: item.logged_at || new Date().toISOString(),
    };
    db.logs.push(log);
    created.push(log);
  }
  router.db.setState(db);
  res.status(201).json(created);
});

server.patch("/api/v1/sessions/:sessionId/finish", (req, res) => {
  const db = router.db.getState();
  const idx = db.sessions.findIndex((s) => s.id === req.params.sessionId);
  if (idx === -1) return res.status(404).json({ error: "Session not found" });

  if (req.body.logs && Array.isArray(req.body.logs)) {
    for (const item of req.body.logs) {
      db.logs.push({
        id: uuid(),
        session_id: req.params.sessionId,
        exercise_id: item.exercise_id || null,
        exercise_name: item.exercise_name,
        set_number: item.set_number,
        weight_kg: item.weight_kg ?? null,
        reps: item.reps ?? null,
        duration_min: item.duration_min ?? null,
        distance_km: item.distance_km ?? null,
        logged_at: item.logged_at || new Date().toISOString(),
      });
    }
  }

  db.sessions[idx].finished_at = new Date().toISOString();
  if (req.body.notes !== undefined) db.sessions[idx].notes = req.body.notes;
  db.sessions[idx].ai_feedback = "Bom treino! Continue mantendo a regularidade e progressao de carga.";
  router.db.setState(db);

  const { user_id, ...data } = db.sessions[idx];
  res.json(data);
});

// ─── History ────────────────────────────────────────────────────────────────

server.get("/api/v1/history", (req, res) => {
  const db = router.db.getState();
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  const finished = db.sessions
    .filter((s) => s.finished_at !== null)
    .sort((a, b) => new Date(b.started_at) - new Date(a.started_at));

  const total = finished.length;
  const start = (page - 1) * limit;
  const paged = finished.slice(start, start + limit);

  const data = paged.map((session) => {
    const plan = db.plans.find((p) => p.id === session.plan_id);
    const { user_id, ...s } = session;
    return {
      ...s,
      plan_name: plan ? plan.name : null,
      logs: db.logs.filter((l) => l.session_id === session.id),
    };
  });

  res.json({ data, page, total });
});

server.get("/api/v1/history/:sessionId", (req, res) => {
  const db = router.db.getState();
  const session = db.sessions.find((s) => s.id === req.params.sessionId);
  if (!session) return res.status(404).json({ error: "Session not found" });

  const plan = db.plans.find((p) => p.id === session.plan_id);
  const { user_id, ...s } = session;
  res.json({
    ...s,
    plan_name: plan ? plan.name : null,
    logs: db.logs.filter((l) => l.session_id === session.id),
  });
});

// ─── Evolution ──────────────────────────────────────────────────────────────

server.get("/api/v1/evolution", (req, res) => {
  const { exercise_id, from, to, group_by = "volume", bucket = "day" } = req.query;
  const db = router.db.getState();

  let relevantLogs = db.logs;
  if (exercise_id) relevantLogs = relevantLogs.filter((l) => l.exercise_id === exercise_id);
  if (from) relevantLogs = relevantLogs.filter((l) => l.logged_at >= from);
  if (to) relevantLogs = relevantLogs.filter((l) => l.logged_at <= to);

  function bucketKey(dateStr) {
    const d = new Date(dateStr);
    if (bucket === "week") {
      const day = d.getDay();
      const diff = d.getDate() - day;
      const start = new Date(d.setDate(diff));
      return start.toISOString().split("T")[0];
    }
    if (bucket === "month") return dateStr.substring(0, 7);
    return dateStr.split("T")[0];
  }

  const grouped = {};
  for (const log of relevantLogs) {
    const key = bucketKey(log.logged_at);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(log);
  }

  const data_points = Object.entries(grouped)
    .map(([date, logs]) => {
      let value;
      if (group_by === "frequency") {
        value = logs.length;
      } else if (group_by === "duration") {
        value = logs.reduce((sum, l) => sum + (l.duration_min || 0), 0);
      } else if (group_by === "distance") {
        value = logs.reduce((sum, l) => sum + (l.distance_km || 0), 0);
      } else {
        value = logs.reduce((sum, l) => sum + (l.weight_kg || 0) * (l.reps || 0), 0);
      }
      return { date, value };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  res.json({ data_points, group_by });
});

// ─── Start server ───────────────────────────────────────────────────────────

server.listen(PORT, () => {
  console.log(`Mock server running at http://localhost:${PORT}`);
  console.log(`Login: demo@gym.com / 123456`);
});
