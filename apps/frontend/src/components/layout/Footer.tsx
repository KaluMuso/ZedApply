"use client";

import Link from "next/link";

const col = {
  product: [
    { href: "/#features", label: "Features" },
    { href: "/pricing", label: "Pricing" },
    { href: "/#how-it-works", label: "How it works" },
  ],
  company: [
    { href: "/#about", label: "About" },
    { href: "mailto:convergeozambia@gmail.com", label: "Contact" },
  ],
  legal: [
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms of Service" },
  ],
};

function Column({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {links.map((l) => (
          <li key={l.href + l.label}>
            <Link href={l.href} className="hover:text-primary min-h-11 items-center flex transition-colors">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-card/30">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-6 w-1 rounded-sm bg-primary" aria-hidden />
              <span className="text-lg font-bold">Zed CV</span>
            </div>
            <p className="text-sm text-muted-foreground">
              AI-powered job matching for Zambia. Built for first-time job seekers on real phones and real
              connections.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              <span className="sr-only">Social — </span>
              <a href="https://twitter.com" className="hover:text-primary" target="_blank" rel="noreferrer">
                @zedcv
              </a>{" "}
              (coming soon)
            </p>
          </div>
          <div className="hidden sm:block">
            <Column title="Product" links={col.product} />
          </div>
          <div className="hidden sm:block">
            <Column title="Company" links={col.company} />
          </div>
          <div className="hidden sm:block">
            <Column title="Legal" links={col.legal} />
          </div>
        </div>

        <div className="mt-8 sm:hidden space-y-2">
          <details className="border-b border-border/60 py-1">
            <summary className="min-h-11 cursor-pointer font-medium">Product</summary>
            <ul className="space-y-2 text-sm text-muted-foreground py-2">
              {col.product.map((l) => (
                <li key={l.label}>
                  <Link href={l.href}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </details>
          <details className="border-b border-border/60 py-1">
            <summary className="min-h-11 cursor-pointer font-medium">Company</summary>
            <ul className="space-y-2 text-sm text-muted-foreground py-2">
              {col.company.map((l) => (
                <li key={l.label}>
                  {l.href.startsWith("http") || l.href.startsWith("mailto:") ? (
                    <a href={l.href}>{l.label}</a>
                  ) : (
                    <Link href={l.href}>{l.label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </details>
          <details className="border-b border-border/60 py-1">
            <summary className="min-h-11 cursor-pointer font-medium">Legal</summary>
            <ul className="space-y-2 text-sm text-muted-foreground py-2">
              {col.legal.map((l) => (
                <li key={l.label}>
                  <Link href={l.href}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </details>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-border pt-8 sm:flex-row">
          <p className="text-sm text-muted-foreground text-center sm:text-left">
            © 2026 Zed CV. Made with care in Lusaka, Zambia.
          </p>
          <p className="text-sm text-muted-foreground">Language: English (Bemba — coming soon)</p>
        </div>
        <p className="text-center sm:text-left text-xs text-muted-foreground/80 pt-2">
          MTN Mobile Money and Airtel Money supported for subscriptions in Zambia.
        </p>
      </div>
    </footer>
  );
}
