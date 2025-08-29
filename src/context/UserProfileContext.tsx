"use client";

import { getCurrentUserData } from "@/app/lang/[locale]/main/profile/action";
import { UserFullData } from "@/app/lang/[locale]/main/profile/page";
import { getBasicUserData } from "@/libs/action";
import { useSession } from "next-auth/react";
import {
  createContext,
  useContext,
  useState,
  ReactNode,
  Dispatch,
  SetStateAction,
  useEffect,
} from "react";

// Basic user info type
export interface BasicUserData {
  id: string;
  name: string;
  email: string;
  profileUrl: string | null;
}

// Union so context can hold either
export type UserData = BasicUserData;

interface UserDataContextType {
  userData: UserData;
  setUserData: Dispatch<SetStateAction<UserData>>;
}

const UserDataContext = createContext<UserDataContextType | undefined>(
  undefined
);

export const UserDataProvider = ({ children }: { children: ReactNode }) => {
  // const { data: session } = useSession();

  // preload from session
  const initialUser: BasicUserData = {
    id: "", // id only exists if you've extended next-auth user type
    name: "",
    email: "",
    profileUrl: null,
  };

  const [userData, setUserData] = useState<BasicUserData>(initialUser);

  // overwrite with full DB user
  useEffect(() => {
    async function fetchUserData() {
      try {
        const data: BasicUserData = await getBasicUserData();
        setUserData(data);
      } catch (err) {
        console.error("Failed to fetch full user data:", err);
      }
    }

    fetchUserData();
  }, []);

  return (
    <UserDataContext.Provider value={{ userData, setUserData }}>
      {children}
    </UserDataContext.Provider>
  );
};

// Hook
export function useUserData() {
  const context = useContext(UserDataContext);
  if (!context) {
    throw new Error("useUserData must be used within a UserDataProvider");
  }
  return context;
}
