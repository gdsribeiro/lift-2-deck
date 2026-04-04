import { useEffect, useRef, useState } from "react";

type Variant = "solid" | "outline";

/* ── SVG loader (same pattern as ExerciseIcon) ── */

const svgCache = new Map<string, SVGSVGElement>();

function sanitizeSvg(raw: string): SVGSVGElement | null {
  const doc = new DOMParser().parseFromString(raw, "image/svg+xml");
  const svg = doc.querySelector("svg");
  if (!svg) return null;
  svg.querySelectorAll("script").forEach((s) => s.remove());
  for (const el of svg.querySelectorAll("*")) {
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith("on")) el.removeAttribute(attr.name);
    }
  }
  return svg;
}

async function loadLogoSvg(file: string): Promise<SVGSVGElement | null> {
  const cached = svgCache.get(file);
  if (cached) return cached.cloneNode(true) as SVGSVGElement;

  const res = await fetch(`/assets/${file}.svg`);
  const raw = await res.text();
  const node = sanitizeSvg(raw);
  if (node) svgCache.set(file, node);
  return node ? (node.cloneNode(true) as SVGSVGElement) : null;
}

function resolveFile(size: number, variant: Variant): string {
  if (size <= 32) return variant === "solid" ? "icon-solid-sm" : "icon-outline-sm";
  return variant === "solid" ? "icon-solid" : "icon-outline";
}

/* ── Logo icon mark ── */

interface LogoIconProps {
  size?: number;
  variant?: Variant;
  className?: string;
}

export function Logo({ size = 32, variant = "solid", className }: LogoIconProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [loaded, setLoaded] = useState(false);
  const file = resolveFile(size, variant);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setLoaded(false);

    loadLogoSvg(file).then((svg) => {
      if (!svg || !containerRef.current) return;
      svg.setAttribute("width", String(size));
      svg.setAttribute("height", String(size));
      containerRef.current.replaceChildren(svg);
      setLoaded(true);
    });
  }, [file, size]);

  return (
    <span
      ref={containerRef}
      className={className}
      aria-hidden="true"
      style={{
        display: "inline-flex",
        width: size,
        height: size,
        opacity: loaded ? 1 : 0,
        transition: "opacity 0.15s",
      }}
    />
  );
}

/* ── Logo horizontal: icon + wordmark ── */

interface LogoFullProps {
  size?: "sm" | "md" | "lg";
  variant?: Variant;
  className?: string;
}

const sizeMap = {
  sm: { icon: 24, fontSize: "1.125rem" },
  md: { icon: 32, fontSize: "1.5rem" },
  lg: { icon: 56, fontSize: "2.5rem" },
} as const;

export function LogoFull({ size = "md", variant = "solid", className }: LogoFullProps) {
  const s = sizeMap[size];

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size === "lg" ? "0.75rem" : "0.5rem",
        fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)",
        fontWeight: 700,
        fontSize: s.fontSize,
        lineHeight: 1,
        color: "var(--color-text)",
      }}
    >
      <Logo size={s.icon} variant={variant} />
      <span>Lift<span style={{ color: "var(--color-primary-bright)" }}>Deck</span></span>
    </span>
  );
}

/* ── Logo hero: stacked icon + wordmark ── */

interface LogoHeroProps {
  variant?: Variant;
  className?: string;
}

export function LogoHero({ variant = "solid", className }: LogoHeroProps) {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1rem",
      }}
    >
      <Logo size={120} variant={variant} />
      <span
        style={{
          fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)",
          fontWeight: 700,
          fontSize: "2.25rem",
          lineHeight: 1,
          color: "var(--color-text)",
          letterSpacing: "-0.02em",
        }}
      >
        Lift<span style={{ color: "var(--color-primary-bright)" }}>Deck</span>
      </span>
    </div>
  );
}
