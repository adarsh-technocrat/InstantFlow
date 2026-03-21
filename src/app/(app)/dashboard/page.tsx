"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

const recentProjects = [
  { id: "1", name: "Health Tracker", updatedAt: "2 hours ago", screens: 8 },
  { id: "2", name: "Social Media App", updatedAt: "Yesterday", screens: 12 },
  { id: "3", name: "E-Commerce Store", updatedAt: "3 days ago", screens: 15 },
  { id: "4", name: "Fitness Dashboard", updatedAt: "5 days ago", screens: 6 },
];

const prompts = [
  "A fitness tracker with dark theme and weekly charts",
  "E-commerce app with product cards and cart",
  "Social media feed with stories and bottom nav",
  "Music player with album art and playlist view",
];

function StreamingPlaceholder() {
  const [promptIndex, setPromptIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    const text = prompts[promptIndex];
    let charIndex = 0;
    setDisplayed("");
    setIsTyping(true);

    const typeInterval = setInterval(() => {
      if (charIndex < text.length) {
        setDisplayed(text.slice(0, charIndex + 1));
        charIndex++;
      } else {
        clearInterval(typeInterval);
        setIsTyping(false);
        setTimeout(() => {
          setPromptIndex((prev) => (prev + 1) % prompts.length);
        }, 2500);
      }
    }, 40);

    return () => clearInterval(typeInterval);
  }, [promptIndex]);

  return (
    <span className="text-white/25">
      {displayed}
      {isTyping && (
        <span className="inline-block w-px h-4 bg-white/40 ml-0.5 animate-pulse align-middle" />
      )}
    </span>
  );
}

export default function DashboardPage() {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (!inputValue.trim()) return;
    window.location.href = "/app";
  };

  return (
    <div className="h-screen w-full bg-black text-white p-3">
      {/* Main container — inset from all edges */}
      <div className="h-full w-full rounded-2xl border border-white/[0.1] bg-[#0a0a0a] overflow-hidden flex flex-col relative">
        {/* Dotted canvas bg */}
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />

        {/* Top bar */}
        <header className="relative z-10 flex items-center justify-between h-12 px-5 border-b border-white/[0.08] flex-shrink-0">
          <Link
            href="/"
            className="no-underline flex items-center gap-2"
          >
            <span
              className="text-sm font-bold text-white tracking-tight"
              style={{
                fontFamily: "var(--font-logo), 'Space Grotesk', sans-serif",
              }}
            >
              launchpad<span className="text-white/40">.ai</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-white/20 uppercase tracking-wider">
              Dashboard
            </span>
            <div className="ml-2 h-4 w-px bg-white/[0.08]" />
            <button className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.1] text-white/40 hover:text-white hover:border-white/[0.2] transition-colors">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </button>
          </div>
        </header>

        {/* Center content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
          {/* Greeting */}
          <motion.div
            className="flex flex-col items-center text-center mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1
              className="text-3xl md:text-4xl font-semibold tracking-tight text-white"
              style={{
                fontFamily: "var(--font-logo), 'Space Grotesk', sans-serif",
              }}
            >
              What would you like
              <br />
              <span className="text-white/30">to build today?</span>
            </h1>
          </motion.div>

          {/* Prompt input */}
          <motion.div
            className="w-full max-w-[580px]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6 }}
          >
            <div className="rounded-2xl border border-white/[0.15] bg-[#111113]/90 backdrop-blur-xl shadow-[0_8px_48px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] transition-all focus-within:border-white/[0.25]">
              <div className="px-4 pt-4 pb-2 relative">
                {/* Streaming placeholder when empty */}
                {!inputValue && (
                  <div className="absolute inset-x-4 top-4 pointer-events-none text-[15px] leading-relaxed">
                    <StreamingPlaceholder />
                  </div>
                )}
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  placeholder=""
                  rows={3}
                  className="w-full bg-transparent text-[15px] text-white placeholder-transparent outline-none resize-none leading-relaxed min-h-[76px] max-h-[140px] relative z-10"
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = "auto";
                    el.style.height = Math.min(el.scrollHeight, 140) + "px";
                  }}
                />
              </div>

              <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex size-7 items-center justify-center rounded-md text-white/25 hover:text-white/50 hover:bg-white/[0.05] transition-colors"
                    title="Attach"
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 256 256"
                      fill="currentColor"
                    >
                      <path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z" />
                    </svg>
                  </button>
                  <span className="text-[10px] font-mono text-white/20 border border-white/[0.08] rounded px-1.5 py-0.5 bg-white/[0.03]">
                    Flutter · Dart
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-white/15 border border-white/[0.08] rounded px-1.5 py-0.5 hidden sm:inline bg-white/[0.03]">
                    ⌘ Enter
                  </span>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!inputValue.trim()}
                    className="inline-flex size-8 items-center justify-center rounded-lg bg-white text-black transition-all hover:bg-white/90 disabled:opacity-15 disabled:pointer-events-none active:scale-95"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom — recent projects */}
        <motion.div
          className="relative z-10 border-t border-white/[0.06] flex-shrink-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className="flex items-center justify-between px-5 py-2.5">
            <span className="text-[10px] font-mono font-medium uppercase tracking-wider text-white/25">
              Recent
            </span>
            <Link
              href="/app"
              className="text-[10px] font-mono uppercase tracking-wider text-white/20 hover:text-white/50 transition-colors no-underline"
            >
              View all
            </Link>
          </div>

          <div className="flex gap-px bg-white/[0.06] border-t border-white/[0.06]">
            {recentProjects.map((project) => (
              <Link
                key={project.id}
                href="/app"
                className="flex-1 flex flex-col gap-1 px-4 py-3 bg-[#0a0a0a] hover:bg-white/[0.02] transition-colors no-underline group"
              >
                <p className="text-xs font-medium text-white/60 group-hover:text-white/80 truncate transition-colors">
                  {project.name}
                </p>
                <p className="text-[10px] font-mono text-white/20">
                  {project.screens} screens · {project.updatedAt}
                </p>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
