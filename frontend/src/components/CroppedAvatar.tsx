import { useEffect, useRef, useState } from "react";
import type { AvatarCrop } from "../types";

interface Props {
  src: string;
  crop: AvatarCrop | null;
  size: number;
  initials: string;
}

export function CroppedAvatar({ src, crop, size, initials }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const CROP_SIZE = 280;
      const z = crop?.zoom ?? 1;
      const ox = crop?.x ?? 0;
      const oy = crop?.y ?? 0;

      const scale = Math.max(CROP_SIZE / img.width, CROP_SIZE / img.height) * z;
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (CROP_SIZE - w) / 2 + ox;
      const y = (CROP_SIZE - h) / 2 + oy;

      const ratio = size / CROP_SIZE;
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(img, x * ratio, y * ratio, w * ratio, h * ratio);
      setLoaded(true);
    };
    img.src = src;
  }, [src, crop, size]);

  if (!src) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "var(--color-primary)",
          color: "var(--color-text-inverse)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.35,
          fontWeight: "var(--weight-bold)",
        }}
      >
        {initials}
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: loaded ? "block" : "none",
      }}
    />
  );
}
