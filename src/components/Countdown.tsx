"use client";
import { useEffect, useState } from "react";
import dayjs from "@/libs/dayjs";

type CountdownProps = {
  targetTime: string; // ISO string
};

export default function Countdown({ targetTime }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isCritical, setIsCritical] = useState(false); // < 5 min flag

  useEffect(() => {
    const interval = setInterval(() => {
      const now = dayjs();
      const target = dayjs(targetTime);
      const diff = target.diff(now);

      if (diff <= 0) {
        setTimeLeft("Expired");
        setIsCritical(true);
        clearInterval(interval);
        return;
      }

      const dur = dayjs.duration(diff);
      const days = Math.floor(dur.asDays());

      // 🌟 ဂဏန်းများကို (၂) လုံးပြည့်အောင် 0 ခံပေးမည့် Helper Function
      const pad = (num: number) => String(num).padStart(2, "0");

      const hours = pad(dur.hours());
      const minutes = pad(dur.minutes());
      const seconds = pad(dur.seconds());

      // 🌟 ဒစ်ဂျစ်တယ်နာရီ ပုံစံဖြင့် သပ်ရပ်စွာ ပြင်ဆင်ခြင်း
      const formattedTime =
        days > 0
          ? `${days}d ${hours}:${minutes}:${seconds}`
          : `${hours}:${minutes}:${seconds}`;

      setTimeLeft(formattedTime);

      // Less than 5 minutes → critical
      setIsCritical(diff <= 5 * 60 * 1000);
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTime]);

  return (
    // 🌟 tabular-nums ထည့်ထားသဖြင့် စက္ကန့်ပြောင်းတိုင်း ဂဏန်းများ ဘယ်ညာ မခုန်တော့ပါ
    <span
      className={`block whitespace-nowrap text-sm font-medium tabular-nums tracking-wide ${isCritical ? "text-red-500 animate-pulse" : "text-zinc-500"}`}>
      {timeLeft}
    </span>
  );
}
