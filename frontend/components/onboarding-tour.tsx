"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { driver, type DriveStep, type Driver } from "driver.js";
import {
  clearAnswerOnboardingTourReady,
  hasSeenOnboardingTour,
  isAnswerOnboardingTourReady,
  ONBOARDING_TOUR_EVENT,
  onboardingTourNames,
  recordOnboardingTourOutcome,
  type OnboardingTourName
} from "@/lib/onboarding";

const tourSteps: Record<OnboardingTourName, DriveStep[]> = {
  research: [
    {
      element: '[data-tour="research-mandate"]',
      popover: {
        title: "Start with a clear question",
        description:
          "Describe the decision or topic you need researched. Specific questions produce more useful, evidence-grounded briefs.",
        side: "bottom",
        align: "start"
      }
    },
    {
      element: '[data-tour="research-funding"]',
      popover: {
        title: "Choose how to fund the commission",
        description:
          "Use an available patron grant, or pay for an additional commission. You will always see the required amount before a paid run starts.",
        side: "bottom",
        align: "start"
      }
    },
    {
      element: '[data-tour="research-posture"]',
      popover: {
        title: "Set the research posture",
        description:
          "Focused prioritizes a tighter selection of evidence, while Expansive explores more broadly. Balanced is the default for most questions.",
        side: "bottom",
        align: "start"
      }
    },
    {
      element: '[data-tour="research-budget"]',
      popover: {
        title: "Cap the evidence budget",
        description:
          "This limits what the agent may allocate to evidence selected for the brief. It is separate from any access payment for the commission.",
        side: "bottom",
        align: "end"
      }
    },
    {
      element: '[data-tour="research-submit"]',
      popover: {
        title: "Commission the brief",
        description:
          "Maecenas evaluates the approved archive, returns cited findings, and records the funding trail behind the answer.",
        side: "top",
        align: "end"
      }
    }
  ],
  contribute: [
    {
      element: '[data-tour="source-wallet"]',
      popover: {
        title: "Connect the owner wallet",
        description:
          "This address establishes ownership of the source record and is where eligible funding can later be withdrawn.",
        side: "bottom",
        align: "end"
      }
    },
    {
      element: '[data-tour="source-record"]',
      popover: {
        title: "Create a trustworthy source record",
        description:
          "Add the public details researchers need to identify and evaluate the work: its title, publisher, canonical link, license, and context.",
        side: "top",
        align: "start"
      }
    },
    {
      element: '[data-tour="source-price"]',
      popover: {
        title: "Set the unlock price",
        description:
          "This is what the source earns when it is selected as funded evidence. It is not an upfront fee charged to you.",
        side: "bottom",
        align: "start"
      }
    },
    {
      element: '[data-tour="source-evidence"]',
      popover: {
        title: "Provide the fundable evidence",
        description:
          "Add the material the research agent can assess. It is only unlocked when selected for a commission under the source terms.",
        side: "top",
        align: "start"
      }
    },
    {
      element: '[data-tour="source-submit"]',
      popover: {
        title: "Submit for review",
        description:
          "New submissions begin in review. Once approved, the evidence can enter the archive and become eligible for funding.",
        side: "top",
        align: "start"
      }
    }
  ],
  answer: [
    {
      element: '[data-tour="answer-overview"]',
      popover: {
        title: "See how the evidence budget was used",
        description:
          "The overview shows the commission's evidence budget, what was spent, and how many sources were considered or selected.",
        side: "bottom",
        align: "center"
      }
    },
    {
      element: '[data-tour="answer-evidence"]',
      popover: {
        title: "Inspect the funded evidence",
        description:
          "Every cited source in the brief appears here. Open the original source to examine the underlying material directly.",
        side: "top",
        align: "start"
      }
    },
    {
      element: '[data-tour="answer-ledger"]',
      popover: {
        title: "Open the auditable trail",
        description:
          "The research ledger explains source selection, sources that were passed over, and the treasury records behind funded evidence.",
        side: "top",
        align: "start"
      }
    }
  ]
};

