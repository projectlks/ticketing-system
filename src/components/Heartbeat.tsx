"use client";
import { heartbeat } from "@/libs/action";
import { useEffect } from "react";

export default function Heartbeat() {
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                await heartbeat();
            } catch (err) {
                console.error("Heartbeat failed", err);
            }
        }, 60 * 1000 * 5);  // 5 minutes

        return () => clearInterval(interval);
    }, []);

    return null;
}
