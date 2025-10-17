import React from "react";
// import {
//   ExclamationTriangleIcon,
//   FireIcon,
//   WrenchScrewdriverIcon,
//   ChatBubbleLeftRightIcon,
// } from "@heroicons/react/24/outline";

interface CardsProps {
  title?: string;
  count?: number;
}

export default function Cards({ title = "", count = 0 }: CardsProps) {
  // const getIcon = () => {
  //   switch (title.toUpperCase()) {
  //     case "CRITICAL":
  //       return (
  //         <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
  //       );
  //     case "MAJOR":
  //       return <FireIcon className="h-6 w-6 text-orange-500" />;
  //     case "MINOR":
  //       return <WrenchScrewdriverIcon className="h-6 w-6 text-yellow-500" />;
  //     case "REQUEST":
  //       return <ChatBubbleLeftRightIcon className="h-6 w-6 text-blue-500" />;
  //     default:
  //       return <ExclamationTriangleIcon className="h-6 w-6 text-gray-400" />;
  //   }
  // };

  // const getColorClasses = () => {
  //   switch (title.toUpperCase()) {
  //     case "CRITICAL":
  //       return "border-red-300 text-red-500";
  //     case "MAJOR":
  //       return "border-orange-300 text-orange-500";
  //     case "MINOR":
  //       return "border-yellow-300 text-yellow-500";
  //     case "REQUEST":
  //       return "border-blue-300 text-blue-500";
  //     default:
  //       return "border-gray-300 text-gray-400";
  //   }
  // };

  return (
    <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center">
        {/* <div
          className={`rounded-full relative h-12 w-12 flex justify-center items-center border ${getColorClasses()}`}
        >
          {getIcon()}
        </div> */}
        <div className="h-fit flex justify-between w-full ">
          <span>

            <h3 className="text-md uppercase mb-0 font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-300">Priority Level</p>

          </span>
          <div className="text-md font-semibold text-gray-900 dark:text-gray-100">
            {count}
          </div>
        </div>
      </div>

    </div>
  );
}
