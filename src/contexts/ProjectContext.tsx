"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAppDispatch } from "@/store/hooks";
import { loadFrames } from "@/store/slices/canvasSlice";
import { DEFAULT_PROJECT_ID } from "@/constants/project";

interface ProjectData {
  frames: Array<{
    id: string;
    label: string;
    left: number;
    top: number;
    html: string;
  }>;
  messages: unknown[];
}

const ProjectContext = createContext<{
  data: ProjectData | null;
  loaded: boolean;
}>({ data: null, loaded: false });

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<ProjectData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const dispatch = useAppDispatch();

  useEffect(() => {
    let isMounted = true;
    fetch(`/api/project?id=${DEFAULT_PROJECT_ID}`)
      .then((r) => r.json())
      .then((res) => {
        if (!isMounted) return;
        const frames = Array.isArray(res?.frames) ? res.frames : [];
        const messages = Array.isArray(res?.messages) ? res.messages : [];
        setData({ frames, messages });
        if (frames.length > 0) {
          dispatch(loadFrames(frames));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoaded(true);
      });
    return () => {
      isMounted = false;
    };
  }, [dispatch]);

  return (
    <ProjectContext.Provider value={{ data, loaded }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error("useProject must be used within ProjectProvider");
  }
  return ctx;
}
