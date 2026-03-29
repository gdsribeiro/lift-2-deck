const S = { stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };

function Icon({ children }: { children: React.ReactNode }) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">{children}</svg>;
}

// ─── Peito ──────────────────────────────────────────
function SupinoReto() {
  return <Icon><path d="M4 14h16M8 10v8M16 10v8M12 6v4" {...S} /><circle cx="12" cy="5" r="1.5" {...S} /></Icon>;
}
function SupinoInclinado() {
  return <Icon><path d="M5 16l14-4M8 8v10M16 6v10M12 4v4" {...S} /><circle cx="12" cy="3" r="1.5" {...S} /></Icon>;
}
function SupinoDeclinado() {
  return <Icon><path d="M5 12l14 4M8 8v10M16 10v10M12 4v4" {...S} /><circle cx="12" cy="3" r="1.5" {...S} /></Icon>;
}
function Crucifixo() {
  return <Icon><path d="M3 10c3 2 5 4 9 4s6-2 9-4M12 6v8M12 18v2" {...S} /><circle cx="12" cy="5" r="1.5" {...S} /><circle cx="3" cy="10" r="1" fill="currentColor" /><circle cx="21" cy="10" r="1" fill="currentColor" /></Icon>;
}
function Crossover() {
  return <Icon><path d="M4 4v6l8 4 8-4V4M12 14v4" {...S} /><circle cx="12" cy="12" r="1.5" {...S} /></Icon>;
}

// ─── Costas ─────────────────────────────────────────
function BarraFixa() {
  return <Icon><path d="M3 5h18M8 5v4M16 5v4M12 5v7" {...S} /><circle cx="12" cy="14" r="1.5" {...S} /><path d="M9 17l3 3 3-3" {...S} /></Icon>;
}
function RemadaCurvada() {
  return <Icon><path d="M6 10l6-2 6 2M12 8v8M8 19h8" {...S} /><circle cx="12" cy="6" r="1.5" {...S} /><path d="M5 14h14" {...S} /></Icon>;
}
function RemadaUnilateral() {
  return <Icon><path d="M8 8v10M8 14h8M16 10v4" {...S} /><circle cx="8" cy="6" r="1.5" {...S} /><circle cx="16" cy="10" r="1" fill="currentColor" /></Icon>;
}
function PuxadaFrontal() {
  return <Icon><path d="M4 4h16M12 4v8M7 8l5 4 5-4" {...S} /><circle cx="12" cy="14" r="1.5" {...S} /><path d="M12 16v4" {...S} /></Icon>;
}
function Pulldown() {
  return <Icon><path d="M4 3h16M12 3v9M6 7l6 5 6-5" {...S} /><circle cx="12" cy="14" r="1.5" {...S} /><path d="M10 18h4" {...S} /></Icon>;
}

// ─── Pernas ─────────────────────────────────────────
function AgachamentoLivre() {
  return <Icon><path d="M6 6h12M12 6v4M9 10l-1 6 2 4M15 10l1 6-2 4" {...S} /><circle cx="12" cy="8" r="1.5" {...S} /></Icon>;
}
function LegPress() {
  return <Icon><path d="M4 18h6l4-8h6M10 18l4-8" {...S} /><circle cx="7" cy="14" r="1.5" {...S} /><path d="M4 10h4" {...S} /></Icon>;
}
function CadeiraExtensora() {
  return <Icon><path d="M6 8v10M6 12h6M12 12v-2M12 12l6 4" {...S} /><circle cx="12" cy="8" r="1.5" {...S} /><circle cx="18" cy="16" r="1" fill="currentColor" /></Icon>;
}
function MesaFlexora() {
  return <Icon><path d="M4 10h8M12 10v4M12 14l-6 4M4 14v4" {...S} /><circle cx="12" cy="8" r="1.5" {...S} /><circle cx="6" cy="18" r="1" fill="currentColor" /></Icon>;
}
function Stiff() {
  return <Icon><path d="M12 4v10M8 14l4 6 4-6M6 8h12" {...S} /><circle cx="12" cy="3" r="1.5" {...S} /></Icon>;
}
function PanturrilhaEmPe() {
  return <Icon><path d="M9 4h6M12 4v10M10 14v4l2 2 2-2v-4" {...S} /><circle cx="12" cy="3" r="1" fill="currentColor" /><path d="M8 20h8" {...S} /></Icon>;
}

