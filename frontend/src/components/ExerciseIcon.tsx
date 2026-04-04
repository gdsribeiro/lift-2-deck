import { useEffect, useRef, useState } from "react";

const NAME_TO_FILE: Record<string, string> = {
  "Supino Reto": "supino-reto",
  "Supino Inclinado": "supino-inclinado",
  "Supino Declinado": "supino-declinado",
  "Crucifixo": "crucifixo",
  "Crossover": "crossover",
  "Barra Fixa": "barra-fixa",
  "Remada Curvada": "remada-curvada",
  "Remada Unilateral": "remada-unilateral",
  "Puxada Frontal": "puxada-frontal",
  "Pulldown": "pulldown",
  "Agachamento Livre": "agachamento-livre",
  "Agachamento Hack": "agachamento-livre",
  "Leg Press 45": "leg-press",
  "Cadeira Extensora": "cadeira-extensora",
  "Mesa Flexora": "mesa-flexora",
  "Stiff": "stiff",
  "Panturrilha em Pe": "panturrilha-em-pe",
  "Desenvolvimento Militar": "desenvolvimento-militar",
  "Elevacao Lateral": "elevacao-lateral",
  "Elevacao Frontal": "elevacao-frontal",
  "Face Pull": "face-pull",
  "Rosca Direta": "rosca-direta",
  "Rosca Martelo": "rosca-martelo",
  "Rosca Scott": "rosca-scott",
  "Triceps Pulley": "triceps-pulley",
  "Triceps Testa": "triceps-testa",
  "Triceps Frances": "triceps-frances",
  "Corrida": "corrida",
  "Bicicleta": "bicicleta",
  "Caminhada": "caminhada",
  "Natacao": "natacao",
  "Eliptico": "eliptico",
  "Pular Corda": "pular-corda",
};

const svgNodeCache = new Map<string, SVGSVGElement>();

function parseSvgSafely(raw: string): SVGSVGElement | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(raw, "image/svg+xml");
  const svg = doc.querySelector("svg");
  if (!svg) return null;
  // Remove any script or event handler attributes for safety
  svg.querySelectorAll("script").forEach((s) => s.remove());
  for (const el of svg.querySelectorAll("*")) {
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith("on")) el.removeAttribute(attr.name);
    }
  }
  return svg;
}

async function loadSvgNode(file: string): Promise<SVGSVGElement | null> {
  const cached = svgNodeCache.get(file);
  if (cached) return cached.cloneNode(true) as SVGSVGElement;

  const res = await fetch(`/exercises/${file}.svg`);
  const raw = await res.text();
  const node = parseSvgSafely(raw);
  if (node) svgNodeCache.set(file, node);
  return node ? (node.cloneNode(true) as SVGSVGElement) : null;
}

export function ExerciseIcon({ name }: { name: string }) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [loaded, setLoaded] = useState(false);
  const file = NAME_TO_FILE[name] ?? "custom";

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    loadSvgNode(file)
      .then((svg) => {
        if (!svg || !containerRef.current) return;
        containerRef.current.replaceChildren(svg);
        setLoaded(true);
      })
      .catch(() => {
        loadSvgNode("custom").then((svg) => {
          if (svg && containerRef.current) {
            containerRef.current.replaceChildren(svg);
            setLoaded(true);
          }
        });
      });
  }, [file]);

  return (
    <span
      ref={containerRef}
      style={{
        display: "inline-flex",
        width: 24,
        height: 24,
        opacity: loaded ? 1 : 0,
        transition: "opacity 0.15s",
      }}
    />
  );
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
