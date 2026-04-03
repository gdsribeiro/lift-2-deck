type Variant = "solid" | "outline";

interface LogoIconProps {
  size?: number;
  variant?: Variant;
  className?: string;
}

/**
 * LiftDeck icon mark — carta de baralho com barra/anilhas central e seta-naipe nos cantos.
 */
export function Logo({ size = 32, variant = "solid", className }: LogoIconProps) {
  // Versão simplificada para tamanhos pequenos (favicon, ícones)
  if (size <= 32) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
      >
        {variant === "solid" ? (
          <rect x="11" y="4" width="42" height="56" rx="5"
            fill="var(--color-primary, #6366f1)" />
        ) : (
          <rect x="11" y="4" width="42" height="56" rx="5"
            stroke="var(--color-primary-bright, #818cf8)" strokeWidth="2.5" fill="none" />
        )}
        <path
          d="M32,18 L22,34 L28,34 L28,46 L36,46 L36,34 L42,34 Z"
          fill={variant === "solid" ? "#ffffff" : "var(--color-primary, #6366f1)"}
        />
      </svg>
    );
  }

  // Card 3:4 → 42x56 centered in 64x64 viewBox
  if (variant === "outline") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
      >
        {/* Carta única vazada, sem deck */}
        <rect
          x="11" y="4" width="42" height="56" rx="5"
          stroke="var(--color-primary-bright, #818cf8)"
          strokeWidth="2.5"
          fill="none"
        />
        {/* Itens internos sólidos — indigo para contraste em fundo claro */}
        <path
          d="M21,12 L18,16 L20,16 L20,19 L22,19 L22,16 L24,16 Z"
          fill="var(--color-primary, #6366f1)"
        />
        <path
          d="M43,52 L46,48 L44,48 L44,45 L42,45 L42,48 L40,48 Z"
          fill="var(--color-primary, #6366f1)"
        />
        <line
          x1="20" y1="32" x2="44" y2="32"
          stroke="var(--color-primary, #6366f1)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <rect x="21" y="26" width="3" height="12" rx="1"
          fill="var(--color-primary, #6366f1)" />
        <rect x="25" y="24" width="3" height="16" rx="1"
          fill="var(--color-primary, #6366f1)" />
        <rect x="36" y="24" width="3" height="16" rx="1"
          fill="var(--color-primary, #6366f1)" />
        <rect x="40" y="26" width="3" height="12" rx="1"
          fill="var(--color-primary, #6366f1)" />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Carta de trás */}
      <rect
        x="11" y="4" width="42" height="56" rx="5"
        fill="var(--color-primary-dim, #4f46e5)"
        transform="rotate(-27 32 32)"
      />

      {/* Carta da frente */}
      <g transform="rotate(3 32 32)">
        <rect
          x="11" y="4" width="42" height="56" rx="5"
          fill="var(--color-primary, #6366f1)"
        />
        <path
          d="M21,12 L18,16 L20,16 L20,19 L22,19 L22,16 L24,16 Z"
          fill="#ffffff"
        />
        <path
          d="M43,52 L46,48 L44,48 L44,45 L42,45 L42,48 L40,48 Z"
          fill="#ffffff"
        />
        <line
          x1="20" y1="32" x2="44" y2="32"
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <rect x="21" y="26" width="3" height="12" rx="1"
          fill="#ffffff" />
        <rect x="25" y="24" width="3" height="16" rx="1"
          fill="#ffffff" />
        <rect x="36" y="24" width="3" height="16" rx="1"
          fill="#ffffff" />
        <rect x="40" y="26" width="3" height="12" rx="1"
          fill="#ffffff" />
      </g>
    </svg>
  );
}

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

/**
 * Logo completo: ícone + "LiftDeck" lado a lado.
 */
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

interface LogoHeroProps {
  variant?: Variant;
  className?: string;
}

/**
 * Logo hero para login/onboarding — ícone grande + nome empilhado.
 */
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