// ─── Ombros ─────────────────────────────────────────
function DesenvolvimentoMilitar() {
  return <Icon><path d="M6 14l6-10 6 10M6 14h12M12 14v6" {...S} /><circle cx="6" cy="14" r="1" fill="currentColor" /><circle cx="18" cy="14" r="1" fill="currentColor" /></Icon>;
}
function ElevacaoLateral() {
  return <Icon><path d="M12 8v8M4 12l8-4 8 4" {...S} /><circle cx="12" cy="6" r="1.5" {...S} /><circle cx="4" cy="12" r="1" fill="currentColor" /><circle cx="20" cy="12" r="1" fill="currentColor" /></Icon>;
}
function ElevacaoFrontal() {
  return <Icon><path d="M12 8v8M8 12l4-8 4 8" {...S} /><circle cx="12" cy="6" r="1.5" {...S} /><circle cx="8" cy="12" r="1" fill="currentColor" /><circle cx="16" cy="12" r="1" fill="currentColor" /></Icon>;
}
function FacePull() {
  return <Icon><path d="M4 8h6M14 8h6M10 8l2 4 2-4" {...S} /><circle cx="12" cy="6" r="1.5" {...S} /><path d="M12 12v6" {...S} /></Icon>;
}

// ─── Bracos ─────────────────────────────────────────
function RoscaDireta() {
  return <Icon><path d="M12 8v8M8 16l4-8M16 16l-4-8" {...S} /><circle cx="12" cy="6" r="1.5" {...S} /><circle cx="8" cy="16" r="1" fill="currentColor" /><circle cx="16" cy="16" r="1" fill="currentColor" /></Icon>;
}
function RoscaMartelo() {
  return <Icon><path d="M12 8v8M9 16v-6M15 16v-6" {...S} /><circle cx="12" cy="6" r="1.5" {...S} /><circle cx="9" cy="16" r="1" fill="currentColor" /><circle cx="15" cy="16" r="1" fill="currentColor" /></Icon>;
}
function RoscaScott() {
  return <Icon><path d="M6 10l6 4v4M18 10l-6 4" {...S} /><circle cx="12" cy="8" r="1.5" {...S} /><path d="M6 10v6" {...S} /><circle cx="6" cy="16" r="1" fill="currentColor" /></Icon>;
}
function TricepsPulley() {
  return <Icon><path d="M12 3v6M8 9l4 5 4-5M12 14v6" {...S} /><circle cx="12" cy="12" r="1.5" {...S} /><path d="M4 3h16" {...S} /></Icon>;
}
function TricepsTesta() {
  return <Icon><path d="M6 14h12M12 8v6M8 8l4-4 4 4" {...S} /><circle cx="12" cy="10" r="1.5" {...S} /></Icon>;
}
function TricepsFrances() {
  return <Icon><path d="M12 6v12M9 6l3-3 3 3" {...S} /><circle cx="12" cy="10" r="1.5" {...S} /><circle cx="12" cy="4" r="1" fill="currentColor" /></Icon>;
}

