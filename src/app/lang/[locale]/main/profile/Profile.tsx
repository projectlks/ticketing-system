"use client";
import WorkAndPersonalDetails from "./WorkAndPersonalDetails";
import ProfileCard from "./ProfileCard";
import PersonalInformation from "./PersonalInformation";
import { UserFullData } from "./page";
import { useState } from "react";

interface Props {
    data: UserFullData
}

export default function ProfilePage({data} : Props) {
    const [userData, setUserData] = useState<UserFullData>(data)


    return (
        <>
            <div className="flex-1 overflow-y-auto">
                <div className="rounded-2xl border border-gray-200 bg-white p-5 lg:p-6">
                    <h3 className="mb-5 text-lg font-semibold text-gray-800 lg:mb-7">
                        Profile
                    </h3>

                    {/* Profile Card */}
                    <ProfileCard data={userData} setUserData={setUserData} Modal={Modal} />

                    {/* Personal Information */}
                    <PersonalInformation data={userData} Modal={Modal} />



                    {/* Work & Personal Details */}
                    <WorkAndPersonalDetails data={userData} Modal={Modal} />


                </div>
            </div>


        </>
    );
}

function Modal({ title, children, onClose, onSubmit }: { title: string; children?: React.ReactNode; onClose: () => void; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void }) {
    return (
        <section className="w-screen fixed top-0 left-0 flex justify-center min-h-screen overflow-auto h-screen items-center backdrop-blur-lg z-50">
            <div className="w-full h-full fixed top-0 left-0 bg-black opacity-20" aria-hidden="true" />
            <form
                className="w-[90%] md:w-[600px] rounded-2xl border border-gray-200 bg-white z-50"
                onClick={(e) => e.stopPropagation()}
                onSubmit={onSubmit}
            >
                <div className="px-5 py-4 sm:px-6 sm:py-5">
                    <h1 className="text-2xl text-gray-800 font-bold mb-3 mt-5">{title}</h1>
                </div>
                <section className="p-5 space-y-6 max-h-[75vh] overflow-y-auto border-t border-gray-100 sm:p-6">{children}</section>
                <div className="mt-6 flex justify-end space-x-3 px-5 pb-5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-3 text-sm font-medium border border-gray-300 rounded-lg text-gray-800 hover:bg-gray-100 h-[44px]"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-3 text-sm font-medium text-white rounded-lg shadow-md h-[44px] bg-indigo-500 hover:bg-indigo-600"
                    >
                        Update Data
                    </button>
                </div>
            </form>
        </section>
    );
}
