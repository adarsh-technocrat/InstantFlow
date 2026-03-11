"use client";

import { useEffect, type ReactNode } from "react";
import { useAppDispatch } from "@/store/hooks";
import { fetchProject } from "@/store/slices/projectSlice";

export function ProjectLoader({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  useEffect(() => {
    void dispatch(fetchProject());
  }, [dispatch]);
  return <>{children}</>;
}
