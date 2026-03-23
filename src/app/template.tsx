import type { ReactNode } from "react";

export default function RootTemplate({ children }: { children: ReactNode }) {
  return <div className="route-enter-root">{children}</div>;
}
