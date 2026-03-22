import { prisma } from "@/lib/db";
import readingTime from "reading-time";

export interface BlogPost {
  slug: string;
  frontmatter: {
    title: string;
    description: string;
    date: string;
    author: string;
    authorRole?: string;
    category: string;
    tags: string[];
    tldr: string | null;
    published: boolean;
  };
  content: string;
  readingTime: string;
  wordCount: number;
}

function toBlogPost(row: {
  slug: string;
  title: string;
  description: string;
  content: string;
  tldr: string | null;
  category: string;
  tags: string[];
  author: string;
  authorRole: string | null;
  published: boolean;
  createdAt: Date;
}): BlogPost {
  const stats = readingTime(row.content);
  return {
    slug: row.slug,
    frontmatter: {
      title: row.title,
      description: row.description,
      date: row.createdAt.toISOString(),
      author: row.author,
      authorRole: row.authorRole ?? undefined,
      category: row.category,
      tags: row.tags,
      tldr: row.tldr,
      published: row.published,
    },
    content: row.content,
    readingTime: stats.text,
    wordCount: stats.words,
  };
}

export async function getAllPosts(): Promise<BlogPost[]> {
  const rows = await prisma.blogPost.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toBlogPost);
}

export async function getPostBySlug(slug: string): Promise<BlogPost | undefined> {
  const row = await prisma.blogPost.findUnique({ where: { slug } });
  if (!row || !row.published) return undefined;
  return toBlogPost(row);
}

export async function getAllSlugs(): Promise<string[]> {
  const rows = await prisma.blogPost.findMany({
    where: { published: true },
    select: { slug: true },
  });
  return rows.map((r) => r.slug);
}

export async function getRelatedPosts(currentSlug: string, limit = 3): Promise<BlogPost[]> {
  const current = await prisma.blogPost.findUnique({
    where: { slug: currentSlug },
    select: { tags: true },
  });

  const all = await getAllPosts();
  if (!current) return all.slice(0, limit);

  return all
    .filter((p) => p.slug !== currentSlug)
    .sort((a, b) => {
      const aMatch = a.frontmatter.tags.filter((t) => current.tags.includes(t)).length;
      const bMatch = b.frontmatter.tags.filter((t) => current.tags.includes(t)).length;
      return bMatch - aMatch;
    })
    .slice(0, limit);
}
