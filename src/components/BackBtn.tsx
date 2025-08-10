"use client";

import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import React from 'react';
import { useRouter } from 'next/navigation';

export default function BackBtn() {
  const router = useRouter();

  return (
    <div
      onClick={() => router.back()}
      className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition-colors cursor-pointer mr-4"
    >
      <ChevronLeftIcon className="h-5 w-5 text-indigo-600" aria-hidden="true" />
    </div>
  );
}
