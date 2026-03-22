export function StartNow() {
  return (
    <section id="start-now" className="border-b border-b-primary scroll-mt-14">
      <div className="border-b border-b-secondary px-5 py-4">
        <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-t-tertiary">Get Started</span>
      </div>

      <div className="px-5 py-20 md:py-28">
        <div className="mx-auto max-w-xl text-center">
          <h2
            className="text-3xl md:text-[44px] font-semibold tracking-tight leading-[1.1] text-t-primary"
            style={{ fontFamily: "var(--font-logo), 'Space Grotesk', sans-serif" }}
          >
            Ready to build your
            <br />
            <span className="text-t-secondary">next app?</span>
          </h2>

          <p className="mt-5 text-sm md:text-base text-t-secondary max-w-sm mx-auto leading-relaxed">
            Join thousands of developers shipping Flutter apps faster with Launchpad AI.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="/app"
              className="inline-flex h-10 items-center px-6 rounded border border-b-strong bg-btn-primary-bg text-[11px] font-semibold uppercase tracking-wider text-btn-primary-text hover:opacity-90 transition-colors no-underline font-mono"
            >
              Start building free
            </a>
            <a
              href="/pricing"
              className="inline-flex h-10 items-center px-6 rounded border border-b-secondary text-[11px] font-semibold uppercase tracking-wider text-t-secondary hover:text-t-primary hover:border-white/20 transition-colors no-underline font-mono"
            >
              View pricing
            </a>
          </div>

          <p className="mt-6 text-[11px] font-mono text-t-tertiary uppercase tracking-wider">Free forever · No credit card</p>
        </div>
      </div>
    </section>
  );
}
