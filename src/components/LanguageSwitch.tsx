"use client"

import { usePathname, useRouter } from "next/navigation"
import { ChevronDownIcon, LanguageIcon } from "@heroicons/react/24/outline"
import { useEffect, useState } from "react"
import Image from "next/image"

const languages = [
    { code: "en", name: "English", flag: "/en.png" },
    { code: "mm", name: "မြန်မာ", flag: "/mm.png" },
    { code: "ru", name: "Русский", flag: "/ru.png" },
]

export default function LanguageSwitcher() {
    const pathname = usePathname()
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false)
    const [currentLang, setCurrentLang] = useState("en"); // default

    useEffect(() => {
        const savedLang = localStorage.getItem("lang");
        if (savedLang && ["en", "mm", "ru"].includes(savedLang)) {
            setCurrentLang(savedLang);
        }
    }, []);


    // Extract current language from pathname
    // const currentLangMatch = pathname.match(/^\/lang\/(mm|ru|en)/)
    // const currentLang = currentLangMatch ? currentLangMatch[1] : "en"

    // Get path without language prefix
    const pathWithoutLang = pathname.replace(/^\/lang\/(mm|ru|en)/, "")

    const currentLanguage = languages.find((lang) => lang.code === currentLang) || languages[0]

    const handleLanguageChange = (langCode: string) => {
        localStorage.setItem("lang", langCode); // <--- save
        setCurrentLang(langCode);               // <--- update state
        const newPath = `/lang/${langCode}${pathWithoutLang}`
        router.push(newPath)
        setIsOpen(false)
    }

    return (
        <div className="relative">
            {/* Select Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center  gap-2 px-3  py-2 text-sm font-medium text-foreground bg-background border border-border rounded-md hover:bg-accent hover:text-accent-foreground border-gray-300 text-gray-800 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300/50 transition-colors"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
            >
                <LanguageIcon className="w-4 h-4" />
                <span className="flex items-center text-xs text-gray-900 gap-1 mr-2">
                    <Image
                        src={currentLanguage.flag}
                        alt={currentLanguage.name}
                        width={20}
                        height={15}
                        className="rounded-xs"
                        unoptimized
                    />
                    <span>{currentLanguage.code.toUpperCase()}</span>
                </span>
                <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

                    {/* Dropdown */}
                    <div className="absolute right-0 z-20 mt-1 w-36 bg-white border border-gray-300 border-border rounded-md shadow-lg">
                        <div className="py-1" role="listbox">
                            {languages.map((language) => (
                                <button
                                    key={language.code}
                                    onClick={() => handleLanguageChange(language.code)}
                                    className={`w-full flex items-center gap-3 px-3 py-1 text-sm text-left hover:bg-gray-100  hover:text-accent-foreground transition-colors ${currentLang === language.code
                                        ? "bg-accent text-accent-foreground font-medium"
                                        : "text-popover-foreground"
                                        }`}
                                    role="option"
                                    aria-selected={currentLang === language.code}
                                >
                                    <Image
                                        src={language.flag}
                                        alt={language.name}
                                        width={20}
                                        height={15}
                                        className="rounded-xs"
                                        unoptimized
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-xs ">{language.name}</span>
                                        <span className="text-[10px] text-muted-foreground">{language.code.toUpperCase()}</span>
                                    </div>
                                    {currentLang === language.code && <div className="ml-auto w-2 h-2 bg-primary rounded-full" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
