import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer style={{ borderTop: "1px solid #2A3050", backgroundColor: "#0C0F17" }}>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <img
              src="/Logo.png"
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 logo-blue"
            />
            <span
              className="text-base font-semibold"
              style={{
                color: "#E8ECF4",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              BossBoard
            </span>
          </div>
          <nav className="flex items-center gap-6">
            {[
              { href: "#features", label: "Features" },
              { href: "#pricing", label: "Pricing" },
              { href: "#faq", label: "FAQ" },
              { href: "/privacy", label: "Privacy" },
              { href: "/terms", label: "Terms" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm transition-colors duration-150 hover:opacity-80"
                style={{ color: "#5A6480" }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div
          className="mt-8 text-center text-sm"
          style={{
            borderTop: "1px solid #2A3050",
            paddingTop: "2rem",
            color: "#5A6480",
          }}
        >
          &copy; {new Date().getFullYear()} BossBoard. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
