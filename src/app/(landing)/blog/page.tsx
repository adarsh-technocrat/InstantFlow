import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { posts } from "@/lib/blog-data";
import Link from "next/link";

export const metadata = {
  title: "Blog - Launchpad AI",
  description: "Latest updates, tips, and stories from Launchpad AI",
};

export default function BlogPage() {
  return (
    <div className="w-full bg-surface text-t-primary">
      <div className="mx-auto max-w-6xl border-x border-b-primary">
        <Header />

        {/* Hero */}
        <div className="border-b border-b-primary px-6 md:px-12 py-12 md:py-20">
          <div className="flex flex-col gap-4 items-center text-center max-w-2xl mx-auto">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-input-bg border border-b-primary">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-mono text-t-secondary">Latest Insights</span>
            </div>
            <h1
              className="text-[32px] md:text-[48px] font-semibold leading-tight tracking-tight text-t-primary"
              style={{ fontFamily: "var(--font-logo), 'Space Grotesk', sans-serif" }}
            >
              Blog
            </h1>
            <p className="text-t-secondary text-base md:text-lg leading-relaxed max-w-xl">
              Updates, tutorials, and insights on building Flutter apps with AI.
            </p>
          </div>
        </div>

        {/* Post grid — gap-px creates divider lines */}
        <div className="grid grid-cols-1 md:grid-cols-2 bg-white/[0.12]" style={{ gap: '1px' }}>
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group flex flex-col gap-4 p-6 bg-surface hover:bg-input-bg transition-all no-underline"
            >
              {/* Category + read time */}
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider text-t-secondary bg-input-bg border border-b-primary">
                  {post.category}
                </span>
                <span className="text-[10px] text-t-tertiary font-mono">{post.readTime}</span>
              </div>

              {/* Title */}
              <h2
                className="text-lg md:text-xl font-semibold text-t-primary group-hover:text-t-primary transition-colors leading-snug"
                style={{ fontFamily: "var(--font-logo), 'Space Grotesk', sans-serif" }}
              >
                {post.title}
              </h2>

              {/* Excerpt */}
              <p className="text-sm text-t-secondary leading-relaxed">{post.excerpt}</p>

              {/* Footer divider */}
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-b-secondary">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-t-secondary">{post.author}</span>
                  <span className="text-t-tertiary">·</span>
                  <span className="text-[11px] text-t-tertiary font-mono">{post.date}</span>
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className="text-t-tertiary group-hover:text-t-secondary transition-colors"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>

        <Footer />
      </div>
    </div>
  );
}
