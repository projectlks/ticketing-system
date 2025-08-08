"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
    setPortalRoot(document.getElementById("portal-root"));
  }, []);

  if (!mounted || !portalRoot) return null;

  return createPortal(children, portalRoot);
}
