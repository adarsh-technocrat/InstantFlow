import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

// GET /api/blog/[slug] — get single post with content
export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { slug } = await params;

    const post = await prisma.blogPost.findUnique({
      where: { slug },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({ post });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}

// DELETE /api/blog/[slug] — delete a post
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const { slug } = await params;

    await prisma.blogPost.delete({ where: { slug } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
