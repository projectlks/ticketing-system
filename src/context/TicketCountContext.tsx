"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getUnseenTicketCount } from "@/libs/action";

interface TicketCountContextType {
  ticketCount: number;
  refreshTicketCount: () => Promise<void>;
}

const TicketCountContext = createContext<TicketCountContextType>({
  ticketCount: 0,
  refreshTicketCount: async () => {},
});

export const TicketCountProvider = ({ children }: { children: ReactNode }) => {
  const [ticketCount, setTicketCount] = useState(0);

  const refreshTicketCount = async () => {
    try {
      const count = await getUnseenTicketCount();
      setTicketCount(count);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    refreshTicketCount(); // initial fetch
  }, []);

  return (
    <TicketCountContext.Provider value={{ ticketCount, refreshTicketCount }}>
      {children}
    </TicketCountContext.Provider>
  );
};

export const useTicketCount = () => useContext(TicketCountContext);
