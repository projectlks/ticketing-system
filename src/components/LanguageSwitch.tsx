"use client";

import { usePathname, useRouter } from "next/navigation";
import { ChevronDownIcon, LanguageIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useTheme } from "next-themes";

const languages = [
    { code: "en", name: "English", flag: "/en.png" },
    { code: "mm", name: "မြန်မာ", flag: "/mm.png" },
    { code: "ru", name: "Русский", flag: "/ru.png" },
];

export default function LanguageSwitcher() {
    const pathname = usePathname();
    const router = useRouter();
    const { theme } = useTheme();

    const [isOpen, setIsOpen] = useState(false);
    const [currentLang, setCurrentLang] = useState("en");

    useEffect(() => {
        const savedLang = localStorage.getItem("lang");
        if (savedLang && ["en", "mm", "ru"].includes(savedLang)) {
            setCurrentLang(savedLang);
        }
    }, []);

    const pathWithoutLang = pathname.replace(/^\/lang\/(mm|ru|en)/, "");
    const currentLanguage = languages.find((lang) => lang.code === currentLang) || languages[0];

    const handleLanguageChange = (langCode: string) => {
        localStorage.setItem("lang", langCode);
        setCurrentLang(langCode);
        const newPath = `/lang/${langCode}${pathWithoutLang}`;
        router.push(newPath);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            {/* Select Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-800 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-white "
                aria-expanded={isOpen}
                aria-haspopup="listbox"
            >
                <LanguageIcon className="w-4 h-4" />
                <span className="flex items-center text-xs gap-1 mr-2">
                    <Image
                        src={currentLanguage.flag}
                        alt={currentLanguage.name}
                        width={20}
                        height={15}
                        className="rounded-sm"
                        unoptimized
                    />
                    <span>{currentLanguage.code.toUpperCase()}</span>
                </span>
                <ChevronDownIcon aria-hidden="true"
                    className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

                    {/* Dropdown */}
                    <div className="absolute right-0 z-20 mt-1 w-36 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg">
                        <div className="p-1" role="listbox" >
                            {languages.map((language) => (
                                <button
                                    key={language.code}
                                    onClick={() => handleLanguageChange(language.code)}
                                    className={`w-full flex items-center gap-3 px-3 py-1 text-sm text-left rounded-md hover:bg-gray-100 dark:hover:bg-gray-600  ${currentLang === language.code
                                        ? "bg-blue-500 text-white font-medium"
                                        : "text-gray-900 dark:text-gray-100"
                                        }`}
                                    role="option"
                                    aria-selected={currentLang === language.code}
                                >
                                    <Image
                                        src={language.flag}
                                        alt={language.name}
                                        width={20}
                                        height={15}
                                        className="rounded-sm"
                                        unoptimized
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-xs">{language.name}</span>
                                        <span className="text-[10px] text-gray-500 dark:text-gray-300">
                                            {language.code.toUpperCase()}
                                        </span>
                                    </div>
                                    {currentLang === language.code && (
                                        <div className="ml-auto w-2 h-2 bg-white dark:bg-blue-200 rounded-full" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
