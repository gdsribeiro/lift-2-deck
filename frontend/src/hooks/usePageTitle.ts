import { useEffect } from "react";

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} — Lift2Deck` : "Lift2Deck";
  }, [title]);
}
