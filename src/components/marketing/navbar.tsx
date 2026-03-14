"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export function MarketingNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { href: "#features", label: "Features" },
    { href: "#how-it-works", label: "How It Works" },
    { href: "#pricing", label: "Pricing" },
    { href: "#faq", label: "FAQ" },
  ];

  return (
    <header
      className="sticky top-0 z-50 w-full"
      style={{
        backgroundColor: "rgba(12, 15, 23, 0.95)",
        borderBottom: "1px solid #2A3050",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" className="h-10 w-10" style={{ userSelect: "none" }} onContextMenu={(e) => e.preventDefault()}>
            <rect x="8" y="8" width="48" height="48" rx="12" fill="#4F8BFF"/>
            <path d="M22 18h12c4.4 0 8 3.6 8 8 0 2.5-1.2 4.8-3 6.2 2.5 1.5 4 4.2 4 7.3 0 4.7-3.8 8.5-8.5 8.5H22V18zm6 5v8h6c1.7 0 3-1.3 3-3v-2c0-1.7-1.3-3-3-3h-6zm0 13v8h7.5c1.9 0 3.5-1.6 3.5-3.5v-1c0-1.9-1.6-3.5-3.5-3.5H28z" fill="#FFFFFF"/>
          </svg>
          <span
            className="text-xl font-bold"
            style={{
              color: "#E8ECF4",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            BossBoard
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm transition-colors duration-150"
              style={{
                color: "#8B95B0",
                fontFamily: "'DM Sans', sans-serif",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "#E8ECF4")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "#8B95B0")
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/signup"
            className="hidden sm:inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors duration-150"
            style={{
              backgroundColor: "#4F8BFF",
              color: "#FFFFFF",
              fontFamily: "'DM Sans', sans-serif",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#6BA0FF")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#4F8BFF")
            }
          >
            Get Started Free
          </Link>

          <button
            className="md:hidden p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{ color: "#8B95B0" }}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="md:hidden px-4 pb-4"
          style={{ backgroundColor: "#0C0F17" }}
        >
          <nav className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm py-2"
                style={{
                  color: "#8B95B0",
                  fontFamily: "'DM Sans', sans-serif",
                }}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium mt-2"
              style={{
                backgroundColor: "#4F8BFF",
                color: "#FFFFFF",
                fontFamily: "'DM Sans', sans-serif",
              }}
              onClick={() => setMobileOpen(false)}
            >
              Get Started Free
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