// ─── Cardio ─────────────────────────────────────────
function Corrida() {
  return <Icon><circle cx="14" cy="4" r="2" {...S} /><path d="M10 9l4 1 2 4-3 2-1 5M14 10l3 3M7 12l3-3" {...S} /></Icon>;
}
function Bicicleta() {
  return <Icon><circle cx="6" cy="17" r="3" {...S} /><circle cx="18" cy="17" r="3" {...S} /><path d="M6 17l6-7 6 7M12 10l2-4" {...S} /><circle cx="14" cy="5" r="1.5" {...S} /></Icon>;
}
function Caminhada() {
  return <Icon><circle cx="12" cy="4" r="2" {...S} /><path d="M12 8v6l-3 6M12 14l3 6M9 11l-3 2M15 11l3 2" {...S} /></Icon>;
}
function Natacao() {
  return <Icon><circle cx="6" cy="10" r="1.5" {...S} /><path d="M8 10l4-2 4 2 4-2M8 14l4-2 4 2 4-2M4 18l4-2 4 2 4-2 4 2" {...S} /></Icon>;
}
function Eliptico() {
  return <Icon><ellipse cx="12" cy="15" rx="6" ry="4" {...S} /><path d="M12 11v-3M10 8h4" {...S} /><circle cx="12" cy="6" r="1.5" {...S} /></Icon>;
}
function PularCorda() {
  return <Icon><circle cx="12" cy="4" r="2" {...S} /><path d="M12 8v6M9 20l3-6 3 6" {...S} /><path d="M5 8c2 8 5 12 7 12s5-4 7-12" {...S} /></Icon>;
}

// ─── Custom / Default ───────────────────────────────
function CustomExercise() {
  return <Icon><circle cx="12" cy="12" r="8" {...S} /><path d="M12 8v4M10 14h4" {...S} /></Icon>;
}

const ICON_MAP: Record<string, () => React.ReactElement> = {
  "Supino Reto": SupinoReto,
  "Supino Inclinado": SupinoInclinado,
  "Supino Declinado": SupinoDeclinado,
  "Crucifixo": Crucifixo,
  "Crossover": Crossover,
  "Barra Fixa": BarraFixa,
  "Remada Curvada": RemadaCurvada,
  "Remada Unilateral": RemadaUnilateral,
  "Puxada Frontal": PuxadaFrontal,
  "Pulldown": Pulldown,
  "Agachamento Livre": AgachamentoLivre,
  "Leg Press 45": LegPress,
  "Cadeira Extensora": CadeiraExtensora,
  "Mesa Flexora": MesaFlexora,
  "Stiff": Stiff,
  "Panturrilha em Pe": PanturrilhaEmPe,
  "Desenvolvimento Militar": DesenvolvimentoMilitar,
  "Elevacao Lateral": ElevacaoLateral,
  "Elevacao Frontal": ElevacaoFrontal,
  "Face Pull": FacePull,
  "Rosca Direta": RoscaDireta,
  "Rosca Martelo": RoscaMartelo,
  "Rosca Scott": RoscaScott,
  "Triceps Pulley": TricepsPulley,
  "Triceps Testa": TricepsTesta,
  "Triceps Frances": TricepsFrances,
  "Corrida": Corrida,
  "Bicicleta": Bicicleta,
  "Caminhada": Caminhada,
  "Natacao": Natacao,
  "Eliptico": Eliptico,
  "Pular Corda": PularCorda,
  "Agachamento Hack": AgachamentoLivre,
};

export function ExerciseIcon({ name }: { name: string }) {
  const IconComponent = ICON_MAP[name] ?? CustomExercise;
  return <IconComponent />;
}

const GROUP_COLORS: Record<string, string> = {
  "Peito": "#ef4444",
  "Costas": "#3b82f6",
  "Pernas": "#f97316",
  "Quadriceps": "#f97316",
  "Posterior": "#f97316",
  "Ombros": "#a855f7",
  "Ombro": "#a855f7",
  "Bracos": "#818cf8",
  "Biceps": "#818cf8",
  "Triceps": "#818cf8",
  "Cardio": "#fbbf24",
};

export function getGroupColor(muscleGroup: string): string {
  return GROUP_COLORS[muscleGroup] ?? "#818cf8";
}
