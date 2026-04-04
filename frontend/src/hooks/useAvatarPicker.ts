import { useRef, useState } from "react";
import type { AvatarCrop } from "../types";

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_DIM = 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

async function compressImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  for (let quality = 0.9; quality >= 0.3; quality -= 0.1) {
    const blob: Blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/jpeg", quality),
    );
    if (blob.size <= MAX_BYTES) {
      return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
    }
  }

  const blob: Blob = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.3),
  );
  return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
}

export function useAvatarPicker() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [pickerError, setPickerError] = useState<string | null>(null);

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function openCropper(existingUrl: string) {
    setPendingFile(null);
    setCropSrc(existingUrl);
  }

  async function handleFileChange(file: File) {
    setPickerError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setPickerError("Apenas JPEG, PNG e WebP sao aceitos.");
      return;
    }

    let processed = file;
    if (file.size > MAX_BYTES) {
      try {
        processed = await compressImage(file);
      } catch {
        setPickerError("Erro ao comprimir imagem.");
        return;
      }
    }

    setPendingFile(processed);
    setCropSrc(URL.createObjectURL(processed));
  }

  function cancelCrop() {
    setCropSrc(null);
    setPendingFile(null);
  }

  function confirmCrop(crop: AvatarCrop): { file: File | null; crop: AvatarCrop } {
    setCropSrc(null);
    const file = pendingFile;
    setPendingFile(null);
    return { file, crop };
  }

  function clearPickerError() {
    setPickerError(null);
  }

  return {
    fileInputRef,
    cropSrc,
    pendingFile,
    pickerError,
    openFilePicker,
    openCropper,
    handleFileChange,
    cancelCrop,
    confirmCrop,
    clearPickerError,
  };
}
