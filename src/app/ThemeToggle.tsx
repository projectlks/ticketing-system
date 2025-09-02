"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { SunIcon, MoonIcon } from "@heroicons/react/24/outline";

export default function ThemeToggle() {
    const { theme, setTheme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Ensure component is mounted to avoid SSR mismatch
    useEffect(() => {
        setMounted(true);
        const savedTheme = localStorage.getItem("theme");
        if (savedTheme) {
            setTheme(savedTheme);
        }
    }, [setTheme]);

    // Save theme in localStorage whenever it changes
    useEffect(() => {
        if (mounted && theme) {
            localStorage.setItem("theme", theme);
        }
    }, [theme, mounted]);

    if (!mounted) return null;

    const handleToggle = () => {
        const nextTheme = theme === "dark" ? "light" : "dark";
        setTheme(nextTheme);
        localStorage.setItem("theme", nextTheme);
    };

    return (
        <button
            onClick={handleToggle}
            className="relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-gray-900 h-11 w-11 hover:bg-gray-100 
      dark:bg-gray-700 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800 dark:hover:text-white"
        >
            {resolvedTheme === "dark" ? (
                <SunIcon className="w-5 h-5" />
            ) : (
                <MoonIcon className="w-5 h-5" />
            )}
        </button>
    );
}
