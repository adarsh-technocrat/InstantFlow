/**
 * HealthSync app - Home screen HTML template.
 * Rendered in frame iframes. Updates here trigger Hot Module Replacement
 * and the frame preview re-renders with the new content.
 */
export const HEALTHSYNC_HOME_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Home</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@100;200;300;400;500;600;700;800&display=swap"
      rel="stylesheet"
    />
    <link
      href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800;900&display=swap"
      rel="stylesheet"
    />
    <link
      href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@200;300;400;500;600;700;800&display=swap"
      rel="stylesheet"
    />
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
    <script src="https://code.iconify.design/iconify-icon/3.0.0/iconify-icon.min.js"></script>
    <style type="text/tailwindcss">

      @theme inline {
        --color-background: var(--background);
        --color-foreground: var(--foreground);
        --color-primary: var(--primary);
        --color-primary-foreground: var(--primary-foreground);
        --color-secondary: var(--secondary);
        --color-secondary-foreground: var(--secondary-foreground);
        --color-muted: var(--muted);
        --color-muted-foreground: var(--muted-foreground);
        --color-accent: var(--accent);
        --color-accent-foreground: var(--accent-foreground);
        --color-destructive: var(--destructive);
        --color-card: var(--card);
        --color-card-foreground: var(--card-foreground);
        --color-popover: var(--popover);
        --color-popover-foreground: var(--popover-foreground);
        --color-border: var(--border);
        --color-input: var(--input);
        --color-ring: var(--ring);
        --color-chart-1: var(--chart-1);
        --color-chart-2: var(--chart-2);
        --color-chart-3: var(--chart-3);
        --color-chart-4: var(--chart-4);
        --color-chart-5: var(--chart-5);

        --font-font-sans: var(--font-sans);
        --font-font-heading: var(--font-heading);
        --font-font-serif: var(--font-serif);
        --font-font-mono: var(--font-mono);

        --radius-sm: calc(var(--radius) - 4px);
        --radius-md: calc(var(--radius) - 2px);
        --radius-lg: var(--radius);
        --radius-xl: calc(var(--radius) + 4px);
      }

      :root {
          --background: #F8FAFC;
        --foreground: #0F172A;
        --primary: #2563EB;
        --primary-foreground: #FFFFFF;
        --secondary: #F1F5F9;
        --secondary-foreground: #1E293B;
        --muted: #F1F5F9;
        --muted-foreground: #64748B;
        --accent: #E0F2FE;
        --accent-foreground: #2C3E34;
        --destructive: #C57B67;
        --card: #FFFFFF;
        --card-foreground: #0F172A;
        --popover: #FFFFFF;
        --popover-foreground: #1A1C1B;
        --border: #E2E8F0;
        --input: #F0F2F1;
        --ring: #2563EB;
        --chart-1: #608A74;
        --chart-2: #C57B67;
        --chart-3: #8FB3A1;
        --chart-4: #E6BEB6;
        --chart-5: #3E594B;

        --font-sans: "Plus Jakarta Sans";
        --font-heading: "Plus Jakarta Sans";
        --font-serif: "Playfair Display";
        --font-mono: "JetBrains Mono";

        --radius: 1.25rem;
      }
    </style>
  </head>
  <body>
    <div class="min-h-screen bg-background text-foreground pb-32 font-sans selection:bg-primary/20">
      <header
        class="px-6 pt-12 pb-6 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-lg z-40"
      >
        <div class="flex items-center gap-3">
          <div
            class="size-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20"
          >
            <iconify-icon icon="solar:health-bold" class="size-6"></iconify-icon>
          </div>
          <div>
            <h1
              class="text-xl font-bold tracking-tight text-foreground font-heading leading-none mb-1"
            >
              HealthSync
            </h1>
            <p class="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
              Your Wellness Hub
            </p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <button
            class="size-10 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-border transition-colors"
          >
            <iconify-icon icon="solar:bell-bing-linear" class="size-5"></iconify-icon></button
          ><button
            class="size-10 rounded-full overflow-hidden border-2 border-white shadow-sm ring-1 ring-border"
          >
            <img
              alt="Profile"
              src="https://randomuser.me/api/portraits/women/44.jpg"
              class="w-full h-full object-cover"
            />
          </button>
        </div>
      </header>
      <section class="px-6 mb-8 mt-2">
        <div class="mb-6">
          <h2 class="text-2xl font-bold text-foreground mb-1">Hello, Elena! 👋</h2>
          <p class="text-muted-foreground text-sm">How are you feeling today?</p>
        </div>
        <div class="relative group">
          <div
            class="absolute inset-y-0 left-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors"
          >
            <iconify-icon icon="solar:magnifer-linear" class="size-5"></iconify-icon>
          </div>
          <input
            type="text"
            placeholder="Search doctors, records, or help..."
            class="w-full h-14 pl-12 pr-4 bg-card border border-border/60 rounded-2xl shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
          />
        </div>
      </section>
      <section class="px-6 mb-8">
        <div class="grid grid-cols-2 gap-4">
          <div
            class="col-span-2 bg-[#0F172A] text-white p-6 rounded-[2rem] shadow-xl shadow-slate-900/10 relative overflow-hidden"
          >
            <div class="absolute -right-8 -top-8 size-48 bg-primary/10 rounded-full blur-3xl"></div>
            <div class="relative z-10">
              <div class="flex items-center justify-between mb-6">
                <div
                  class="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full backdrop-blur-sm text-primary"
                >
                  <iconify-icon icon="solar:shield-check-bold" class="size-4"></iconify-icon
                  ><span class="text-[10px] font-bold tracking-wider uppercase text-white"
                    >Optimal Health</span
                  >
                </div>
                <button class="text-white/60 hover:text-white">
                  <iconify-icon icon="solar:alt-arrow-right-linear" class="size-5"></iconify-icon>
                </button>
              </div>
              <div class="flex items-center gap-6">
                <div class="relative size-24">
                  <svg class="size-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="rgba(255,255,255,0.1)"
                      stroke-width="3"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#2563EB"
                      stroke-width="3"
                      stroke-dasharray="92, 100"
                      stroke-linecap="round"
                    />
                  </svg>
                  <div class="absolute inset-0 flex flex-col items-center justify-center">
                    <span class="text-2xl font-bold leading-none">92</span
                    ><span class="text-[8px] font-bold opacity-70 mt-0.5">SCORE</span>
                  </div>
                </div>
                <div>
                  <h3 class="text-lg font-bold mb-1">Wellness Sync</h3>
                  <p class="text-xs text-white/60 leading-relaxed">
                    Your heart rate and sleep patterns are in perfect sync today.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div
            class="bg-card p-5 rounded-3xl shadow-sm border border-border/50 flex flex-col justify-between"
          >
            <div
              class="size-10 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-4"
            >
              <iconify-icon icon="solar:heart-pulse-bold" class="size-6"></iconify-icon>
            </div>
            <div>
              <p class="text-2xl font-bold text-foreground">72</p>
              <div class="flex items-center gap-1">
                <span
                  class="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter"
                  >Heart Rate</span
                ><span class="text-[10px] text-emerald-500 font-bold">BPM</span>
              </div>
            </div>
          </div>
          <div
            class="bg-card p-5 rounded-3xl shadow-sm border border-border/50 flex flex-col justify-between"
          >
            <div
              class="size-10 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mb-4"
            >
              <iconify-icon icon="solar:fire-bold" class="size-6"></iconify-icon>
            </div>
            <div>
              <p class="text-2xl font-bold text-foreground">8,432</p>
              <div class="flex items-center gap-1">
                <span
                  class="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter"
                  >Daily Steps</span
                ><iconify-icon
                  icon="solar:course-up-linear"
                  class="text-emerald-500 size-3"
                ></iconify-icon>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section class="px-6 mb-8">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-bold font-heading">Medical Services</h2>
          <button class="text-primary text-xs font-bold px-3 py-1 bg-primary/10 rounded-lg">
            View All
          </button>
        </div>
        <div class="grid grid-cols-4 gap-4">
          <button class="flex flex-col items-center gap-2 group">
            <div
              class="size-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-active:scale-95 transition-all shadow-sm border border-blue-100/50"
            >
              <iconify-icon icon="solar:calendar-add-bold" class="size-7"></iconify-icon>
            </div>
            <span class="text-[11px] font-bold text-foreground/80">Book</span></button
          ><button class="flex flex-col items-center gap-2 group">
            <div
              class="size-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-active:scale-95 transition-all shadow-sm border border-emerald-100/50"
            >
              <iconify-icon icon="solar:document-text-bold" class="size-7"></iconify-icon>
            </div>
            <span class="text-[11px] font-bold text-foreground/80">Records</span></button
          ><button class="flex flex-col items-center gap-2 group">
            <div
              class="size-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center group-active:scale-95 transition-all shadow-sm border border-purple-100/50"
            >
              <iconify-icon icon="solar:pill-bold" class="size-7"></iconify-icon>
            </div>
            <span class="text-[11px] font-bold text-foreground/80">Pharmacy</span></button
          ><button class="flex flex-col items-center gap-2 group">
            <div
              class="size-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center group-active:scale-95 transition-all shadow-sm border border-rose-100/50"
            >
              <iconify-icon icon="solar:test-tube-bold" class="size-7"></iconify-icon>
            </div>
            <span class="text-[11px] font-bold text-foreground/80">Lab Test</span>
          </button>
        </div>
      </section>
      <section class="px-6 mb-8">
        <h2 class="text-lg font-bold font-heading mb-4">Upcoming Visit</h2>
        <div
          class="bg-card border border-border/60 rounded-[1.5rem] p-4 shadow-sm relative overflow-hidden"
        >
          <div class="flex items-center gap-4">
            <div class="size-16 rounded-2xl overflow-hidden bg-muted">
              <img
                src="https://randomuser.me/api/portraits/men/32.jpg"
                alt="Doctor"
                class="size-full object-cover"
              />
            </div>
            <div class="flex-1">
              <h3 class="font-bold text-foreground leading-none mb-1">Dr. Michael Chen</h3>
              <p class="text-xs text-muted-foreground mb-3">Senior Cardiologist • 4.9 ★</p>
              <div class="flex gap-2">
                <div
                  class="flex items-center gap-1.5 px-2 py-1 bg-secondary rounded-lg text-[10px] font-bold text-secondary-foreground"
                >
                  <iconify-icon
                    icon="solar:calendar-linear"
                    class="size-3 text-primary"
                  ></iconify-icon
                  >Oct 24, 2024
                </div>
                <div
                  class="flex items-center gap-1.5 px-2 py-1 bg-secondary rounded-lg text-[10px] font-bold text-secondary-foreground"
                >
                  <iconify-icon
                    icon="solar:clock-circle-linear"
                    class="size-3 text-primary"
                  ></iconify-icon
                  >10:00 AM
                </div>
              </div>
            </div>
          </div>
          <div class="mt-4 pt-4 border-t border-border/50 flex gap-3">
            <button
              class="flex-1 h-11 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity"
            >
              Join Consultation</button
            ><button
              class="size-11 bg-secondary text-foreground rounded-xl flex items-center justify-center hover:bg-border transition-colors"
            >
              <iconify-icon icon="solar:chat-round-dots-linear" class="size-5"></iconify-icon>
            </button>
          </div>
        </div>
      </section>
      <nav
        class="fixed bottom-6 left-6 right-6 h-18 bg-[#0F172A] rounded-[2rem] shadow-2xl flex items-center justify-around px-4 z-50"
      >
        <button class="flex flex-col items-center gap-1 text-white group">
          <iconify-icon icon="solar:home-2-bold" class="size-6"></iconify-icon
          ><span class="text-[8px] font-bold uppercase tracking-widest">Home</span></button
        ><button
          class="flex flex-col items-center gap-1 text-white/40 hover:text-white/60 transition-colors"
        >
          <iconify-icon icon="solar:calendar-linear" class="size-6"></iconify-icon
          ><span class="text-[8px] font-bold uppercase tracking-widest">Events</span>
        </button>
        <div class="relative -top-6">
          <button
            class="size-14 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-xl shadow-primary/40 border-4 border-background active:scale-95 transition-transform"
          >
            <iconify-icon icon="material-symbols:add-rounded" class="size-8"></iconify-icon>
          </button>
        </div>
        <button
          class="flex flex-col items-center gap-1 text-white/40 hover:text-white/60 transition-colors"
        >
          <iconify-icon icon="solar:folder-linear" class="size-6"></iconify-icon
          ><span class="text-[8px] font-bold uppercase tracking-widest">Records</span></button
        ><button
          class="flex flex-col items-center gap-1 text-white/40 hover:text-white/60 transition-colors"
        >
          <iconify-icon icon="solar:user-linear" class="size-6"></iconify-icon
          ><span class="text-[8px] font-bold uppercase tracking-widest">Profile</span>
        </button>
      </nav>
    </div>
  </body>
</html>`;
