type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  copy?: string;
};

export function SectionHeading({ eyebrow, title, copy }: SectionHeadingProps) {
  return (
    <div className="max-w-3xl">
      {eyebrow ? <p className="font-mono text-xs uppercase tracking-[0.22em] text-gold">{eyebrow}</p> : null}
      <h1 className="mt-3 font-display text-4xl leading-tight text-cream sm:text-5xl">{title}</h1>
      {copy ? <p className="mt-4 text-base leading-7 text-muted">{copy}</p> : null}
    </div>
  );
}
