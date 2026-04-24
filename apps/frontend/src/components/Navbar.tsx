"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated, logout } = useAuth();

  const navLinks = [
    { href: "/matches", label: "Matches" },
    { href: "/jobs", label: "Jobs" },
    { href: "/profile", label: "Profile" },
    { href: "/pricing", label: "Pricing" },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-brand-700">
          Zed CV
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-gray-600 hover:text-brand-600 transition touch-target flex items-center"
            >
              {link.label}
            </Link>
          ))}
          {isAuthenticated ? (
            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-red-600 transition"
            >
              Sign Out
            </button>
          ) : (
            <Link
              href="/auth"
              className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition"
            >
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="sm:hidden touch-target flex items-center justify-center"
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="sm:hidden border-t border-gray-100 bg-white px-4 pb-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="block py-3 text-gray-700 hover:text-brand-600 border-b border-gray-50 touch-target"
            >
              {link.label}
            </Link>
          ))}
          {isAuthenticated ? (
            <button
              onClick={() => {
                logout();
                setMenuOpen(false);
              }}
              className="block w-full text-left py-3 text-red-600 touch-target"
            >
              Sign Out
            </button>
          ) : (
            <Link
              href="/auth"
              onClick={() => setMenuOpen(false)}
              className="block mt-2 text-center bg-brand-600 text-white py-3 rounded-lg font-medium"
            >
              Sign In
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
