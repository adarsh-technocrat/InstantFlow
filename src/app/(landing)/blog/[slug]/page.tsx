import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { posts, getPostBySlug } from "@/lib/blog-data";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Post Not Found" };
  return {
    title: `${post.title} - Launchpad AI Blog`,
    description: post.excerpt,
  };
}

function renderMarkdown(content: string) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="text-lg font-semibold text-t-primary mt-8 mb-3" style={{ fontFamily: "var(--font-logo), 'Space Grotesk', sans-serif" }}>
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="text-xl md:text-2xl font-semibold text-t-primary mt-10 mb-4" style={{ fontFamily: "var(--font-logo), 'Space Grotesk', sans-serif" }}>
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("- **")) {
      const match = line.match(/^- \*\*(.+?)\*\*\s*—?\s*(.*)/);
      if (match) {
        elements.push(
          <li key={i} className="flex gap-2 text-sm text-t-secondary leading-relaxed">
            <span className="text-t-tertiary mt-1.5 shrink-0">•</span>
            <span><strong className="font-semibold text-t-primary">{match[1]}</strong>{match[2] ? ` — ${match[2]}` : ""}</span>
          </li>
        );
      }
    } else if (line.startsWith("- ")) {
      elements.push(
        <li key={i} className="flex gap-2 text-sm text-t-secondary leading-relaxed">
          <span className="text-t-tertiary mt-1.5 shrink-0">•</span>
          <span>{line.slice(2)}</span>
        </li>
      );
    } else if (line.match(/^\d+\.\s/)) {
      const match = line.match(/^(\d+)\.\s\*\*(.+?)\*\*\s*—?\s*(.*)/);
      if (match) {
        elements.push(
          <div key={i} className="flex gap-3 text-sm text-t-secondary leading-relaxed">
            <span className="text-t-tertiary font-mono text-xs mt-0.5 shrink-0">{match[1]}.</span>
            <span><strong className="font-semibold text-t-primary">{match[2]}</strong>{match[3] ? ` — ${match[3]}` : ""}</span>
          </div>
        );
      } else {
        elements.push(
          <p key={i} className="text-sm text-t-secondary leading-relaxed">{line}</p>
        );
      }
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(
        <p key={i} className="text-sm md:text-base text-t-secondary leading-relaxed">{line}</p>
      );
    }

    i++;
  }

  return <>{elements}</>;
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const currentIndex = posts.findIndex((p) => p.slug === slug);
  const prevPost = currentIndex > 0 ? posts[currentIndex - 1] : null;
  const nextPost = currentIndex < posts.length - 1 ? posts[currentIndex + 1] : null;

  return (
    <div className="w-full bg-surface text-t-primary">
      <div className="mx-auto max-w-6xl border-x border-b-primary">
        <Header />

        {/* Article header */}
        <div className="border-b border-b-primary">
          <div className="px-5 py-4 border-b border-b-primary">
            <Link href="/blog" className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-t-tertiary hover:text-t-secondary transition-colors no-underline">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
              Back to blog
            </Link>
          </div>

          <div className="px-6 md:px-16 py-12 md:py-16 max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider text-t-secondary bg-input-bg border border-b-primary">
                {post.category}
              </span>
              <span className="text-[10px] text-t-tertiary font-mono">{post.readTime} read</span>
            </div>

            <h1
              className="text-2xl md:text-4xl font-semibold leading-tight tracking-tight text-t-primary"
              style={{ fontFamily: "var(--font-logo), 'Space Grotesk', sans-serif" }}
            >
              {post.title}
            </h1>

            <p className="mt-4 text-base md:text-lg text-t-secondary leading-relaxed">
              {post.excerpt}
            </p>

            <div className="flex items-center gap-3 mt-8 pt-6 border-t border-b-secondary">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-input-bg border border-b-secondary text-sm font-semibold text-t-secondary">
                {post.author[0]}
              </div>
              <div>
                <p className="text-sm font-medium text-t-primary">{post.author}</p>
                <p className="text-[11px] font-mono text-t-tertiary">{post.date}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Article content */}
        <div className="border-b border-b-primary">
          <article className="px-6 md:px-16 py-10 md:py-14 max-w-3xl mx-auto">
            <div className="flex flex-col gap-2">
              {renderMarkdown(post.content)}
            </div>
          </article>
        </div>

        {/* Prev/Next navigation */}
        <div className="grid grid-cols-1 md:grid-cols-2 border-b border-b-primary">
          {prevPost ? (
            <Link
              href={`/blog/${prevPost.slug}`}
              className="group flex flex-col gap-2 p-6 border-b md:border-b-0 md:border-r border-b-primary hover:bg-input-bg transition-colors no-underline"
            >
              <span className="text-[10px] font-mono uppercase tracking-wider text-t-tertiary">← Previous</span>
              <span className="text-sm font-medium text-t-primary group-hover:text-t-primary transition-colors">{prevPost.title}</span>
            </Link>
          ) : (
            <div className="border-b md:border-b-0 md:border-r border-b-primary" />
          )}
          {nextPost ? (
            <Link
              href={`/blog/${nextPost.slug}`}
              className="group flex flex-col gap-2 p-6 items-end text-right hover:bg-input-bg transition-colors no-underline"
            >
              <span className="text-[10px] font-mono uppercase tracking-wider text-t-tertiary">Next →</span>
              <span className="text-sm font-medium text-t-primary group-hover:text-t-primary transition-colors">{nextPost.title}</span>
            </Link>
          ) : (
            <div />
          )}
        </div>

        <Footer />
      </div>
    </div>
  );
}
