"use client";

import type { IconProps } from "./types";

export function TextEditingIcon({ color = "#2A0DBA" }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 25 25"
      fill="none"
      stroke="currentColor"
    >
      <path
        d="M13.7911 17.3281L11.8625 12.8281M11.8625 12.8281L9.76819 7.94124C9.57907 7.49996 9.24386 7.32812 8.79114 7.32812C8.33842 7.32812 8.00321 7.49996 7.81409 7.94124L5.71971 12.8281M11.8625 12.8281H5.71971M3.79114 17.3281L5.71971 12.8281"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.791 3.32821C17.6243 3.32074 18.791 3.82816 19.291 4.82816M19.291 4.82816C19.791 3.82816 20.9577 3.32818 21.791 3.32821M19.291 4.82816V19.8281M19.291 19.8281C19.791 20.8281 20.9577 21.3355 21.791 21.3281M19.291 19.8281C18.791 20.8281 17.6243 21.3281 16.791 21.3281M20.791 12.3281H17.791"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
