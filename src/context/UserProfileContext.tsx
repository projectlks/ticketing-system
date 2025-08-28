"use client";



import { getCurrentUserData } from "@/app/lang/[locale]/main/profile/action";
import { UserFullData } from "@/app/lang/[locale]/main/profile/page";
import { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction, useEffect } from "react";

// Default user object (empty values to prevent undefined)
const defaultUserData: UserFullData = {
  id: "",
  name: "",
  email: "",
  password: "",
  role: "REQUESTER",
  createdAt: new Date(),
  updatedAt: new Date(),
  isArchived: false,
  profileUrl: null,
  employeeId: null,
  status: null,
  workMobile: null,
  personalPhone: null,
  address: null,
  personalEmail: null,
  language: null,
  emergencyContact: null,
  emergencyPhone: null,
  nationality: null,
  identificationNo: null,
  passportNo: null,
  dateOfBirth: null,
  maritalStatus: null,
  numberOfChildren: null,
  creatorId: null,
  updaterId: null,
  createdDepartments: [],
  managedDepartments: [],
  updatedDepartments: [],
  departmentId: null,
  createdCategories: [],
  updatedCategories: [],
  jobPositionId: null,
  createdJobPositions: [],
  requestTickets: [],
  assignedTickets: [],
  likes: [],
  audits: [],
  comments: [],
  jobPosition: null,
};

// Context type
interface UserDataContextType {
  userData: UserFullData;
  setUserData: Dispatch<SetStateAction<UserFullData>>;
}

// Default context value
const defaultContext: UserDataContextType = {
  userData: defaultUserData,
  setUserData: () => { },
};

const UserDataContext = createContext<UserDataContextType>(defaultContext);

export const UserDataProvider = ({ children }: { children: ReactNode }) => {
  const [userData, setUserData] = useState<UserFullData>(defaultUserData);
  const fetchUserData = async () => {
    try {
      const data: UserFullData = await getCurrentUserData();
      setUserData(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  return (
    <UserDataContext.Provider value={{ userData, setUserData }}>
      {children}
    </UserDataContext.Provider>
  );
};

// Hook
export const useUserData = () => useContext(UserDataContext);
