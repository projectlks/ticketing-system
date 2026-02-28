import React from "react";
import Image from "next/image";

interface AvatarProps {
    name?: string | null;
    size?: number; // optional size in px
    className?: string; // optional extra classes
    profileUrl?: string | null; // optional profile image URL
}

// const stringToColor = (str: string) => {
//     let hash = 0;
//     for (let i = 0; i < str.length; i++) {
//         hash = str.charCodeAt(i) + ((hash << 5) - hash);
//     }
//     return `hsl(${hash % 360}, 60%, 50%)`;
// };

const Avatar: React.FC<AvatarProps> = ({ name, size = 40, className = "", profileUrl }) => {
    const char = name?.charAt(0).toUpperCase() ?? "?";
    // const bgColor = name ? stringToColor(char) : "#e0e7ff";; 

    if (profileUrl) {
        return (
            <div
                className={`relative overflow-hidden rounded-full ${className}`}
                style={{ width: size, height: size }}
            >
                <Image
                    src={profileUrl}
                    alt={name || "User Avatar"}
                    fill
                    className="object-cover rounded-full"
                />
            </div>
        );
    }

    return (
        <span
            className={`flex items-center justify-center bg-[#18181B] text-white font-bold select-none ${className}`}
            style={{
                // backgroundColor: bgColor,
                width: size,
                height: size,
                borderRadius: "50%",
                fontSize: size / 2,
            }}
        >
            {char}
        </span>
    );
};

export default Avatar;