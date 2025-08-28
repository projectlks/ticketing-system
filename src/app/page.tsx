import { redirect } from 'next/navigation';

export default function Page({ params }: { params: { locale: string } }) {
  redirect(`lang/${params.locale}/main/dashboard`);
}
