"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CircleHelp } from "lucide-react";
import { requestOnboardingTour, type OnboardingTourName } from "@/lib/onboarding";

const tourLabels: Record<OnboardingTourName, string> = {
  research: "Commission research",
  contribute: "Publish evidence",
  answer: "Understand a brief"
};

function pathForTour(tour: OnboardingTourName) {
  if (tour === "research") return "/ask?tour=research";
  if (tour === "contribute") return "/sources/new?tour=contribute";
  return undefined;
}

function canRunOnCurrentPage(tour: OnboardingTourName, pathname: string) {
  if (tour === "research") return pathname === "/" || pathname === "/ask";
  if (tour === "contribute") return pathname === "/sources/new";
  return pathname.startsWith("/answer/");
}

export function TourMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeWhenOutside = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeWhenOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeWhenOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function launchTour(tour: OnboardingTourName) {
    setOpen(false);
    if (canRunOnCurrentPage(tour, pathname)) {
      requestOnboardingTour(tour);
      return;
    }

    const destination = pathForTour(tour);
    if (destination) router.push(destination);
  }

  const options = (Object.keys(tourLabels) as OnboardingTourName[]).filter(
    (tour) => tour !== "answer" || pathname.startsWith("/answer/")
  );

  return (
    <div ref={container} className="relative">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Open guided tours"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex min-h-11 items-center gap-2 border border-marble/15 bg-panel px-3 py-2 font-mono text-[10px] uppercase text-muted transition hover:bg-marble/10 hover:text-cream sm:min-h-0 sm:text-[11px]"
      >
        <CircleHelp size={14} />
        <span className="hidden lg:inline">Guide</span>
      </button>
      {isOpen ? (
        <div
          role="menu"
          aria-label="Guided tours"
          className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-md border border-marble/15 bg-panel-2 p-1 shadow-2xl"
        >
          <p role="none" className="px-3 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-dim">Guided tours</p>
          {options.map((tour) => (
            <button
              key={tour}
              type="button"
              role="menuitem"
              onClick={() => launchTour(tour)}
              className="flex w-full items-center rounded-sm px-3 py-2.5 text-left text-sm text-muted transition hover:bg-marble/10 hover:text-cream focus:bg-marble/10 focus:outline-none"
            >
              {tourLabels[tour]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
