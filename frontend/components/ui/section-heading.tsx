type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  copy?: string;
};

export function SectionHeading({ eyebrow, title, copy }: SectionHeadingProps) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      {eyebrow ? <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-gold">{eyebrow}</p> : null}
      <h1 className="mt-4 font-display text-4xl leading-[1.05] text-cream sm:text-6xl">{title}</h1>
      {copy ? <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted">{copy}</p> : null}
    </div>
  );
}
