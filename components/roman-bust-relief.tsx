export function RomanBustRelief() {
  return (
    <div className="roman-relic" aria-label="Roman marble bust relief of Mecenas">
      <div className="roman-relic__ring">
        <div className="roman-relic__wreath roman-relic__wreath--left" />
        <div className="roman-relic__wreath roman-relic__wreath--right" />
        <div className="roman-bust">
          <div className="roman-bust__head">
            <span className="roman-bust__hair roman-bust__hair--one" />
            <span className="roman-bust__hair roman-bust__hair--two" />
            <span className="roman-bust__hair roman-bust__hair--three" />
            <span className="roman-bust__brow" />
            <span className="roman-bust__nose" />
            <span className="roman-bust__mouth" />
          </div>
          <div className="roman-bust__neck" />
          <div className="roman-bust__shoulders">
            <span className="roman-bust__fold roman-bust__fold--one" />
            <span className="roman-bust__fold roman-bust__fold--two" />
            <span className="roman-bust__fold roman-bust__fold--three" />
          </div>
        </div>
      </div>
      <div className="mt-5 text-center">
        <p className="font-display text-2xl italic text-marble">Gaius Maecenas</p>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.32em] text-bronze">
          Patronus Fontium
        </p>
      </div>
    </div>
  );
}
