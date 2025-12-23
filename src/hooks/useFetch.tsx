import { useEffect, useState } from "react";

type UseFetchResult<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

const useFetch = <T = unknown>(url: string): UseFetchResult<T> => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const abortController = new AbortController();
    const signal = abortController.signal;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(url, { signal });
        if (!res.ok) throw new Error("Failed to fetch data");
        const result: T = await res.json();
        setData(result);
      } catch (err: unknown) {
        if ((err as { name?: string }).name !== "AbortError") {
          setError((err as Error).message || "Something went wrong");
          setData(null);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      abortController.abort();
    };
  }, [url]);

  return { data, loading, error };
};

export default useFetch;
