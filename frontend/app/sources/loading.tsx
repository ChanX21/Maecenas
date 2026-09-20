export default function SourcesLoading() {
  return (
    <main className="home-grid min-h-[calc(100vh-65px)] px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto h-28 max-w-2xl animate-pulse rounded-lg bg-marble/5" />
      <div className="mx-auto mt-10 grid max-w-7xl gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="roman-panel h-72 animate-pulse bg-marble/5" />
        ))}
      </div>
    </main>
  );
}
