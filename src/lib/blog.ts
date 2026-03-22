import fs from "fs";
import path from "path";
import matter from "gray-matter";
import readingTime from "reading-time";

const BLOG_DIR = path.join(process.cwd(), "src/content/blog");

export interface BlogFrontmatter {
  title: string;
  description: string;
  date: string;
  author: string;
  authorRole?: string;
  category: string;
  tags: string[];
  image?: string;
  tldr: string;
  published: boolean;
}

export interface BlogPost {
  slug: string;
  frontmatter: BlogFrontmatter;
  content: string;
  readingTime: string;
  wordCount: number;
}

export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) return [];

  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".mdx"));

  const posts = files
    .map((file) => {
      const slug = file.replace(/\.mdx$/, "");
      const raw = fs.readFileSync(path.join(BLOG_DIR, file), "utf-8");
      const { data, content } = matter(raw);
      const stats = readingTime(content);

      return {
        slug,
        frontmatter: data as BlogFrontmatter,
        content,
        readingTime: stats.text,
        wordCount: stats.words,
      };
    })
    .filter((p) => p.frontmatter.published !== false)
    .sort(
      (a, b) =>
        new Date(b.frontmatter.date).getTime() -
        new Date(a.frontmatter.date).getTime(),
    );

  return posts;
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  const filePath = path.join(BLOG_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return undefined;

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  const stats = readingTime(content);

  const post: BlogPost = {
    slug,
    frontmatter: data as BlogFrontmatter,
    content,
    readingTime: stats.text,
    wordCount: stats.words,
  };

  if (post.frontmatter.published === false) return undefined;
  return post;
}

export function getAllSlugs(): string[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""));
}

export function getRelatedPosts(currentSlug: string, limit = 3): BlogPost[] {
  const all = getAllPosts();
  const current = all.find((p) => p.slug === currentSlug);
  if (!current) return all.slice(0, limit);

  return all
    .filter((p) => p.slug !== currentSlug)
    .sort((a, b) => {
      const aMatch = a.frontmatter.tags.filter((t) =>
        current.frontmatter.tags.includes(t),
      ).length;
      const bMatch = b.frontmatter.tags.filter((t) =>
        current.frontmatter.tags.includes(t),
      ).length;
      return bMatch - aMatch;
    })
    .slice(0, limit);
}
