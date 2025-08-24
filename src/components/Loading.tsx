// components/Loading.tsx
"use client";

import { Player } from "@lottiefiles/react-lottie-player";
import React from "react";

export default function Loading() {
    return (
        <div className="flex justify-center bg-[#00000040] z-[9999] fixed left-0  top-0 inset-0 items-center">
            <Player
                autoplay
                loop
                src="/loading.json" // animation JSON file path
                style={{ height: "500px", width: "500px" }}
            />
        </div>
    );
}