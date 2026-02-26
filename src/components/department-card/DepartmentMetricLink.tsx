import { ArrowUpRightIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

type DepartmentMetricLinkProps = {
  label: string;
  value: number;
  href: {
    pathname: string;
    query: Record<string, string>;
  };
  helper?: string;
  tone?: "default" | "primary";
};

export default function DepartmentMetricLink({
  label,
  value,
  href,
  helper,
  tone = "default",
}: DepartmentMetricLinkProps) {
  const primary = tone === "primary";

  return (
    <Link
      href={href}
      // tone prop တစ်ခုတည်းနဲ့ emphasized metric နဲ့ normal metric ကိုခွဲထားလို့
      // card parent က tile priority ပြောင်းချင်ရင် style duplicated code မရေးဘဲ reuse လုပ်နိုင်ပါတယ်။
      className={`group/metric rounded-xl border px-3 py-2.5 transition-colors ${
        primary
          ? "border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800"
          : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100"
      }`}>
      <p
        className={`text-[10px] font-medium uppercase tracking-[0.08em] ${
          primary ? "text-zinc-300" : "text-zinc-500"
        }`}>
        {label}
      </p>

      <div className="mt-1 flex items-end justify-between gap-2">
        <p
          className={`text-xl font-semibold tracking-tight ${
            primary ? "text-white" : "text-zinc-900"
          }`}>
          {value}
        </p>
        <ArrowUpRightIcon
          aria-hidden="true"
          // group/metric နာမည်နဲ့ scope ပေးထားလို့ tile တစ်ခုချင်း hover မှာပဲ arrow animation အလုပ်လုပ်ပါတယ်။
          className={`h-4 w-4 transition-transform group-hover/metric:-translate-y-0.5 group-hover/metric:translate-x-0.5 ${
            primary ? "text-zinc-300" : "text-zinc-500"
          }`}
        />
      </div>

      {helper && (
        <p
          className={`mt-0.5 text-[11px] ${
            primary ? "text-zinc-300" : "text-zinc-500"
          }`}>
          {helper}
        </p>
      )}
    </Link>
  );
}
