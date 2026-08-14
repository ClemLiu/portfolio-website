import type { ReactNode } from "react";

export const Tag = ({ children }: { children: ReactNode }) => (
  <span className="inline-flex items-center rounded border border-ink-500 px-3 py-1 font-serif text-xs uppercase tracking-[0.04em] text-ink-100">
    {children}
  </span>
);
