
"use client"
import { useState } from "react";
import {
    XMarkIcon,
    PencilSquareIcon,
} from "@heroicons/react/24/outline";

export default function ProfilePage() {
    const [isProfileInfoModal, setProfileInfoModal] = useState(false);
    const [isProfileAddressModal, setProfileAddressModal] = useState(false);
    const [openChangePasswordModal, setChangePasswordModal] = useState(false);

    return (
        <section className="flex">





            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="rounded-2xl border border-gray-200 bg-white p-5 lg:p-6">
                    <h3 className="mb-5 text-lg font-semibold text-gray-800 lg:mb-7">
                        Profile
                    </h3>

                    {/* Profile Card */}
                    <div className="p-5 mb-6 border border-gray-200 rounded-2xl lg:p-6">
                        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                            <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
                                <div className="w-20 h-20 overflow-hidden border border-gray-200 rounded-full flex items-center justify-center bg-blue-600 text-white text-4xl">
                                    M
                                </div>
                                <div>
                                    <h4 className="mb-2 text-lg font-semibold text-center text-gray-800 xl:text-left">
                                        Musharof Chowdhury
                                    </h4>
                                    <div className="flex flex-col items-center gap-1 text-center xl:flex-row xl:gap-3 xl:text-left">
                                        <p className="text-sm text-gray-500">Customer</p>
                                        <div className="hidden h-3.5 w-px bg-gray-300 xl:block"></div>
                                        <p className="text-sm text-gray-500">
                                            Arizona, United States.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setProfileInfoModal(true)}
                                className="flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                <PencilSquareIcon className="w-5 h-5" />
                                Edit
                            </button>
                        </div>
                    </div>

                    {/* Personal Info */}
                    <div className="p-5 mb-6 border border-gray-200 rounded-2xl lg:p-6">
                        <div className="flex flex-col gap-6 lg:flex-row lg:justify-between">
                            <div>
                                <h4 className="text-lg font-semibold text-gray-800 lg:mb-6">
                                    Personal Information
                                </h4>
                                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
                                    <div>
                                        <p className="mb-2 text-xs text-gray-500">Name</p>
                                        <p className="text-sm font-medium text-gray-800">
                                            Chowdhury
                                        </p>
                                    </div>
                                    <div>
                                        <p className="mb-2 text-xs text-gray-500">
                                            Email address
                                        </p>
                                        <p className="text-sm font-medium text-gray-800">
                                            randomuser@pimjo.com
                                        </p>
                                    </div>
                                    <div>
                                        <p className="mb-2 text-xs text-gray-500">Phone</p>
                                        <p className="text-sm font-medium text-gray-800">
                                            +959 766 499 823
                                        </p>
                                    </div>
                                    <div>
                                        <p className="mb-2 text-xs text-gray-500">Role</p>
                                        <p className="text-sm font-medium text-gray-800">
                                            Customer
                                        </p>
                                    </div>
                                    <div>
                                        <button
                                            onClick={() => setChangePasswordModal(true)}
                                            className="mt-2 text-sm border border-gray-300 rounded px-4 py-2 hover:bg-gray-100"
                                        >
                                            Change Password
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setProfileInfoModal(true)}
                                className="flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                <PencilSquareIcon className="w-5 h-5" />
                                Edit
                            </button>
                        </div>
                    </div>

                    {/* Address */}
                    <div className="p-5 border border-gray-200 rounded-2xl lg:p-6">
                        <div className="flex flex-col gap-6 lg:flex-row lg:justify-between">
                            <div>
                                <h4 className="text-lg font-semibold text-gray-800 lg:mb-6">
                                    Address
                                </h4>
                                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
                                    <div>
                                        <p className="mb-2 text-xs text-gray-500">Country</p>
                                        <p className="text-sm font-medium text-gray-800">
                                            United States
                                        </p>
                                    </div>
                                    <div>
                                        <p className="mb-2 text-xs text-gray-500">City/State</p>
                                        <p className="text-sm font-medium text-gray-800">
                                            Arizona, United States.
                                        </p>
                                    </div>
                                    <div>
                                        <p className="mb-2 text-xs text-gray-500">Postal Code</p>
                                        <p className="text-sm font-medium text-gray-800">
                                            ERT 2489
                                        </p>
                                    </div>
                                    <div>
                                        <p className="mb-2 text-xs text-gray-500">TAX ID</p>
                                        <p className="text-sm font-medium text-gray-800">
                                            AS4568384
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
                </div>
            </div>


            {/* Profile Info Modal */}
            {isProfileInfoModal && (
                <Modal title="Edit Personal Information" onClose={() => setProfileInfoModal(false)}>
                    {/* form fields here */}
                </Modal>
            )}

            {/* Address Modal */}
            {isProfileAddressModal && (
                <Modal title="Edit Address" onClose={() => setProfileAddressModal(false)}>
                    {/* form fields here */}
                </Modal>
            )}

            {/* Change Password Modal */}
            {openChangePasswordModal && (
                <Modal title="Change Password" onClose={() => setChangePasswordModal(false)}>
                    {/* password fields */}
                </Modal>
            )}
        </section>
    );
}

function Modal({ title, children, onClose }: { title: string; children?: React.ReactNode; onClose: () => void }) {
    return (
        <section className="w-screen fixed top-0 left-0 flex justify-center min-h-screen overflow-auto h-screen items-center backdrop-blur-lg z-50">
            <div
                className="w-full h-full fixed top-0 left-0 bg-black opacity-20"
                // onClick={handleCancel}
                aria-hidden="true"
            />

            <form
                // onSubmit={handleSubmit}
                className="w-[90%] md:w-[600px] rounded-2xl border border-gray-200 bg-white z-50"
                onClick={(e) => e.stopPropagation()}
                noValidate
            >
                <div className="px-5 py-4 sm:px-6 sm:py-5">
                    <h1 className="text-2xl text-gray-800 font-bold mb-3 mt-5">
                        {/* {updateID ? "Update Account" : "Add New Account"} */}
                    </h1>
                    <p className="text-gray-500 text-sm font-semibold">
                        {/* Effortlessly manage your accounts: {updateID ? "update existing details" : "add a new account"}. */}
                    </p>
                </div>

                <section className="p-5 space-y-6 border-t border-gray-100 sm:p-6">




                    {/* Buttons */}
                    <div className="mt-6 flex justify-end space-x-3">
                        <button
                            type="button"
                            // onClick={handleCancel}
                            className="px-4 py-3 text-sm font-medium border border-gray-300 rounded-lg text-gray-800 hover:bg-gray-100 h-[44px]"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            // disabled={loading}
                            className={`px-4 py-3 text-sm font-medium text-white rounded-lg shadow-md h-[44px] bg-indigo-500 hover:bg-indigo-600 {loading
                                ? 'bg-indigo-300 cursor-not-allowed'
                                : 'bg-indigo-500 hover:bg-indigo-600'
                                }`}
                        >
                            {/* {loading
                                ? updateID
                                    ? 'Updating...'
                                    : 'Creating...'
                                : updateID
                                    ? 'Update Account'
                                    : 'Create Account'} */}

                            Update Data
                        </button>
                    </div>
                </section>
            </form>
        </section>
    );
}