function isTourName(value: unknown): value is OnboardingTourName {
  return typeof value === "string" && onboardingTourNames.includes(value as OnboardingTourName);
}

function tourMatchesPath(tour: OnboardingTourName, pathname: string) {
  if (tour === "research") return pathname === "/" || pathname === "/ask";
  if (tour === "contribute") return pathname === "/sources/new";
  return pathname.startsWith("/answer/");
}

function getFirstTarget(tour: OnboardingTourName) {
  const firstStep = tourSteps[tour][0];
  return typeof firstStep.element === "string" ? document.querySelector(firstStep.element) : null;
}

export function OnboardingTour() {
  const pathname = usePathname();
  const activeDriver = useRef<Driver | null>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const autoStartKey = useRef("");

  const startTour = useCallback((tour: OnboardingTourName, explicit = false) => {
    if (!tourMatchesPath(tour, pathname) || activeDriver.current?.isActive()) return;
    if (!explicit && hasSeenOnboardingTour(tour)) return;
    if (!getFirstTarget(tour)) return;

    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    let outcome: "completed" | "dismissed" | undefined;

    const instance = driver({
      steps: tourSteps[tour],
      animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      allowClose: true,
      allowKeyboardControl: true,
      allowScroll: true,
      disableActiveInteraction: true,
      overlayColor: "#050706",
      overlayOpacity: 0.78,
      popoverClass: "maecenas-tour-popover",
      showButtons: ["previous", "next", "close"],
      showProgress: true,
      progressText: "{{current}} of {{total}}",
      nextBtnText: "Next",
      prevBtnText: "Back",
      doneBtnText: "Finish",
      onPopoverRender: (popover) => {
        popover.wrapper.setAttribute("role", "dialog");
        popover.wrapper.setAttribute("aria-modal", "true");
        popover.wrapper.setAttribute("aria-label", "Guided tour");
        popover.closeButton.setAttribute("aria-label", "Skip guided tour");
        window.setTimeout(() => popover.nextButton.focus(), 0);
      },
      onDoneClick: (_element, _step, options) => {
        outcome = "completed";
        options.driver.destroy();
      },
      onCloseClick: (_element, _step, options) => {
        outcome = "dismissed";
        options.driver.destroy();
      },
      onDestroyed: () => {
        recordOnboardingTourOutcome(tour, outcome ?? "dismissed");
        if (tour === "answer") clearAnswerOnboardingTourReady();
        activeDriver.current = null;
        previousFocus.current?.focus();
        previousFocus.current = null;
      }
    });

    activeDriver.current = instance;
    instance.drive();
  }, [pathname]);

  useEffect(() => {
    const handleTourRequest = (event: Event) => {
      const requestedTour = (event as CustomEvent<unknown>).detail;
      if (isTourName(requestedTour)) startTour(requestedTour, true);
    };

    window.addEventListener(ONBOARDING_TOUR_EVENT, handleTourRequest);
    return () => window.removeEventListener(ONBOARDING_TOUR_EVENT, handleTourRequest);
  }, [startTour]);

  const requestedTour =
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("tour");

  useEffect(() => {
    const startKey = `${pathname}:${requestedTour ?? ""}`;
    if (autoStartKey.current === startKey) return;
    autoStartKey.current = startKey;

    const explicitTour = isTourName(requestedTour) ? requestedTour : undefined;
    const answerTourReady = isAnswerOnboardingTourReady();
    const autoTour =
      explicitTour ??
      (pathname === "/" || pathname === "/ask"
        ? "research"
        : pathname === "/sources/new"
          ? "contribute"
          : pathname.startsWith("/answer/") && answerTourReady
            ? "answer"
            : undefined);

    if (!autoTour || !tourMatchesPath(autoTour, pathname)) return;
    if (!explicitTour && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timeout = window.setTimeout(() => {
      startTour(autoTour, Boolean(explicitTour));
      if (explicitTour) window.history.replaceState(null, "", pathname);
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [pathname, requestedTour, startTour]);

  useEffect(() => {
    return () => activeDriver.current?.destroy();
  }, []);

  return null;
}
