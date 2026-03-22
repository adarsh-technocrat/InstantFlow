'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Avatar } from '@/components/ui/Avatar';

const cursors = [
  { name: 'Ava', color: '#f87171', x: '8%', y: '22%', delay: 0.8 },
  { name: 'Marcus', color: '#60a5fa', x: '85%', y: '16%', delay: 1.2 },
  { name: 'Priya', color: '#34d399', x: '78%', y: '72%', delay: 1.6 },
  { name: 'Jake', color: '#fbbf24', x: '12%', y: '68%', delay: 2.0 },
  { name: 'Mei', color: '#c084fc', x: '90%', y: '45%', delay: 1.0 },
  { name: 'Sara', color: '#fb923c', x: '45%', y: '82%', delay: 1.8 },
];

export function Hero() {
  const [promptText, setPromptText] = useState('');

  return (
    <section id="hero" className="relative border-b border-b-primary bg-surface px-5 py-20 md:py-28 overflow-hidden">
      {/* Dotted canvas background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage: 'radial-gradient(circle, var(--canvas-dot) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      {/* Radial glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: '900px',
          height: '600px',
          background: 'radial-gradient(ellipse, rgba(255,255,255,0.03) 0%, transparent 70%)',
        }}
      />

      {/* Cursors */}
      {cursors.map((cursor) => (
        <motion.div
          key={cursor.name}
          className="pointer-events-none absolute z-[2] hidden lg:block"
          style={{ left: cursor.x, top: cursor.y }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: cursor.delay, duration: 0.4, type: 'spring', stiffness: 260, damping: 20 }}
        >
          <motion.div
            animate={{ x: [0, 6, -4, 10, 0], y: [0, -8, 4, -6, 0] }}
            transition={{ duration: 8 + (parseInt(cursor.name, 36) % 4), repeat: Infinity, ease: 'easeInOut' }}
          >
            <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
              <path d="M1 1L1 15.5L5.5 11.5L9.5 19L12.5 17.5L8.5 10L14 9L1 1Z" fill={cursor.color} stroke="white" strokeWidth="1.2" strokeLinejoin="round" />
            </svg>
            <motion.div
              className="ml-4 -mt-0.5 rounded-md px-2 py-0.5 text-[10px] font-semibold shadow-lg whitespace-nowrap"
              style={{ backgroundColor: cursor.color, color: '#000' }}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: cursor.delay + 0.3, duration: 0.3 }}
            >
              {cursor.name}
            </motion.div>
          </motion.div>
        </motion.div>
      ))}

      <div className="relative z-[3] mx-auto flex max-w-2xl flex-col items-center text-center">
        {/* Badge */}
        <motion.div
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-b-secondary bg-input-bg px-3.5 py-1.5 text-xs text-t-secondary"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/60 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white/80" />
          </span>
          Now in public beta
        </motion.div>

        {/* Heading */}
        <motion.h1
          className="text-[32px] md:text-[56px] font-semibold leading-[1.1] tracking-tight text-t-primary"
          style={{ fontFamily: "var(--font-logo), 'Space Grotesk', sans-serif" }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
        >
          Idea to Flutter app,
          <br />
          <span className="text-t-secondary">in seconds</span>
        </motion.h1>

        <motion.p
          className="mt-5 text-base md:text-lg text-t-secondary max-w-md text-balance leading-relaxed"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          Describe your app, get beautiful designs and production-ready Flutter code — instantly.
        </motion.p>

        {/* Prompt box */}
        <motion.div
          className="mt-10 w-full max-w-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.7 }}
        >
          <div className="flex w-full flex-col rounded-2xl border border-b-primary bg-surface-elevated p-5 shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="Describe your app idea... e.g. A fitness tracker with dark theme, weekly progress charts, and bottom nav"
              className="w-full bg-transparent text-t-primary placeholder-t-tertiary resize-none focus:outline-none text-[15px] leading-relaxed min-h-[140px]"
              rows={5}
            />
            <div className="flex items-center justify-between pt-3 mt-2 border-t border-b-secondary">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="flex items-center justify-center rounded-lg p-2 text-t-tertiary hover:text-t-secondary hover:bg-input-bg transition-colors"
                  title="Attach"
                >
                  <svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor">
                    <path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z" />
                  </svg>
                </button>
                <span className="text-[10px] font-mono uppercase tracking-wider text-t-tertiary border border-b-secondary rounded px-2 py-1">Flutter · Dart</span>
              </div>
              <button className="inline-flex h-9 items-center gap-2 px-5 rounded-lg bg-btn-primary-bg text-sm font-semibold text-btn-primary-text hover:opacity-90 transition-colors">
                Generate
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Trust */}
        <motion.div
          className="mt-8 flex items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <div className="flex -space-x-2">
            {['alex@demo.com', 'maria@demo.com', 'sam@demo.com', 'priya@demo.com'].map((email) => (
              <div key={email} className="rounded-full border-2 border-surface">
                <Avatar email={email} size={28} />
              </div>
            ))}
          </div>
          <p className="text-xs text-t-tertiary">
            <span className="font-semibold text-t-secondary">1,000+</span> developers ship with Launchpad AI
          </p>
        </motion.div>
      </div>
    </section>
  );
}
