"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface PortalProps {
  children: React.ReactNode;
  containerId?: string; // default "portal-root"
}

export default function Portal({ children, containerId = "portal-root" }: PortalProps) {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Find existing portal root or create one dynamically
    let element = document.getElementById(containerId);
    let created = false;

    if (!element) {
      element = document.createElement("div");
      element.setAttribute("id", containerId);
      document.body.appendChild(element);
      created = true;
    }

    setPortalRoot(element);

    // Cleanup if dynamically created
    return () => {
      if (created && element?.parentNode) {
        element.parentNode.removeChild(element);
      }
    };
  }, [containerId]);

  if (!portalRoot) return null;

  return createPortal(children, portalRoot);
}
