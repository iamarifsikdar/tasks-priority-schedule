import { useEffect } from "react";

interface Opts {
  onQuickAdd?: () => void;
  onGoHome?: () => void;
  onGoTasks?: () => void;
}

export function useKeyboardShortcuts(opts: Opts) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isInput =
        target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        opts.onQuickAdd?.();
        return;
      }
      if (isInput) return;
      if (e.key === "g") {
        const handler = (ev: KeyboardEvent) => {
          if (ev.key === "h") opts.onGoHome?.();
          if (ev.key === "t") opts.onGoTasks?.();
          window.removeEventListener("keydown", handler);
        };
        window.addEventListener("keydown", handler, { once: true });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [opts]);
}