type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  copy?: string;
};

export function SectionHeading({ eyebrow, title, copy }: SectionHeadingProps) {
  return (
    <div className="mx-auto max-w-6xl">
      {eyebrow ? <p className="text-xs text-gold">{eyebrow}</p> : null}
      <h1 className="mt-3 text-balance font-serif text-3xl leading-tight tracking-[-0.02em] text-cream sm:text-[2.5rem]">{title}</h1>
      {copy ? <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">{copy}</p> : null}
    </div>
  );
}
