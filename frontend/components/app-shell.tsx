"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, BookOpen, Bot, ChartNoAxesCombined, Menu, MessageSquare, PanelLeftClose, PanelLeftOpen, Plus, SquarePen, Wallet, X } from "lucide-react";
import { getLeaderboard } from "@/api";
import { SessionStatus } from "@/components/session-status";
import { TourMenu } from "@/components/tour-menu";
import { WalletButton } from "@/components/wallet/wallet-button";
import { useHydrated } from "@/lib/use-hydrated";

const navigation = [
  { href: "/", label: "Research", icon: MessageSquare },
  { href: "/sources", label: "Source archive", icon: BookOpen },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/dashboard", label: "My treasury", icon: Wallet },
  { href: "/leaderboard", label: "Public ledger", icon: ChartNoAxesCombined }
];

function Sidebar({ collapsed, onToggle, onNavigate, mobile = false }: {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
  mobile?: boolean;
}) {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const { data: ledger } = useQuery({ queryKey: ["leaderboard"], queryFn: getLeaderboard, retry: false });
  const recentResearch = hydrated
    ? [...new Map(ledger?.recentPaymentStream.map((receipt) => [receipt.answerId, receipt])).values()].slice(0, 4)
    : [];

  return (
    <>
      <div className="sidebar-brand">
        <Link href="/" onClick={onNavigate} aria-label="Maecenas home" className="flex min-w-0 items-center gap-2.5">
          <Image src="/icon.png" alt="" width={34} height={34} unoptimized className="shrink-0 rounded-full" />
          {!collapsed ? <span className="font-serif text-2xl text-cream">Maecenas</span> : null}
        </Link>
        {!collapsed ? (
          <button type="button" onClick={onToggle} className="shell-icon-button" aria-label={mobile ? "Close navigation" : "Collapse sidebar"}>
            {mobile ? <X size={18} /> : <PanelLeftClose size={17} />}
          </button>
        ) : null}
      </div>

      <div className="sidebar-scroll">
        <a href="/ask" onClick={onNavigate} className="sidebar-new" title="New research">
          <Plus size={19} className="shrink-0" />
          {!collapsed ? <span>New research</span> : <span className="sr-only">New research</span>}
        </a>
        <nav aria-label="Main navigation" className="mt-5 space-y-1">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" || pathname === "/ask" || pathname.startsWith("/answer/")
              : href === "/sources" ? pathname === "/sources" : pathname.startsWith(href);
            return (
              <Link key={href} href={href} onClick={onNavigate} title={collapsed ? label : undefined}
                aria-current={active ? "page" : undefined} className={`sidebar-link ${active ? "sidebar-link-active" : ""}`}>
                <Icon size={19} strokeWidth={1.6} className="shrink-0" />
                <span className={collapsed ? "sr-only" : ""}>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-7 border-t border-marble/[0.07] pt-5">
          {!collapsed ? <p className="sidebar-section-label">Contribute</p> : null}
          <Link href="/sources/new" onClick={onNavigate} title={collapsed ? "Publish evidence" : undefined}
            aria-current={pathname === "/sources/new" ? "page" : undefined}
            className={`sidebar-link ${pathname === "/sources/new" ? "sidebar-link-active" : ""}`}>
            <SquarePen size={19} strokeWidth={1.6} className="shrink-0" />
            <span className={collapsed ? "sr-only" : ""}>Publish evidence</span>
          </Link>
        </div>

        {!collapsed ? (
          <section className="mt-7" aria-label="Recent public research">
            <p className="sidebar-section-label">From the public ledger</p>
            {recentResearch.length ? recentResearch.map((receipt) => (
              <Link key={receipt.answerId} href={`/answer/${receipt.answerId}`} onClick={onNavigate}
                className="sidebar-recent" title={receipt.userPrompt}>
                <span className="truncate">{receipt.userPrompt}</span>
              </Link>
            )) : <p className="px-3 text-xs leading-6 text-dim">Funded research will appear here.</p>}
          </section>
        ) : null}
      </div>

      <div className="sidebar-bottom">
        {!collapsed ? (
          <Link href="/sources/new" onClick={onNavigate} className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-gold/15 bg-gold/5 p-3.5">
            <span><span className="block text-xs text-cream">Good evidence deserves credit.</span><span className="mt-1 block text-[11px] text-muted">Add your research to the archive</span></span>
            <ArrowUpRight size={15} className="shrink-0 text-gold" />
          </Link>
        ) : (
          <button type="button" className="shell-icon-button mx-auto mb-3" onClick={onToggle} aria-label="Expand sidebar"><PanelLeftOpen size={18} /></button>
        )}
        <WalletButton compact={collapsed} onOpen={onNavigate} />
        {!collapsed ? <p className="mt-3 px-1 text-[10px] text-dim">Built on Arc <span className="mx-1.5">·</span> Powered by Circle</p> : null}
      </div>
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const drawer = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const title = pathname.startsWith("/answer/") ? "Research brief"
    : pathname.startsWith("/receipts/") ? "Payment record"
    : pathname === "/sources/new" ? "Publish evidence"
    : pathname === "/admin" ? "Source review"
    : navigation.find((item) => item.href === pathname)?.label ?? "Research";

  function closeDrawer() {
    drawer.current?.close();
  }

  return (
    <div className={`app-shell ${collapsed ? "app-shell-collapsed" : ""}`}>
      <a href="#workspace" className="skip-link">Skip to content</a>
      <aside className="app-sidebar"><Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} /></aside>
      <dialog ref={drawer} className="mobile-sidebar" aria-label="Navigation"
        onClick={(event) => { if (event.target === event.currentTarget) closeDrawer(); }}>
        <div className="flex h-full flex-col"><Sidebar mobile collapsed={false} onToggle={closeDrawer} onNavigate={closeDrawer} /></div>
      </dialog>
      <div className="app-workspace" id="workspace" tabIndex={-1}>
        <header className="workspace-header">
          <div className="flex min-w-0 items-center gap-2.5">
            <button type="button" className="shell-icon-button lg:hidden" aria-label="Open navigation" onClick={() => drawer.current?.showModal()}><Menu size={20} /></button>
            <span className="text-sm text-muted">{title}</span>
            <span className="ml-1 hidden rounded-md border border-gold/15 bg-gold/5 px-2 py-0.5 text-[10px] text-gold sm:inline">Evidence first</span>
          </div>
          <div className="flex items-center gap-3"><SessionStatus /><TourMenu /></div>
        </header>
        {children}
      </div>
    </div>
  );
}
