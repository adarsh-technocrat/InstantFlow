import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { MdxRenderer } from "@/components/blog/MdxRenderer";
import { CollapsibleTLDR } from "@/components/blog/CollapsibleTLDR";
import { getAllPosts, getPostBySlug, getRelatedPosts } from "@/lib/blog";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Post Not Found" };

  const { frontmatter: fm } = post;

  return {
    title: `${fm.title} | Launchpad AI Blog`,
    description: fm.description,
    keywords: fm.tags,
    authors: [{ name: fm.author }],
    openGraph: {
      title: fm.title,
      description: fm.description,
      type: "article",
      publishedTime: fm.date,
      authors: [fm.author],
      tags: fm.tags,
      siteName: "Launchpad AI",
    },
    twitter: {
      card: "summary_large_image",
      title: fm.title,
      description: fm.description,
    },
    alternates: {
      canonical: `/blog/${slug}`,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const { frontmatter: fm } = post;
  const allPosts = await getAllPosts();
  const currentIndex = allPosts.findIndex((p) => p.slug === slug);
  const prevPost = currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null;
  const nextPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null;
  const relatedPosts = await getRelatedPosts(slug, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: fm.title,
    description: fm.description,
    datePublished: fm.date,
    author: { "@type": "Person", name: fm.author, ...(fm.authorRole && { jobTitle: fm.authorRole }) },
    publisher: { "@type": "Organization", name: "Launchpad AI" },
    wordCount: post.wordCount,
    keywords: fm.tags.join(", "),
    mainEntityOfPage: { "@type": "WebPage", "@id": `/blog/${slug}` },
  };

  return (
    <div className="w-full bg-surface text-t-primary">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="mx-auto max-w-6xl border-x border-b-primary">
        <Header />

        {/* Breadcrumb */}
        <nav className="px-5 py-3 border-b border-b-primary flex items-center gap-2 text-[11px] font-mono text-t-tertiary" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-t-secondary transition-colors no-underline">Home</Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-t-secondary transition-colors no-underline">Blog</Link>
          <span>/</span>
          <span className="text-t-secondary truncate max-w-[200px]">{fm.title}</span>
        </nav>

        {/* Article header */}
        <header className="border-b border-b-primary">
          <div className="px-6 md:px-16 py-12 md:py-16 max-w-3xl mx-auto">
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider text-t-secondary bg-input-bg border border-b-primary">{fm.category}</span>
              <span className="text-[10px] text-t-tertiary font-mono">{post.readingTime}</span>
              <span className="text-[10px] text-t-tertiary font-mono">·</span>
              <span className="text-[10px] text-t-tertiary font-mono">{post.wordCount} words</span>
            </div>

            <h1 className="text-2xl md:text-4xl font-semibold leading-tight tracking-tight text-t-primary" style={{ fontFamily: "var(--font-logo), 'Space Grotesk', sans-serif" }}>
              {fm.title}
            </h1>

            <p className="mt-4 text-base md:text-lg text-t-secondary leading-relaxed">{fm.description}</p>

            <div className="flex flex-wrap gap-2 mt-6">
              {fm.tags.map((tag) => (
                <span key={tag} className="text-[9px] font-mono uppercase tracking-wider text-t-tertiary border border-b-secondary rounded-full px-2 py-0.5">#{tag}</span>
              ))}
            </div>

            <div className="flex items-center gap-3 mt-8 pt-6 border-t border-b-secondary">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-input-bg border border-b-secondary text-sm font-semibold text-t-secondary">{fm.author[0]}</div>
              <div>
                <p className="text-sm font-medium text-t-primary">{fm.author}</p>
                <div className="flex items-center gap-2">
                  {fm.authorRole && <span className="text-[11px] text-t-tertiary">{fm.authorRole}</span>}
                  {fm.authorRole && <span className="text-t-tertiary">·</span>}
                  <time className="text-[11px] font-mono text-t-tertiary" dateTime={fm.date}>
                    {new Date(fm.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </time>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Collapsible TL;DR */}
        {fm.tldr && (
          <div className="border-b border-b-primary px-6 md:px-16 max-w-3xl mx-auto">
            <CollapsibleTLDR text={fm.tldr} />
          </div>
        )}

        {/* Article content */}
        <div className="border-b border-b-primary">
          <article className="px-6 md:px-16 py-10 md:py-14 max-w-3xl mx-auto">
            <MdxRenderer source={post.content} />
          </article>
        </div>

        {/* Related posts */}
        {relatedPosts.length > 0 && (
          <div className="border-b border-b-primary">
            <div className="px-5 py-3 border-b border-b-primary">
              <span className="text-[10px] font-mono font-medium uppercase tracking-wider text-t-tertiary">Related Articles</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3">
              {relatedPosts.map((rp, i) => (
                <Link key={rp.slug} href={`/blog/${rp.slug}`} className={`group flex flex-col gap-2 p-5 hover:bg-input-bg transition-colors no-underline ${i < relatedPosts.length - 1 ? "border-b md:border-b-0 md:border-r border-b-primary" : ""}`}>
                  <span className="text-[9px] font-mono uppercase tracking-wider text-t-tertiary">{rp.frontmatter.category}</span>
                  <span className="text-sm font-medium text-t-primary leading-snug">{rp.frontmatter.title}</span>
                  <span className="text-[10px] font-mono text-t-tertiary">{rp.readingTime}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Prev/Next */}
        <div className="grid grid-cols-1 md:grid-cols-2 border-b border-b-primary">
          {prevPost ? (
            <Link href={`/blog/${prevPost.slug}`} className="group flex flex-col gap-2 p-6 border-b md:border-b-0 md:border-r border-b-primary hover:bg-input-bg transition-colors no-underline">
              <span className="text-[10px] font-mono uppercase tracking-wider text-t-tertiary">← Older</span>
              <span className="text-sm font-medium text-t-primary">{prevPost.frontmatter.title}</span>
            </Link>
          ) : (
            <div className="border-b md:border-b-0 md:border-r border-b-primary" />
          )}
          {nextPost ? (
            <Link href={`/blog/${nextPost.slug}`} className="group flex flex-col gap-2 p-6 items-end text-right hover:bg-input-bg transition-colors no-underline">
              <span className="text-[10px] font-mono uppercase tracking-wider text-t-tertiary">Newer →</span>
              <span className="text-sm font-medium text-t-primary">{nextPost.frontmatter.title}</span>
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
