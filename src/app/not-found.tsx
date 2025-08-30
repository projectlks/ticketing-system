"use client";

import BackBtn from "@/components/BackBtn";
import { Player } from "@lottiefiles/react-lottie-player";

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
            <Player
                autoplay
                loop
                src="/404.json"
                style={{ width: "100%", maxWidth: "500px" }}
                aria-label="404 Page Not Found Animation"
            />

            <div className="fixed top-3 left-3 z-50">
                <BackBtn />
            </div>
        </div>
    );
}
