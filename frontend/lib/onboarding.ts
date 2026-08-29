export const ONBOARDING_TOUR_EVENT = "maecenas:tour-request";

export const onboardingTourNames = ["research", "contribute", "answer"] as const;

export type OnboardingTourName = (typeof onboardingTourNames)[number];

type TourRecord = {
  dismissedAt?: string;
  completedAt?: string;
  version: number;
};

const ONBOARDING_VERSION = 1;
const storageKey = (tour: OnboardingTourName) => `maecenas:onboarding:${tour}`;

function readRecord(tour: OnboardingTourName): TourRecord | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    const value = window.localStorage.getItem(storageKey(tour));
    if (!value) return undefined;
    const record = JSON.parse(value) as TourRecord;
    return record.version === ONBOARDING_VERSION ? record : undefined;
  } catch {
    return undefined;
  }
}

function writeRecord(tour: OnboardingTourName, record: TourRecord) {
  try {
    window.localStorage.setItem(storageKey(tour), JSON.stringify(record));
  } catch {
    // Private browsing or a blocked storage policy should never prevent use of the product.
  }
}

export function hasSeenOnboardingTour(tour: OnboardingTourName) {
  const record = readRecord(tour);
  return Boolean(record?.completedAt || record?.dismissedAt);
}

export function recordOnboardingTourOutcome(
  tour: OnboardingTourName,
  outcome: "completed" | "dismissed"
) {
  writeRecord(tour, {
    version: ONBOARDING_VERSION,
    [outcome === "completed" ? "completedAt" : "dismissedAt"]: new Date().toISOString()
  });
}

export function requestOnboardingTour(tour: OnboardingTourName) {
  window.dispatchEvent(
    new CustomEvent<OnboardingTourName>(ONBOARDING_TOUR_EVENT, { detail: tour })
  );
}

const answerTourReadyKey = "maecenas:onboarding:answer-ready";

export function prepareAnswerOnboardingTour() {
  try {
    window.sessionStorage.setItem(answerTourReadyKey, "true");
  } catch {
    // The answer remains usable when session storage is unavailable.
  }
}

export function isAnswerOnboardingTourReady() {
  try {
    return window.sessionStorage.getItem(answerTourReadyKey) === "true";
  } catch {
    return false;
  }
}

export function clearAnswerOnboardingTourReady() {
  try {
    window.sessionStorage.removeItem(answerTourReadyKey);
  } catch {
    // Nothing to clean up when session storage is unavailable.
  }
}
