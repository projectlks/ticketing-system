"use client";
import { useEffect, useState } from "react";
import { ZabbixProblem } from "@/types/zabbix";
import { getAllZabbixTickets } from "@/app/helpdesk/alerts/action";

export const useFetchZabbix = (filter: string) => {
  const [data, setData] = useState<ZabbixProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  const apiKey = process.env.NEXT_PUBLIC_API_SECRET_KEY;


  useEffect(() => {
    const abortController = new AbortController();
    const signal = abortController.signal;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        if (filter === "All Alerts") {
          const res = await getAllZabbixTickets();
          if (!res.success || !res.data) throw new Error(res.error ?? "Failed");
          setData(
            res.data.map((t) => ({
              eventid: t.eventid,
              name: t.name,
              status: t.status,
              clock: Math.floor(new Date(t.clock).getTime() / 1000).toString(),
              tags: t.tags
                ? t.tags.split(",").map((pair) => {
                  const [tag, value] = pair.split(":");
                  return { tag, value };
                })
                : [],
              opdata: "",
              r_clock: "",
              hosts: t.hostName ? [{ hostid: t.id.toString(), host: t.hostName }] : [],
              source: "",
              object: "",
              objectid: "",
              suppressed: "",
              suppression_data: [],
              severity: t.triggerSeverity ?? "0",
              r_eventid: t.status,
              ns: "0",
              r_ns: "0",
              correlationid: "",
              userid: "",
              acknowledged: "0",
              acknowledges: [],
            }))
          );
        } else {


          if (!apiKey) throw new Error("API_SECRET_KEY is not defined");




          const res = await fetch("/api/alerts", {
            headers: {
              "x-api-key": apiKey, // now it's definitely a string
            },
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? "Failed");
          setData(json.result);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    let interval: NodeJS.Timeout;
    if (filter !== "All Alerts") interval = setInterval(fetchData, 60000);

    return () => {
      abortController.abort();
      if (interval) clearInterval(interval);
    };
  }, [filter]);

  return { data, loading, error };
};
