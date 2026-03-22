import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import fs from "fs";
import path from "path";
import matter from "gray-matter";

// POST /api/blog/seed — seed blog posts from MDX files into DB
export async function POST() {
  try {
    const blogDir = path.join(process.cwd(), "src/content/blog");
    if (!fs.existsSync(blogDir)) {
      return NextResponse.json({ error: "No blog content directory found" }, { status: 404 });
    }

    const files = fs.readdirSync(blogDir).filter((f) => f.endsWith(".mdx"));
    const results: string[] = [];

    for (const file of files) {
      const slug = file.replace(/\.mdx$/, "");
      const raw = fs.readFileSync(path.join(blogDir, file), "utf-8");
      const { data, content } = matter(raw);

      await prisma.blogPost.upsert({
        where: { slug },
        create: {
          slug,
          title: data.title || slug,
          description: data.description || "",
          content,
          tldr: data.tldr || null,
          category: data.category || "General",
          tags: Array.isArray(data.tags) ? data.tags : [],
          author: data.author || "Launchpad AI",
          authorRole: data.authorRole || null,
          published: data.published !== false,
        },
        update: {
          title: data.title || slug,
          description: data.description || "",
          content,
          tldr: data.tldr || null,
          category: data.category || "General",
          tags: Array.isArray(data.tags) ? data.tags : [],
          author: data.author || "Launchpad AI",
          authorRole: data.authorRole || null,
          published: data.published !== false,
        },
      });

      results.push(slug);
    }

    return NextResponse.json({ seeded: results.length, slugs: results });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
