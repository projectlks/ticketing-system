"use client";

import { useEffect } from "react";
import { logClientError } from "@/app/actions/log-error";

export default function AppError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // 🌟 Page အတွင်း Error တက်ပါက Server သို့ လှမ်းပို့မည်
        logClientError(error.message, error.stack).catch((err) => {
            console.error("Failed to send route error log to server:", err);
        });
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-2">Something went wrong!</h2>
            <p className="text-gray-600 mb-6">
                An error occurred while loading this page. The engineering team has been notified.
            </p>
            <button
                onClick={() => reset()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
                Try again
            </button>
        </div>
    );
}