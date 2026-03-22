import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/blog — list published posts
export async function GET(req: NextRequest) {
  try {
    const showDrafts = req.nextUrl.searchParams.get("drafts") === "true";

    const posts = await prisma.blogPost.findMany({
      where: showDrafts ? {} : { published: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        tldr: true,
        category: true,
        tags: true,
        author: true,
        authorRole: true,
        published: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ posts });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}

// POST /api/blog — create or update a post
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { slug, title, description, content, tldr, category, tags, author, authorRole, published } = body as {
      slug: string;
      title: string;
      description: string;
      content: string;
      tldr?: string;
      category: string;
      tags?: string[];
      author: string;
      authorRole?: string;
      published?: boolean;
    };

    if (!slug || !title || !content) {
      return NextResponse.json({ error: "slug, title, and content are required" }, { status: 400 });
    }

    const post = await prisma.blogPost.upsert({
      where: { slug },
      create: {
        slug,
        title,
        description: description || "",
        content,
        tldr: tldr || null,
        category: category || "General",
        tags: tags || [],
        author: author || "Launchpad AI",
        authorRole: authorRole || null,
        published: published ?? false,
      },
      update: {
        title,
        description: description || "",
        content,
        tldr: tldr || null,
        category: category || "General",
        tags: tags || [],
        author: author || "Launchpad AI",
        authorRole: authorRole || null,
        published: published ?? false,
      },
    });

    return NextResponse.json({ post: { id: post.id, slug: post.slug } });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
