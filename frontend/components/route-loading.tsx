export function RouteLoading() {
  return (
    <main
      className="home-grid grid min-h-[calc(100vh-65px)] place-items-center px-4 py-16 sm:px-6 lg:px-8"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="route-loader">
        <span className="route-loader-spinner" aria-hidden="true" />
        <span>Loading</span>
      </div>
    </main>
  );
}
