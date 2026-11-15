import type { ReactNode } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-[1600px]">{children}</div>;
}
