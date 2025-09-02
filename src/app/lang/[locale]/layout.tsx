import { NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import LocaleRedirect from './LocaleRedirect';
// import LocaleRedirect from './LocaleRedirect'; // client-side redirect

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
    notFound(); // messages မရှိရင် 404 ပြ
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <LocaleRedirect />
      {children}
    </NextIntlClientProvider>
  );
}
