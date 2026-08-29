"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

function isInternalNavigation(event: MouseEvent) {
  if (event.defaultPrevented || event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;

  const origin = event.target instanceof Element ? event.target.closest("a[href]") : null;
  if (!(origin instanceof HTMLAnchorElement)) return false;
  if (origin.target && origin.target !== "_self") return false;
  if (origin.hasAttribute("download")) return false;

  const destination = new URL(origin.href, window.location.href);
  if (destination.origin !== window.location.origin) return false;
  if (destination.pathname === window.location.pathname && destination.search === window.location.search) return false;
  if (destination.pathname === window.location.pathname && destination.hash) return false;

  return true;
}

export function NavigationFeedback() {
  const pathname = usePathname();
  const [isNavigating, setNavigating] = useState(false);
  const completionTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    window.clearTimeout(completionTimer.current);
    setNavigating(false);
  }, [pathname]);

  useEffect(() => {
    const startNavigation = (event: MouseEvent) => {
      if (!isInternalNavigation(event)) return;
      window.clearTimeout(completionTimer.current);
      setNavigating(true);
      completionTimer.current = window.setTimeout(() => setNavigating(false), 10_000);
    };

    document.addEventListener("click", startNavigation, true);
    return () => {
      document.removeEventListener("click", startNavigation, true);
      window.clearTimeout(completionTimer.current);
    };
  }, []);

  return (
    <>
      <div
        aria-hidden="true"
        className={`navigation-progress ${isNavigating ? "navigation-progress-active" : ""}`}
      >
        <span />
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {isNavigating ? "Loading page" : ""}
      </p>
    </>
  );
}
