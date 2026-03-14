import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer style={{ borderTop: "1px solid #2A3050", backgroundColor: "#0C0F17" }}>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" className="h-8 w-8">
              <rect x="8" y="8" width="48" height="48" rx="12" fill="#4F8BFF"/>
              <path d="M22 18h12c4.4 0 8 3.6 8 8 0 2.5-1.2 4.8-3 6.2 2.5 1.5 4 4.2 4 7.3 0 4.7-3.8 8.5-8.5 8.5H22V18zm6 5v8h6c1.7 0 3-1.3 3-3v-2c0-1.7-1.3-3-3-3h-6zm0 13v8h7.5c1.9 0 3.5-1.6 3.5-3.5v-1c0-1.9-1.6-3.5-3.5-3.5H28z" fill="#FFFFFF"/>
            </svg>
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
