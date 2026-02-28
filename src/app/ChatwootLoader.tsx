// "use client";

// import { useEffect } from "react";

// declare global {
//   interface Window {
//     chatwootSDK?: {
//       run: (options: { websiteToken: string; baseUrl: string }) => void;
//     };
//   }
// }

// export default function ChatwootLoader() {
//   useEffect(() => {
//     const BASE_URL = "http://192.168.100.110:3000";

//     const g = document.createElement("script");
//     g.src = BASE_URL + "/packs/js/sdk.js";
//     g.async = true;

//     g.onload = () => {
//       window.chatwootSDK?.run({
//         websiteToken: "FfQhi5Mj1skDw4u4BsDCcg4z",
//         baseUrl: BASE_URL,
//       });
//     };

//     document.body.appendChild(g);
//   }, []);

//   return null;
// }

"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    chatwootSDK?: {
      run: (options: { websiteToken: string; baseUrl: string }) => void;
    };
  }
}

export default function ChatwootLoader() {
  useEffect(() => {
    const BASE_URL =
      process.env.NEXT_PUBLIC_CHATWOOT_BASE_URL ||
      "http://192.168.100.110:3000";

    // Prevent duplicate loading
    if (document.getElementById("chatwoot-sdk")) return;

    const script = document.createElement("script");
    script.id = "chatwoot-sdk";
    script.src = `${BASE_URL}/packs/js/sdk.js`;
    script.async = true;

    script.onload = () => {
      window.chatwootSDK?.run({
        websiteToken:
          process.env.NEXT_PUBLIC_CHATWOOT_TOKEN || "FfQhi5Mj1skDw4u4BsDCcg4z",
        baseUrl: BASE_URL,
      });
    };

    document.body.appendChild(script);

    return () => {
      script.remove(); // cleanup on unmount
    };
  }, []);

  return null;
}