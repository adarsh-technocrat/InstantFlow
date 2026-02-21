import { prisma, ensureDefaultProject } from "@/lib/db";
import { DEFAULT_PROJECT_ID } from "@/constants/project";

export interface FramePayload {
  id: string;
  label?: string;
  left?: number;
  top?: number;
  html: string;
}

export async function setFrame(
  frameId: string,
  html: string,
  meta?: { label?: string; left?: number; top?: number },
) {
  await ensureDefaultProject();
  const projectId = DEFAULT_PROJECT_ID;
  await prisma.frame.upsert({
    where: { id: frameId },
    create: {
      id: frameId,
      projectId,
      label: meta?.label ?? "Screen",
      left: meta?.left ?? 0,
      top: meta?.top ?? 0,
      html,
    },
    update: {
      html,
      ...(meta?.label !== undefined && { label: meta.label }),
      ...(meta?.left !== undefined && { left: meta.left }),
      ...(meta?.top !== undefined && { top: meta.top }),
    },
  });
}

export async function getFrame(frameId: string): Promise<string | null> {
  const frame = await prisma.frame.findUnique({
    where: { id: frameId },
    select: { html: true },
  });
  return frame?.html ?? null;
}

export async function getFramesByProject(projectId: string) {
  const frames = await prisma.frame.findMany({
    where: { projectId },
    orderBy: { updatedAt: "asc" },
  });
  return frames.map((f) => ({
    id: f.id,
    label: f.label,
    left: f.left,
    top: f.top,
    html: f.html,
  }));
}

export async function deleteFrame(frameId: string) {
  await prisma.frame.deleteMany({
    where: { id: frameId },
  });
}
