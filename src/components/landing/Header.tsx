'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Logo } from './Logo';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggleCompact } from '@/components/ThemeToggle';

const navLinks = [
  { label: 'Features', href: '/#features' },
  { label: 'Templates', href: '/#templates' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Blog', href: '/blog' },
  { label: 'FAQ', href: '/#faq' },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, loading } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-b-primary bg-surface/80 backdrop-blur-lg">
      <div className="flex h-14 items-center justify-between gap-4 px-5">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-t-secondary hover:text-t-primary hover:bg-input-bg rounded transition-colors no-underline font-mono"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggleCompact />
          {loading ? null : user ? (
            <>
              <Link
                href="/dashboard"
                className="hidden sm:inline-flex px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-t-secondary hover:text-t-primary transition-colors no-underline font-mono"
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-b-primary overflow-hidden"
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs font-semibold text-t-secondary">
                    {user.displayName?.[0] ?? user.email?.[0] ?? "U"}
                  </span>
                )}
              </Link>
            </>
          ) : (
            <>
              <a
                href="/signin"
                className="hidden sm:inline-flex px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-t-secondary hover:text-t-primary transition-colors no-underline font-mono"
              >
                Sign in
              </a>
              <a
                href="/app"
                className="inline-flex h-9 items-center px-5 rounded border border-b-strong bg-btn-primary-bg text-[11px] font-semibold uppercase tracking-wider text-btn-primary-text hover:opacity-90 transition-colors no-underline font-mono"
              >
                Get Started
              </a>
            </>
          )}
          <button
            type="button"
            aria-label="Menu"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded text-t-secondary hover:bg-input-bg transition-colors md:hidden"
          >
            {menuOpen ? (
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M3 6H17M3 10H17M3 14H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-b-primary bg-surface md:hidden">
          <nav className="flex flex-col px-5 py-3 gap-1">
            {navLinks.map((link) => (
              <Link key={link.label} href={link.href} onClick={() => setMenuOpen(false)} className="px-3 py-2.5 text-sm font-medium text-t-secondary hover:text-t-primary hover:bg-input-bg rounded transition-colors no-underline">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
