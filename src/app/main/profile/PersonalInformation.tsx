"use client"

import Input from "@/components/Input";
import { JSX, ReactNode, useState } from "react";
import { changePassword } from "./action";
import Loading from "@/components/Loading";
import Swal from "sweetalert2";
import { UserFullData } from "./page";
// import Button from "@/components/Button";

interface Props {
    data: UserFullData;
    Modal({
        title,
        children,
        onClose,
        onSubmit,
    }: {
        title: string;
        children?: ReactNode;
        onClose: () => void;
        onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    }): JSX.Element;
}

export default function ProfileCard({ data, Modal }: Props) {
    const [openChangePasswordModal, setChangePasswordModal] = useState(false);

    // password form state
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [loading, setLoading] = useState<boolean>(false)

    // error state
    const [errors, setErrors] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
        generalError: ""
    });

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const newErrors = {
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
            generalError: ""
        };

        let hasError = false;

        if (!currentPassword) {
            newErrors.currentPassword = "Current password is required.";
            hasError = true;
        }

        if (newPassword.length < 8) {
            newErrors.newPassword = "Password must be at least 8 characters.";
            hasError = true;
        }
        if (confirmPassword.length < 8) {
            newErrors.confirmPassword = "Password must be at least 8 characters.";
            hasError = true;
        }

        if (currentPassword === newPassword) {
            newErrors.newPassword = "New password cannot be the same as current password.";
            hasError = true;
        }
        if (newPassword !== confirmPassword) {
            newErrors.confirmPassword = "Passwords do not match.";
            hasError = true;
        }

        setErrors(newErrors);

        if (hasError) return;


        try {
            setLoading(true)
            const res = await changePassword(currentPassword, newPassword, data.id);
            console.log(res.message);
            setChangePasswordModal(false);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");

            Swal.fire({
                icon: 'success',
                title: 'Password Changed!',
                text: 'Your password has been updated successfully.',
                timer: 2000,
                showConfirmButton: false
            });
        } catch (err) {
            if (err instanceof Error) {
                setErrors((prev) => ({ ...prev, generalError: err.message }));
            } else {
                setErrors((prev) => ({ ...prev, generalError: "An unknown error occurred" }));
            }
        }
        finally {
            setLoading(false)
        }
    };

    return (
        <>
            {
                loading && (<Loading />)
            }
            <div className="p-5 mb-6 border border-gray-200 rounded-2xl lg:p-6">


                <h4 className="text-lg font-semibold text-gray-800 lg:mb-6">
                    Personal Information
                </h4>
                <div className="grid grid-cols-1 gap-4 ed-700 w-full lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
                    <div>
                        <p className="mb-2 text-xs text-gray-500">Name</p>
                        <p className="text-sm font-medium text-gray-800">{data.name}</p>
                    </div>

                    <div>
                        <p className="mb-2 text-xs text-gray-500">Role</p>
                        <p className="text-sm font-medium text-gray-800">{data.role}</p>
                    </div>
                    <div>
                        <p className="mb-2 text-xs text-gray-500">Work Email</p>
                        <p className="text-sm font-medium text-gray-800">{data.email}</p>
                    </div>  <div>
                        <p className="mb-2 text-xs text-gray-500">Personal Email</p>
                        <p className="text-sm font-medium text-gray-800">{data.personalEmail}</p>
                    </div>
                    <div>
                        <p className="mb-2 text-xs text-gray-500">Work Phone</p>
                        <p className="text-sm font-medium text-gray-800">
                            {data.workMobile || "N/A"}
                        </p>
                    </div>
                    <div>
                        <p className="mb-2 text-xs text-gray-500">Personal Phone</p>
                        <p className="text-sm font-medium text-gray-800">
                            {data.personalPhone || "N/A"}
                        </p>
                    </div>

                    <div className="col-span-2">
                        <button
                            onClick={() => setChangePasswordModal(true)}
                            className="mt-2 text-sm border cursor-pointer border-gray-300 rounded px-4 py-2 hover:bg-gray-100"
                        >
                            Change Password
                        </button>

                        {/* <Button buttonLabel="Change Password" click={() => setChangePasswordModal(true)} /> */}
                    </div>
                </div>

            </div>

            {/* Modals */}
            {openChangePasswordModal && (
                <Modal
                    title="Change Password"
                    onSubmit={handleSubmit}
                    onClose={() => setChangePasswordModal(false)}
                >
                    <div className="space-y-4">
                        <Input
                            label="Current Password"
                            id="current_password"
                            name="current_password"
                            placeholder="Enter current password"
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            require={true}
                            error={!!errors.currentPassword}
                            errorMessage={errors.currentPassword}
                            disable={false}
                        />
                        <Input
                            label="New Password"
                            id="new_password"
                            name="new_password"
                            placeholder="Enter new password"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            require={true}
                            error={!!errors.newPassword}
                            errorMessage={errors.newPassword}
                            disable={false}
                        />
                        <Input
                            label="Confirm Password"
                            id="confirm_password"
                            name="confirm_password"
                            placeholder="Confirm new password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            require={true}
                            error={!!errors.confirmPassword}
                            errorMessage={errors.confirmPassword}
                            disable={false}
                        />
                    </div>
                </Modal>
            )}
        </>
    );
}
