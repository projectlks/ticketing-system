"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getUnseenTicketCount } from "@/libs/action";
import { useSession } from "next-auth/react";

interface TicketCountContextType {
  ticketCount: number;
  refreshTicketCount: () => Promise<void>;
}

const TicketCountContext = createContext<TicketCountContextType>({
  ticketCount: 0,
  refreshTicketCount: async () => { },
});

export const TicketCountProvider = ({ children }: { children: ReactNode }) => {
  const [ticketCount, setTicketCount] = useState(0);
  const { data: session, status } = useSession(); // get session


  const refreshTicketCount = async () => {
    try {
      const count = await getUnseenTicketCount();
      setTicketCount(count);
    } catch (err) {
      console.error(err);
    }
  };




  useEffect(() => {

    if (status !== "authenticated") return; // wait until session is ready

    const fetchCount = async () => {
      await refreshTicketCount();
    };

    fetchCount(); // first fetch


  }, [status, session?.user]);







  return (
    <TicketCountContext.Provider value={{ ticketCount, refreshTicketCount }}>
      {children}
    </TicketCountContext.Provider>
  );
};

export const useTicketCount = () => useContext(TicketCountContext);
