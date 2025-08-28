// // src/app/[locale]/layout.tsx

// import { notFound } from 'next/navigation';
// import { getMessages } from 'next-intl/server';
// import { NextIntlClientProvider } from 'next-intl'; // ✅ import
// // import type { PropsWithChildren } from 'react';

// type Props = {
//   children: React.ReactNode;
//   params: { locale: string };
// };

// export default async function LocaleLayout({ children, params: { locale } }: Props) {
//   // ✅ locale မမှန်ရင် 404 ပြသ
//   if (!['en', 'mm', 'ru'].includes(locale)) {
//     notFound();
//   }

//   // ✅ locale message များ load
//   const messages = await getMessages({ locale });

//   return (
//     <html lang={locale}>
//       <body>
//         {/* ✅ Wrap all children with Provider */}
//         <NextIntlClientProvider locale={locale} messages={messages}>
//           {children}
//         </NextIntlClientProvider>
//       </body>
//     </html>
//   );
// }
// layout.tsx
import { NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  params: { locale: string };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = params;

  let messages;
  try {
    messages = (await import(`../../../messages/${locale}.json`)).default;
  } catch {
    notFound();
  }

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
