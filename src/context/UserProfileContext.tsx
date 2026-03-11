"use client";

// import { getCurrentUserData } from "@/app/lang/[locale]/main/profile/action";
// import { UserFullData } from "@/app/lang/[locale]/main/profile/page";
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

const EMPTY_USER: BasicUserData = {
  id: "",
  name: "",
  email: "",
  profileUrl: null,
};

const UserDataContext = createContext<UserDataContextType | undefined>(
  undefined
);

export const UserDataProvider = ({ children }: { children: ReactNode }) => {
  const { status } = useSession();
  const [userData, setUserData] = useState<BasicUserData>(EMPTY_USER);
  const safeUserData = status === "authenticated" ? userData : EMPTY_USER;

  // overwrite with full DB user
  useEffect(() => {
    let isActive = true;

    if (status !== "authenticated") {
      return () => {
        isActive = false;
      };
    }

    async function fetchUserData() {
      try {
        const result = await getBasicUserData();
        if (result.error || !result.data) {
          console.error("Failed to fetch user data:", result.error);
          return;
        }
        if (isActive) {
          setUserData(result.data);
        }
      } catch (err) {
        console.error("Failed to fetch full user data:", err);
      }
    }

    fetchUserData();

    return () => {
      isActive = false;
    };
  }, [status]);

  return (
    <UserDataContext.Provider value={{ userData: safeUserData, setUserData }}>
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
