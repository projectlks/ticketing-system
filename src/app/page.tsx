"use client";

import { useEffect } from "react";

export default function Page() {
  useEffect(() => {
    const lang = localStorage.getItem("lang") || "en"; // default to "en"
    window.location.href = `/lang/${lang}/main/dashboard`;
  }, []);

  return null; // or a loader/spinner
}
