"use client";
import { useState } from "react";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import WorkAndPersonalDetails from "./WorkAndPersonalDetails";
import { User } from "@prisma/client";
import Input from "@/components/Input";
import ProfileCard from "./ProfileCard";
import PersonalInformation from "./PersonalInformation";

interface Props {
    data: User;
}

export default function ProfilePage({ data }: Props) {
    const [isProfileAddressModal, setProfileAddressModal] = useState(false);


    return (
        <>
            <div className="flex-1 overflow-y-auto">
                <div className="rounded-2xl border border-gray-200 bg-white p-5 lg:p-6">
                    <h3 className="mb-5 text-lg font-semibold text-gray-800 lg:mb-7">
                        Profile
                    </h3>

                    {/* Profile Card */}


                    <ProfileCard data={data} Modal={Modal} />

                    {/* Personal Information */}

                    <PersonalInformation data={data} Modal={Modal} />

                    {/* Address */}
                    <div className="p-5 mb-6 border border-gray-200 rounded-2xl lg:p-6">
                        <div className="flex flex-col gap-6 lg:flex-row lg:justify-between">
                            <div>
                                <h4 className="text-lg font-semibold text-gray-800 lg:mb-6">
                                    Address
                                </h4>
                                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
                                    <div>
                                        <p className="mb-2 text-xs text-gray-500">Country</p>
                                        <p className="text-sm font-medium text-gray-800">
                                            {data.nationality || "N/A"}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="mb-2 text-xs text-gray-500">City/State</p>
                                        <p className="text-sm font-medium text-gray-800">
                                            {data.address || "N/A"}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="mb-2 text-xs text-gray-500">Postal Code</p>
                                        <p className="text-sm font-medium text-gray-800">
                                            {/* {data.postal_code || "N/A"} */}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="mb-2 text-xs text-gray-500">TAX ID</p>
                                        <p className="text-sm font-medium text-gray-800">
                                            {data.identification_no || "N/A"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setProfileAddressModal(true)}
                                className="flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                <PencilSquareIcon className="w-5 h-5" />
                                Edit
                            </button>
                        </div>
                    </div>

                    {/* Work & Personal Details */}
                    <WorkAndPersonalDetails data={data} />
                </div>
            </div>



            {isProfileAddressModal && (
                <Modal title="Edit Address"  onSubmit={()=>{alert("hello")}} onClose={() => setProfileAddressModal(false)}>
                    <div className="space-y-4">
                        <Input
                            label="Country"
                            id="country"
                            name="country"
                            placeholder="Enter country"
                            value={data.nationality || ""}
                            onChange={(e) => console.log("Update country", e.target.value)}
                            require={false}
                            error={false}
                            errorMessage=""
                            disable={false}
                        />
                        <Input
                            label="City / State"
                            id="city"
                            name="city"
                            placeholder="Enter city/state"
                            value={data.address || ""}
                            onChange={(e) => console.log("Update city/state", e.target.value)}
                            require={false}
                            error={false}
                            errorMessage=""
                            disable={false}
                        />

                        <Input
                            label="TAX ID"
                            id="tax_id"
                            name="tax_id"
                            placeholder="Enter TAX ID"
                            value={data.identification_no || ""}
                            onChange={(e) => console.log("Update TAX ID", e.target.value)}
                            require={false}
                            error={false}
                            errorMessage=""
                            disable={false}
                        />
                    </div>
                </Modal>
            )}



        </>
    );
}

function Modal({ title, children, onClose, onSubmit }: { title: string; children?: React.ReactNode; onClose: () => void,   onSubmit: (e: React.FormEvent<HTMLFormElement>) => void }) {
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
                <section className="p-5 space-y-6 border-t border-gray-100 sm:p-6">{children}</section>
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
