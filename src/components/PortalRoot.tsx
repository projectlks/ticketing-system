// // app/components/PortalRoot.tsx
// "use client"; // client component

// export default function PortalRoot() {
//   return <div id="portal-root"></div>;
// }


// app/components/PortalRoot.tsx
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function PortalRoot({ children }: { children?: React.ReactNode }) {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const el = document.createElement("div");
    el.id = "portal-root";
    document.body.appendChild(el);
    setContainer(el);

    return () => {
      document.body.removeChild(el);
    };
  }, []);

  if (!container) return null;

  return createPortal(children, container);
}
