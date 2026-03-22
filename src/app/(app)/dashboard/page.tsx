"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

interface Project {
  id: string;
  name: string;
  screens: number;
  createdAt: string;
  updatedAt: string;
}

const streamingPrompts = [
  "A fitness tracker with dark theme and weekly charts",
  "E-commerce app with product cards and cart",
  "Social media feed with stories and bottom nav",
  "Music player with album art and playlist view",
];

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function StreamingPlaceholder() {
  const [promptIndex, setPromptIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    const text = streamingPrompts[promptIndex];
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
          setPromptIndex((prev) => (prev + 1) % streamingPrompts.length);
        }, 2500);
      }
    }, 40);

    return () => clearInterval(typeInterval);
  }, [promptIndex]);

  return (
    <span className="text-t-tertiary">
      {displayed}
      {isTyping && <span className="inline-block w-px h-4 bg-white/40 ml-0.5 animate-pulse align-middle" />}
    </span>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const [inputValue, setInputValue] = useState("");
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Redirect if not signed in
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/signin");
    }
  }, [user, authLoading, router]);

  // Fetch projects
  useEffect(() => {
    if (!user) return;
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data: { projects?: Project[] }) => {
        if (data.projects) setProjects(data.projects);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  // Create new project and navigate
  const createProject = useCallback(
    async (name?: string) => {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || "Untitled Project" }),
      });
      const data: { id?: string } = await res.json();
      if (data.id) {
        router.push(`/app/${data.id}`);
      }
    },
    [router],
  );

  const handleSubmit = () => {
    if (!inputValue.trim()) return;
    createProject(inputValue.trim());
  };

  if (authLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-surface">
        <div className="flex items-center gap-2 text-sm text-t-secondary">
          <div className="size-2 rounded-full bg-t-tertiary animate-pulse" />
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-surface text-t-primary p-3">
      <div className="h-full w-full rounded-2xl border border-b-primary bg-canvas-bg overflow-hidden flex flex-col relative">
        {/* Dotted canvas bg */}
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            backgroundImage: "radial-gradient(circle, var(--canvas-dot) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />

        {/* Top bar */}
        <header className="relative z-10 flex items-center justify-between h-12 px-5 border-b border-b-secondary flex-shrink-0">
          <Link href="/" className="no-underline flex items-center gap-2">
            <span className="text-sm font-bold text-t-primary tracking-tight" style={{ fontFamily: "var(--font-logo), 'Space Grotesk', sans-serif" }}>
              launchpad<span className="text-t-secondary">.ai</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-t-tertiary uppercase tracking-wider">Dashboard</span>
            <div className="ml-2 h-4 w-px bg-input-bg" />
            <button
              onClick={() => signOut().then(() => router.replace("/signin"))}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-b-primary overflow-hidden hover:border-b-strong transition-colors"
              title="Sign out"
            >
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" className="h-full w-full object-cover" />
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-t-secondary">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
              )}
            </button>
          </div>
        </header>

        {/* Center content */}
        <AnimatePresence mode="wait">
          {!showAllProjects ? (
            <motion.div
              key="home"
              className="relative z-10 flex-1 flex flex-col items-center justify-center px-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div className="flex flex-col items-center text-center mb-10" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-t-primary" style={{ fontFamily: "var(--font-logo), 'Space Grotesk', sans-serif" }}>
                  What would you like
                  <br /><span className="text-t-tertiary">to build today?</span>
                </h1>
              </motion.div>

              {/* Prompt input */}
              <motion.div className="w-full max-w-[580px]" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.6 }}>
                <div className="rounded-2xl border border-b-strong bg-surface-elevated/90 backdrop-blur-xl shadow-[0_8px_48px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] transition-all focus-within:border-b-strong">
                  <div className="px-4 pt-4 pb-2 relative">
                    {!inputValue && (
                      <div className="absolute inset-x-4 top-4 pointer-events-none text-[15px] leading-relaxed">
                        <StreamingPlaceholder />
                      </div>
                    )}
                    <textarea
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                      rows={3}
                      className="w-full bg-transparent text-[15px] text-t-primary placeholder-transparent outline-none resize-none leading-relaxed min-h-[76px] max-h-[140px] relative z-10"
                      onInput={(e) => { const el = e.currentTarget; el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 140) + "px"; }}
                    />
                  </div>
                  <div className="flex items-center justify-between px-4 py-2.5 border-t border-b-secondary">
                    <div className="flex items-center gap-2">
                      <button type="button" className="inline-flex size-7 items-center justify-center rounded-md text-t-tertiary hover:text-t-secondary hover:bg-input-bg transition-colors" title="Attach">
                        <svg width="15" height="15" viewBox="0 0 256 256" fill="currentColor"><path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z" /></svg>
                      </button>
                      <span className="text-[10px] font-mono text-t-tertiary border border-b-secondary rounded px-1.5 py-0.5 bg-input-bg">Flutter · Dart</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-t-tertiary border border-b-secondary rounded px-1.5 py-0.5 hidden sm:inline bg-input-bg">⌘ Enter</span>
                      <button type="button" onClick={handleSubmit} disabled={!inputValue.trim()} className="inline-flex size-8 items-center justify-center rounded-lg bg-btn-primary-bg text-btn-primary-text transition-all hover:opacity-90 disabled:opacity-15 disabled:pointer-events-none active:scale-95">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          ) : (
            /* All projects view */
            <motion.div
              key="projects"
              className="relative z-10 flex-1 flex flex-col overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-b-secondary">
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowAllProjects(false)} className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-t-tertiary hover:text-t-secondary transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                    Back
                  </button>
                  <div className="h-4 w-px bg-input-bg" />
                  <span className="text-[11px] font-mono font-medium uppercase tracking-wider text-t-secondary">
                    All Projects
                    {projects.length > 0 && <span className="ml-1.5 text-t-tertiary">{projects.length}</span>}
                  </span>
                </div>
                <button
                  onClick={() => createProject()}
                  className="flex items-center gap-1.5 rounded-lg border border-b-primary px-3 py-1.5 text-[11px] font-mono font-medium uppercase tracking-wider text-t-secondary hover:text-t-primary hover:border-b-strong transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                  New
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="flex items-center gap-2 text-sm text-t-tertiary">
                      <div className="size-2 rounded-full bg-white/20 animate-pulse" />
                      Loading...
                    </div>
                  </div>
                ) : projects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <p className="text-sm text-t-tertiary">No projects yet</p>
                    <button
                      onClick={() => { setShowAllProjects(false); inputRef.current?.focus(); }}
                      className="mt-3 text-xs font-mono uppercase tracking-wider text-t-secondary hover:text-t-primary transition-colors"
                    >
                      Start by describing your app →
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {projects.map((project, i) => (
                      <Link
                        key={project.id}
                        href={`/app/${project.id}`}
                        className={`group flex flex-col gap-3 p-5 transition-colors hover:bg-input-bg no-underline ${
                          (i + 1) % 3 !== 0 ? "lg:border-r border-b-secondary" : ""
                        } ${(i + 1) % 2 !== 0 ? "max-lg:border-r border-b-secondary" : ""} ${
                          i < projects.length - (projects.length % 3 || 3) ? "lg:border-b border-b-secondary" : ""
                        } ${i < projects.length - (projects.length % 2 || 2) ? "max-lg:border-b border-b-secondary" : ""}`}
                      >
                        <div className="aspect-[16/10] w-full rounded-lg border border-b-secondary bg-input-bg flex items-center justify-center">
                          <div className="flex gap-2">
                            {Array.from({ length: Math.min(project.screens, 3) }).map((_, si) => (
                              <div key={si} className="w-6 h-10 rounded bg-input-bg border border-b-secondary" />
                            ))}
                            {project.screens > 3 && <span className="text-[9px] font-mono text-t-tertiary self-center">+{project.screens - 3}</span>}
                            {project.screens === 0 && <span className="text-[9px] font-mono text-t-tertiary">Empty</span>}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-t-primary group-hover:text-t-primary transition-colors">{project.name}</p>
                            <p className="text-[10px] font-mono text-t-tertiary mt-0.5">{project.screens} screens · {timeAgo(project.updatedAt)}</p>
                          </div>
                          <button className="flex h-6 w-6 items-center justify-center rounded text-t-tertiary opacity-0 group-hover:opacity-100 hover:bg-input-bg transition-all" onClick={(e) => e.preventDefault()}>
                            <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="3" r="1" fill="currentColor" /><circle cx="7" cy="7" r="1" fill="currentColor" /><circle cx="7" cy="11" r="1" fill="currentColor" /></svg>
                          </button>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom — recent projects strip */}
        {!showAllProjects && (
          <motion.div className="relative z-10 border-t border-b-secondary flex-shrink-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.5 }}>
            <div className="flex items-center justify-between px-5 py-2.5">
              <span className="text-[10px] font-mono font-medium uppercase tracking-wider text-t-tertiary">Recent</span>
              {projects.length > 0 && (
                <button onClick={() => setShowAllProjects(true)} className="text-[10px] font-mono uppercase tracking-wider text-t-tertiary hover:text-t-secondary transition-colors">
                  View all →
                </button>
              )}
            </div>

            <div className="flex gap-px bg-input-bg border-t border-b-secondary">
              {loading ? (
                <div className="flex-1 flex items-center justify-center py-3 bg-canvas-bg">
                  <span className="text-[10px] text-t-tertiary animate-pulse">Loading...</span>
                </div>
              ) : projects.length === 0 ? (
                <div className="flex-1 flex items-center justify-center py-3 bg-canvas-bg">
                  <span className="text-[10px] text-t-tertiary">No projects yet — describe your app above to start</span>
                </div>
              ) : (
                projects.slice(0, 4).map((project) => (
                  <Link
                    key={project.id}
                    href={`/app/${project.id}`}
                    className="flex-1 flex flex-col gap-1 px-4 py-3 bg-canvas-bg hover:bg-input-bg transition-colors no-underline group"
                  >
                    <p className="text-xs font-medium text-t-secondary group-hover:text-t-primary truncate transition-colors">{project.name}</p>
                    <p className="text-[10px] font-mono text-t-tertiary">{project.screens} screens · {timeAgo(project.updatedAt)}</p>
                  </Link>
                ))
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
