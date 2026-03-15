"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export function MarketingNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { href: "/#features", label: "Features" },
    { href: "/#how-it-works", label: "How It Works" },
    { href: "/#pricing", label: "Pricing" },
    { href: "/#faq", label: "FAQ" },
  ];

  return (
    <header
      className="sticky top-0 z-50 w-full"
      style={{
        backgroundColor: "rgba(16, 20, 32, 0.95)",
        borderBottom: "1px solid #2A3050",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo.svg" alt="BossBoard" width={32} height={32} className="h-8 w-8" style={{ userSelect: "none" }} draggable={false} onContextMenu={(e) => e.preventDefault()} />
          <span
            className="text-xl font-bold"
            style={{
              color: "#E8ECF4",
              fontFamily: "'A2Z', sans-serif",
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
                fontFamily: "'A2Z', sans-serif",
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
          <ThemeToggle />
          <Link
            href="/signup"
            className="hidden sm:inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors duration-150"
            style={{
              backgroundColor: "#4F8BFF",
              color: "#FFFFFF",
              fontFamily: "'A2Z', sans-serif",
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
          style={{ backgroundColor: "#101420" }}
        >
          <nav className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm py-2"
                style={{
                  color: "#8B95B0",
                  fontFamily: "'A2Z', sans-serif",
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
                fontFamily: "'A2Z', sans-serif",
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
