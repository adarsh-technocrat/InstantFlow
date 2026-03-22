const features = [
  { title: 'Describe your app', description: 'Type what you want in plain English — screens, flows, style.', label: 'Input' },
  { title: 'AI generates designs', description: 'Complete mobile screens with proper layout, spacing, typography.', label: 'Design' },
  { title: 'Export Flutter code', description: 'Clean Dart widgets, Material & Cupertino. Copy and run.', label: 'Code' },
  { title: 'Ship everywhere', description: 'One Flutter codebase deploys to iOS, Android, web, and desktop.', label: 'Deploy' },
  { title: 'Multi-screen flows', description: 'Complete app flows with navigation, transitions, and state.', label: 'Flows' },
  { title: 'Custom themes', description: 'Generate code with your brand colors, fonts, and design tokens.', label: 'Theming' },
];

export function FeaturesGrid() {
  return (
    <section id="features" className="border-b border-b-primary scroll-mt-14">
      {/* Label bar */}
      <div className="border-b border-b-secondary px-5 py-4">
        <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-t-tertiary">Features</span>
      </div>

      {/* Heading */}
      <div className="px-5 pt-12 pb-10 border-b border-b-primary">
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-t-primary mb-3" style={{ fontFamily: "var(--font-logo), 'Space Grotesk', sans-serif" }}>
          Everything you need to build
        </h2>
        <p className="text-sm text-t-secondary max-w-md">From idea to deployed Flutter app — design, code, and export in one place.</p>
      </div>

      {/* Grid — full width, lines connect to edges */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <div
            key={f.title}
            className={`flex flex-col p-6 ${
              (i + 1) % 3 !== 0 ? 'lg:border-r border-b-secondary' : ''
            } ${
              (i + 1) % 2 !== 0 ? 'max-lg:border-r border-b-secondary' : ''
            } ${
              i < 3 ? 'lg:border-b border-b-secondary' : ''
            } ${
              i < 4 ? 'max-lg:border-b border-b-secondary' : ''
            }`}
          >
            <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-t-tertiary mb-3">{f.label}</span>
            <h3 className="text-base font-semibold text-t-primary mb-1.5">{f.title}</h3>
            <p className="text-sm text-t-secondary leading-relaxed">{f.description}</p>
          </div>
        ))}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 border-t border-b-primary">
        {[
          { value: '10x', label: 'Faster than manual' },
          { value: '100+', label: 'Widgets supported' },
          { value: '50k+', label: 'Apps designed' },
        ].map((s, i) => (
          <div key={s.label} className={`flex flex-col items-center py-6 ${i > 0 ? 'border-l border-b-secondary' : ''}`}>
            <span className="text-xl md:text-2xl font-bold text-t-primary" style={{ fontFamily: "var(--font-logo), 'Space Grotesk', sans-serif" }}>{s.value}</span>
            <span className="mt-1 text-[10px] font-mono uppercase tracking-wider text-t-tertiary">{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
