import { useEffect } from "react";

let activeLocks = 0;
let previousOverflow = null;

export function useBodyScrollLock(active) {
  useEffect(() => {
    if (!active || typeof document === "undefined") {
      return undefined;
    }

    activeLocks += 1;

    if (activeLocks === 1) {
      previousOverflow = document.body.style.overflow || "";
      document.body.style.overflow = "hidden";
    }

    return () => {
      activeLocks = Math.max(0, activeLocks - 1);
      if (activeLocks === 0 && typeof document !== "undefined") {
        document.body.style.overflow = previousOverflow || "";
        previousOverflow = null;
      }
    };
  }, [active]);
}

