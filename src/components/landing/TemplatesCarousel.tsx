'use client';

import { useRef } from 'react';

const templates = [
  { id: 'health', name: 'Health Tracker', tag: 'Material 3', screens: '6 screens', image: 'https://lh3.googleusercontent.com/CwGQkERZQIadMhpEphW3k58HmhCs02NQRYpR9L_GIhU7qHIDfQlJp-ykadYDGA-x6_Bkq_Ea2r-fFr3rv4kW8Xw9A1DgJuD9hlE5Fw' },
  { id: 'entertainment', name: 'Entertainment', tag: 'Cupertino', screens: '8 screens', image: 'https://lh3.googleusercontent.com/-MMEDlQhYVE8CLSReq5dD_9s_mXvDaJUB8HaM-gKSh4LUsgjpQOK3ov7qdaH7hsVFDF0rc3L6Hi1ppWlaWx-rYMhK8IAViAM-Gk' },
  { id: 'fashion', name: 'Fashion Store', tag: 'Material 3', screens: '10 screens', image: 'https://lh3.googleusercontent.com/D6d1SQF0r3pePXE2e02y5nuvncVNFlQTMLmJm8ycWnjxC0Re9wQdvjQWHgcYYpduzGd7_QrfUTjC-OBUjDHOf_vWQ7fkMSRyEwhJ' },
  { id: 'utility', name: 'Utility Tools', tag: 'Material 3', screens: '5 screens', image: 'https://lh3.googleusercontent.com/7zm0iGoJpEdqqpo4GoqcLdOn0k-s9ZEMVy4MYn6Ia_3_FLlOzKHpb2iLlq7mVaLN7E4_5raueLuya7-MuvUyWFILPxBSdhTTz1XN' },
  { id: 'social', name: 'Social Feed', tag: 'Material 3', screens: '7 screens', image: 'https://lh3.googleusercontent.com/CwGQkERZQIadMhpEphW3k58HmhCs02NQRYpR9L_GIhU7qHIDfQlJp-ykadYDGA-x6_Bkq_Ea2r-fFr3rv4kW8Xw9A1DgJuD9hlE5Fw' },
];

export function TemplatesCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -280 : 280, behavior: 'smooth' });
  };

  return (
    <section id="templates" className="border-b border-b-primary scroll-mt-14">
      {/* Header row with border */}
      <div className="flex items-center justify-between border-b border-b-secondary px-5 py-4">
        <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-t-tertiary">Templates</span>
        <div className="flex gap-1">
          <button onClick={() => scroll('left')} className="h-7 w-7 flex items-center justify-center rounded border border-b-secondary text-t-tertiary hover:text-t-primary hover:border-white/20 transition-colors">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button onClick={() => scroll('right')} className="h-7 w-7 flex items-center justify-center rounded border border-b-secondary text-t-tertiary hover:text-t-primary hover:border-white/20 transition-colors">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="px-5 py-8">
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-t-primary mb-2" style={{ fontFamily: "var(--font-logo), 'Space Grotesk', sans-serif" }}>
          Start from a template
        </h2>
        <p className="text-sm text-t-secondary mb-8 max-w-md">Every template exports production-ready Flutter code.</p>

        <div ref={scrollRef} className="flex gap-4 overflow-x-auto pb-2 scroll-smooth scrollbar-hide">
          {templates.map((t) => (
            <a key={t.id} href="/app" className="group relative flex-shrink-0 w-[220px] no-underline">
              <div className="relative aspect-[9/16] w-full overflow-hidden rounded-lg border border-b-primary bg-[#111]">
                <img alt={t.name} src={t.image} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                <div className="absolute inset-0 bg-gradient-to-t from-surface/80 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-t-secondary border border-b-primary rounded px-1.5 py-0.5">{t.tag}</span>
                    <span className="text-[9px] font-mono text-t-tertiary">{t.screens}</span>
                  </div>
                  <p className="text-xs font-medium text-t-primary">{t.name}</p>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>

      <style>{`.scrollbar-hide::-webkit-scrollbar{display:none}.scrollbar-hide{scrollbar-width:none}`}</style>
    </section>
  );
}
