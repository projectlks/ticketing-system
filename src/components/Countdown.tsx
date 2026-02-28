"use client";
import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
dayjs.extend(duration);

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
        setIsCritical(true)
        clearInterval(interval);
        return;
      }

      const dur = dayjs.duration(diff);
      const hours = Math.floor(dur.asHours());
      const minutes = dur.minutes();
      const seconds = dur.seconds();

      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);

      // Less than 5 minutes → critical
      setIsCritical(diff <= 5 * 60 * 1000);
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTime]);

  return (
    <span className={`block whitespace-nowrap text-sm ${isCritical ? "text-red-500 font-bold animate-pulse " : "text-gray-500 "}`}>
      {timeLeft}
    </span>
  );
}
