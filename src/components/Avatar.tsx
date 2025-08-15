import React from "react";

interface AvatarProps {
    name?: string | null;
    size?: number; // optional size in px
    className?: string; // optional extra classes
}

const stringToColor = (str: string) => {
    // Simple hash function to convert string to a color
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = `hsl(${hash % 360}, 60%, 50%)`; // unique hue, fixed saturation/lightness
    return color;
};

const Avatar: React.FC<AvatarProps> = ({ name, size = 40, className = "" }) => {
    const char = name?.charAt(0).toUpperCase() ?? "?";
    const bgColor = stringToColor(char);

    return (
        <span
            className={`flex items-center justify-center text-white font-bold select-none ${className}`}
            style={{
                backgroundColor: bgColor,
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
