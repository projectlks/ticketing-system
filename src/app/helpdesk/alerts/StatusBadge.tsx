import React from "react";

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  // r_eventid value ကို normalize လုပ်ပြီး resolved/problem state တစ်မျိုးတည်းနဲ့ပြထားလို့
  // backend source မတူလည်း UI status language က consistent ဖြစ်စေပါတယ်။
  const isProblem = status === "0" || status === "PROBLEM";

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium ${
        isProblem
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      {isProblem ? "PROBLEM" : "RESOLVED"}
    </span>
  );
};
