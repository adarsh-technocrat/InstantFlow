"use client";

import React from "react";

import Image from "next/image";

interface CanvasLoaderProps {
  message?: string;
}

export function CanvasLoader({
  message = "Loading project...",
}: CanvasLoaderProps) {
  return (
    <div className="absolute inset-0 z-[100] bg-bg-light/80 backdrop-blur-md flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Image
          src="/logo-without-text.png"
          alt="logo"
          width={64}
          height={64}
          className="rounded-[25px]"
        />
        <p className="text-neutral-1-light text-sm font-medium">{message}</p>

        {/* Horizontal line loader */}
        <div className="w-48 h-1 bg-neutral-9-light rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--secondary-pink-1)] rounded-full"
            style={{
              animation: "loadLeftToRight 0.5s ease-in-out infinite",
            }}
          />
        </div>
      </div>
    </div>
  );
}
