import React from "react";

// Zabbix severity code ကို လူဖတ်ရလွယ်တဲ့ label ပြောင်းပေးထားလို့
// table row ထဲမှာ raw number မမြင်ရပဲ meaning တန်းသိနိုင်ပါတယ်။
export const severityLabel = (s: string) => {
  switch (s) {
    case "0": return "Information";
    case "1": return "Warning";
    case "2": return "Average";
    case "3": return "High";
    case "4": return "Disaster";
    default: return "Unknown";
  }
};

// Severity အလိုက် visual emphasis မတူအောင် class mapping သတ်မှတ်ထားပါတယ်။
export const severityColor = (s: string) => {
  switch (s) {
    case "0":
      return "border-zinc-200 bg-zinc-50 text-zinc-600";
    case "1":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "2":
      return "border-orange-200 bg-orange-50 text-orange-700";
    case "3":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "4":
      return "border-red-300 bg-red-600 text-white";
    default:
      return "border-zinc-200 bg-zinc-50 text-zinc-600";
  }
};

export const SeverityBadge: React.FC<{ value: string }> = ({ value }) => (
  <span
    className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium ${severityColor(value)}`}>
    {severityLabel(value)}
  </span>
);
