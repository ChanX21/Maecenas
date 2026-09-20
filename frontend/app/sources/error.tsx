"use client";

export default function SourcesError({ reset }: { reset: () => void }) {
  return (
    <main className="home-grid min-h-[calc(100vh-65px)] px-4 py-14 sm:px-6 lg:px-8">
      <div role="alert" className="roman-panel mx-auto max-w-xl p-10 text-center">
        <h1 className="font-display text-3xl text-cream">The archive could not be loaded.</h1>
        <button type="button" onClick={reset} className="roman-button mt-6 bg-gold px-5 py-3 font-mono text-xs font-semibold uppercase text-ink">
          Retry
        </button>
      </div>
    </main>
  );
}
