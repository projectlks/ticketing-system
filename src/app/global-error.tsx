"use client";

import { useEffect } from "react";
import { logClientError } from "@/app/actions/log-error";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // 🌟 UI မှာ Error တက်တာနဲ့ Server Log ဆီကို အလိုအလျောက် ပို့ပေးမည်
        logClientError(error.message, error.stack).catch((err: unknown) => {
            console.error("Failed to send error log to server:", err);
        });
    }, [error]);

    return (
        <html lang="en">
            <body>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh" }}>
                    <h2>System Error Occurred</h2>
                    <p>Something went wrong on our end. The development team has been notified.</p>
                    <button
                        onClick={() => reset()}
                        style={{ marginTop: "1rem", padding: "0.5rem 1rem", cursor: "pointer" }}
                    >
                        Try again
                    </button>
                </div>
            </body>
        </html>
    );
}