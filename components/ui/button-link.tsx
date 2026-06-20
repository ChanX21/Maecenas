import Link from "next/link";
import type { ReactNode } from "react";

type ButtonLinkProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
};

const variants = {
  primary: "bg-gold text-ink hover:bg-gold-soft",
  secondary: "border border-white/12 bg-panel text-cream hover:border-gold/50",
  ghost: "border border-white/12 text-muted hover:text-cream"
};

export function ButtonLink({ href, children, variant = "secondary" }: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 font-mono text-xs font-semibold uppercase transition ${variants[variant]}`}
    >
      {children}
    </Link>
  );
}
