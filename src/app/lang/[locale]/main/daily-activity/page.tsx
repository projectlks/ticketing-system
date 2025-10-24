"use client";

import Cards from "./Cards";
import TableHead from "@/components/TableHead";
import Header from "@/components/Header";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Button from "@/components/Button";
import {
  ArrowLongLeftIcon,
  ArrowLongRightIcon,
} from "@heroicons/react/24/outline";
import Portal from "@/components/Portal";
import TableBody from "@/components/TableBody";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCounts, getAllLogs, LogsResponse } from "./action";
import Loading from "@/components/Loading";
import Form from "./Form";
import { Logs } from "@prisma/client";
import DotMenu from "@/components/DotMenu";
import { useDaillyActivityPriorityColor } from "@/hooks/useDailyActivityPriority";
// import { useDaillyActivityPriorityColor } from "@/hooks/useDailyActivityPriorityColor";


export type LogWithContact = Logs & {
  contact: {
    id: string;
    name: string;
    email: string;
  };
};

export default function Page() {
  // const t = useTranslations("tickets");
  const tHeader = useTranslations("header");

  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [updateId, setUpdateId] = useState<string | null>(null);

  // const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // ✅ Sync input with URL search param
  useEffect(() => {

    setPage(1);
  }, [searchQuery]);

  // ✅ Fetch logs with React Query
  const { data, isLoading } = useQuery<LogsResponse>({
    queryKey: ["logs", page, searchQuery],
    queryFn: () => getAllLogs({ page, search: searchQuery }),
    staleTime: 60000,
  });


  const { data: counts } = useQuery({
    queryKey: ['logs-counts'],
    queryFn: () => getCounts(),
    staleTime: 60000,
  });

  // ✅ Prefetch next page for smooth navigation
  useEffect(() => {
    if (data?.nextPage) {
      queryClient.prefetchQuery({
        queryKey: ["logs", data.nextPage, searchQuery],
        queryFn: () => getAllLogs({ page: data.nextPage, search: searchQuery }),
      });
    }
  }, [data, searchQuery, queryClient]);

  // ✅ Logs list
  const logs: LogWithContact[] = data?.data || [];
  const getPriorityColor = useDaillyActivityPriorityColor;



  return (

    <>
      {isLoading && <Loading />}
      <section className="flex flex-col gap-y-5">
        {/* Dashboard cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-5">
          <Cards title="DISASTER" count={counts?.DISASTER} />
          <Cards title="HIGH" count={counts?.HIGH} />
          <Cards title="AVERAGE" count={counts?.AVERAGE} />
          <Cards title="WARNING" count={counts?.WARNING} />
          <Cards title="INFORMATION" count={counts?.INFORMATION} />
        </div>

        {/* Table Section */}
        <div className="w-full min-h-full bg-white dark:bg-gray-900 pb-10 rounded-lg">
          <Header
            title={tHeader("tickets.title")}
            placeholder={tHeader("tickets.placeholder")}
            click={() => { setShowForm(true); setUpdateId(null); }}
            setSearchQuery={setSearchQuery}
            searchQuery={searchQuery}
            showNewBtn={true}
          />

          <div className="p-5">
            {logs.length > 0 ? (
              <div className="rounded">
                <div className="max-w-full overflow-x-auto">
                  <table className="w-full min-w-[1102px] border border-gray-200 dark:border-gray-700">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-700">
                        <TableHead data="No" />
                        <TableHead data="DateTime" />
                        <TableHead data="Recovery Time" />
                        <TableHead data="Status" />
                        <TableHead data="Host" />
                        <TableHead data="Description" />
                        <TableHead data="Severity" />
                        <TableHead data="Duration" />
                        <TableHead data="Contact" />
                        <TableHead data="Remark" />
                        <TableHead data="Action" />
                      </tr>
                    </thead>
                    <tbody>
                      {logs.length > 0 ? (
                        logs.map((log, index) => (
                          <tr
                            key={log.id}
                            className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                            {/* <TableBody data={String(index + 1)} /> */}
                            <TableBody data={String((page - 1) * 10 + index + 1)} />

                            <TableBody
                              data={new Date(log.datetime).toLocaleString()}
                            />
                            <TableBody
                              data={
                                log.recoveryTime
                                  ? new Date(log.recoveryTime).toLocaleString()
                                  : "-"
                              }
                            />
                            {/* <TableBody data={log.status} /> */}

                            <td
                              className={`px-5 py-2.5 sm:px-6  max-w-[500px]  `}
                            >
                              <p className={` ${log.status === "RESOLVED" ? "text-green-500" : "text-red-500"} text-[14px]  truncate `}>{log.status}</p>
                            </td>
                            <TableBody data={log.host} />
                            <TableBody data={log.description || "-"} />
                            {/* <TableBody data={log.problemSeverity} /> */}


                            <td className="px-5 py-4 sm:px-6">
                              <div
                                className={`flex items-center px-2 py-1 rounded-full ${getPriorityColor(log.problemSeverity || '', "borderAndText")} space-x-2 border`}
                              >
                                <span
                                  className={`w-2 block aspect-square rounded-full ${getPriorityColor(log.problemSeverity || '')}`}
                                />
                                <p className="text-xs truncatetext-gray-700 dark:text-gray-200">
                                  {log.problemSeverity}
                                </p>
                              </div>
                            </td>
                            <TableBody data={log.duration || "-"} />
                            {/* <TableBody data={log.contact.name || "-"} /> */}
                            <td className="px-5 py-4 sm:px-6">
                              <p className="text-gray-500 text-[14px] dark:text-gray-300 truncate">
                                {log.contact ? log.contact.name || "-" : "-"}
                              </p>
                              <p className="text-gray-500  dark:text-gray-400 text-xs truncate">
                                {log.contact ? log.contact.email || "-" : "-"}
                              </p>
                            </td>

                            <TableBody data={log.remark || "-"} />
                            <td className="px-5 py-4 flex items-center space-x-3 sm:px-6">
                              <DotMenu option={{ view: true, edit: true }} isBottom={index >= logs.length - 2} onEdit={() => { setUpdateId(log.id); setShowForm(true); }} />
                            </td>

                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={10}
                            className="text-center py-5 text-gray-500 dark:text-gray-400"
                          >
                            No logs found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    click={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={page === 1}
                    buttonLabel={
                      <>
                        <ArrowLongLeftIcon className="w-4 h-4" />
                        <span> Prev</span>
                      </>
                    }
                  />

                  <Button
                    click={() => setPage((prev) => prev + 1)}
                    disabled={!data?.nextPage}
                    buttonLabel={
                      <>
                        <span>Next </span>
                        <ArrowLongRightIcon className="w-4 h-4" />
                      </>
                    }
                  />
                </div>
              </div>
            ) : (
              <p className="text-base text-center text-gray-500 dark:text-gray-400">
                No logs found.
              </p>
            )}
          </div>
        </div>

        {showForm && (
          <Portal containerId="modal-root">
            {/* You can later add a Log form modal here */}
            <Form setShowForm={setShowForm} updateId={updateId} />
          </Portal>
        )}
      </section>
    </>

  );
}
