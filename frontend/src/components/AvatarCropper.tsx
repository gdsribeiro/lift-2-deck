import { useCallback, useEffect, useRef, useState } from "react";
import type { AvatarCrop } from "../types";

interface Props {
  src: string;
  initialCrop?: AvatarCrop | null;
  onConfirm: (crop: AvatarCrop) => void;
  onCancel: () => void;
  onChangePhoto?: () => void;
}

const SIZE = 280;

export function AvatarCropper({ src, initialCrop, onConfirm, onCancel, onChangePhoto }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(initialCrop?.zoom ?? 1);
  const [offset, setOffset] = useState({ x: initialCrop?.x ?? 0, y: initialCrop?.y ?? 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Lock body scroll while cropper is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => setImg(image);
    image.src = src;
  }, [src]);

  function getMaxOffset(z: number) {
    if (!img) return { maxX: 0, maxY: 0 };
    const scale = Math.max(SIZE / img.width, SIZE / img.height) * z;
    const w = img.width * scale;
    const h = img.height * scale;
    return { maxX: Math.max(0, (w - SIZE) / 2), maxY: Math.max(0, (h - SIZE) / 2) };
  }

  function clamp(ox: number, oy: number, z: number) {
    const { maxX, maxY } = getMaxOffset(z);
    return {
      x: Math.min(maxX, Math.max(-maxX, ox)),
      y: Math.min(maxY, Math.max(-maxY, oy)),
    };
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, SIZE, SIZE);
    const scale = Math.max(SIZE / img.width, SIZE / img.height) * zoom;
    const w = img.width * scale;
    const h = img.height * scale;
    const x = (SIZE - w) / 2 + offset.x;
    const y = (SIZE - h) / 2 + offset.y;
    ctx.drawImage(img, x, y, w, h);
  }, [img, zoom, offset]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    if (img) setOffset((prev) => clamp(prev.x, prev.y, zoom));
  }, [zoom, img]);

  function handlePointerDown(e: React.PointerEvent) {
    setDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    const raw = { x: e.clientX - dragStart.x, y: e.clientY - dragStart.y };
    setOffset(clamp(raw.x, raw.y, zoom));
  }

  function handlePointerUp() {
    setDragging(false);
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    e.stopPropagation();

    const canvas = canvasRef.current;
    if (!canvas || !img) return;

    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.min(3, Math.max(1, zoom + delta));
    if (newZoom === zoom) return;

    // Zoom toward mouse position
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - SIZE / 2;
    const mouseY = e.clientY - rect.top - SIZE / 2;

    const factor = newZoom / zoom;
    const newOffX = offset.x - (mouseX - offset.x) * (factor - 1);
    const newOffY = offset.y - (mouseY - offset.y) * (factor - 1);

    setZoom(newZoom);
    setOffset(clamp(newOffX, newOffY, newZoom));
  }

  // Block wheel scroll on the entire overlay
  const overlayRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    const block = (e: WheelEvent) => e.preventDefault();
    el.addEventListener("wheel", block, { passive: false });
    return () => el.removeEventListener("wheel", block);
  }, []);

  return (
    <div
      ref={overlayRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "var(--color-overlay-heavy)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "var(--space-lg)",
      }}
    >
      <div
        style={{
          borderRadius: "50%",
          overflow: "hidden",
          width: SIZE,
          height: SIZE,
          touchAction: "none",
          cursor: dragging ? "grabbing" : "grab",
          border: "3px solid var(--color-primary)",
        }}
      >
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onWheel={handleWheel}
          style={{ display: "block" }}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", width: SIZE }}>
        <i className="fa-solid fa-magnifying-glass-minus" style={{ color: "var(--color-text-muted)" }} />
        <input
          type="range"
          min="1"
          max="3"
          step="0.05"
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          style={{ flex: 1 }}
        />
        <i className="fa-solid fa-magnifying-glass-plus" style={{ color: "var(--color-text-muted)" }} />
      </div>

      <div style={{ display: "flex", gap: "var(--space-md)", flexWrap: "wrap", justifyContent: "center" }}>
        <button className="btn btn--primary" onClick={() => onConfirm({ zoom, x: offset.x, y: offset.y })}>
          Confirmar
        </button>
        {onChangePhoto && (
          <button className="btn btn--secondary" onClick={onChangePhoto}>
            <i className="fa-solid fa-image" style={{ marginRight: "var(--space-xs)" }} />
            Trocar foto
          </button>
        )}
        <button className="btn btn--secondary" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
