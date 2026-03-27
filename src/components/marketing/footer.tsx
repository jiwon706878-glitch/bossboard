import Image from "next/image";
import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.svg" alt="BossBoard" width={28} height={28} className="h-7 w-7" />
            <span
              className="text-base font-semibold"
              style={{
                color: "var(--foreground)",
                fontFamily: "'A2Z', sans-serif",
              }}
            >
              BossBoard
            </span>
          </div>
          <nav className="flex items-center gap-6">
            {[
              { href: "/#features", label: "Features" },
              { href: "/#pricing", label: "Pricing" },
              { href: "/#faq", label: "FAQ" },
              { href: "/privacy", label: "Privacy" },
              { href: "/terms", label: "Terms" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm transition-colors duration-150 hover:opacity-80"
                style={{ color: "var(--muted-foreground)" }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div
          className="mt-8 border-t pt-8 text-center text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          &copy; {new Date().getFullYear()} BossBoard. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
