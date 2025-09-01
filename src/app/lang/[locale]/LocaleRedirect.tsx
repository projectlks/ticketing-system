'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function LocaleRedirect() {
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // localStorage ထဲမှာ lang ရှိမယ်ဆိုရင်ယူမယ်, မရှိရင် default "en"
        const savedLang = localStorage.getItem('lang') || 'en';

        // URL path က lang prefix မရှိရင် redirect လုပ်မယ်
        if (!/^\/lang\/(en|mm|ru)/.test(pathname)) {
            router.replace(`/lang/${savedLang}/main/dashboard`);
        }
    }, [pathname, router]);

    return null;
}
