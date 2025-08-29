'use client'

import Avatar from '@/components/Avatar'
import { CameraIcon, PencilSquareIcon } from '@heroicons/react/24/outline'
import React, { Dispatch, JSX, ReactNode, SetStateAction, useEffect, useState } from 'react'
import Image from "next/image";
import Input from '@/components/Input';
import Swal from 'sweetalert2';
import { changePersonalInfo, changeProfileUrl } from './action';
import { UserFullData } from './page';
import { useUserData } from "@/context/UserProfileContext";


interface Props {
    data: UserFullData;
    setUserData: Dispatch<SetStateAction<UserFullData>>;
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

export default function ProfileCard({ data, Modal, setUserData }: Props) {
    const [isProfileInfoModal, setProfileInfoModal] = useState(false);
    const [currentProfileUrl, setCurrentProfileUrl] = useState<string | null>(data.profileUrl || null);
    const [errors, setErrors] = useState<{ name?: string; workEmail?: string }>({})
    const [loading, setLoading] = useState(false);

    const [editData, setEditData] = useState({
        name: data.name || '',
        workEmail: data.email || '',
        personalEmail: data.personalEmail || '',
        workPhone: data.workMobile || '',
        personalPhone: data.personalPhone || '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setEditData(prev => ({ ...prev, [name]: value }));
    };

    // DELETE image by filename from /api/uploads/[filename]
    const deleteImage = async (url: string) => {
        try {
            const filename = url.split("/").pop();
            if (!filename) return;
            const res = await fetch(`/api/uploads/${filename}`, { method: 'DELETE' });
            if (!res.ok) throw new Error(`Delete failed: ${res.statusText}`);
        } catch (err: unknown) {
            console.error("Failed to delete image:", err);
        }
    };

    // UPLOAD image to /api/uploads
    const uploadImage = async (file: File): Promise<string> => {
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/uploads", { method: "POST", body: formData });
            if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
            const data = await res.json();
            return data.urls[0]; // return first uploaded image URL
        } catch (err: unknown) {
            let message = "Upload failed";
            if (err instanceof Error) message = err.message;
            throw new Error(message);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setLoading(true);
            if (currentProfileUrl) await deleteImage(currentProfileUrl);
            const uploadedUrl = await uploadImage(file);
            await changeProfileUrl(data.id, uploadedUrl);
            setCurrentProfileUrl(uploadedUrl);
            setUserData(prev => ({ ...prev, profileUrl: uploadedUrl }));
            setUserDataForContext(prev => ({ ...prev, profileUrl: uploadedUrl }));




            Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Profile image updated successfully.',
                timer: 2000,
                showConfirmButton: false
            });
        } catch (err: unknown) {
            let message = "Failed to update profile image.";
            if (err instanceof Error) message = err.message;
            Swal.fire({ icon: 'error', title: 'Error', text: message });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // --- Validation ---
        const newErrors: { name?: string } = {};
        if (!editData.name.trim()) newErrors.name = 'Name is required.';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setErrors({});
        setLoading(true);

        const formData = new FormData();
        formData.append('userId', data.id);
        formData.append('name', editData.name);
        formData.append('personalEmail', editData.personalEmail);
        formData.append('workPhone', editData.workPhone);
        formData.append('personalPhone', editData.personalPhone);

        try {
            const updatedUser = await changePersonalInfo(formData);
            setUserData(prev => ({ ...prev, ...updatedUser }));
            setUserDataForContext(prev => ({ ...prev, ...updatedUser }));

            setProfileInfoModal(false);
            Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Personal information updated successfully.',
                timer: 2000,
                showConfirmButton: false
            });
        } catch (err: unknown) {
            let message = "Failed to update personal info.";
            if (err instanceof Error) message = err.message;
            Swal.fire({ icon: 'error', title: 'Error', text: message });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setEditData({
            name: data.name || '',
            workEmail: data.email || '',
            personalEmail: data.personalEmail || '',
            workPhone: data.workMobile || '',
            personalPhone: data.personalPhone || '',
        });
    }, [data]);

    const { setUserData: setUserDataForContext } = useUserData()

    return (
        <>
            <div className="p-5 mb-6 border border-gray-200 rounded-2xl lg:p-6">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
                        {/* Profile Image */}
                        <div className="relative group w-20 h-20">
                            {currentProfileUrl ? (
                                <div className="w-full h-full overflow-hidden rounded-full relative">
                                    <Image
                                        src={currentProfileUrl}
                                        alt={data.name || "User Avatar"}
                                        fill
                                        className="object-cover rounded-full"
                                    />
                                </div>
                            ) : (
                                <Avatar name={data.name} size={80} profileUrl={data.profileUrl} />
                            )}

                            <span className="absolute flex justify-center items-center rounded-full inset-0 group-hover:opacity-50 bg-black opacity-0 transition-opacity">
                                <CameraIcon className="w-6 h-6 text-gray-100" />
                            </span>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                disabled={loading}
                            />
                        </div>

                        {/* User Info */}
                        <div>
                            <h4 className="text-lg font-semibold text-center text-gray-800 xl:text-left">
                                {data.name || "No Name"}
                            </h4>
                            <p className='text-[10px] mb-2 text-gray-500'>{data.email}</p>
                            <div className="flex flex-col items-center gap-1 text-center xl:flex-row xl:gap-3 xl:text-left">
                                <p className="text-sm text-gray-500">{data.role}</p>
                                <div className="hidden h-3.5 w-px bg-gray-300 xl:block"></div>
                                <p className="text-sm text-gray-500">
                                    {typeof data.jobPosition === "object"
                                        ? data.jobPosition?.department?.name || "No Department"
                                        : "No Department"}
                                    ({data.jobPosition?.name || "No Position"})
                                </p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => setProfileInfoModal(true)}
                        className="flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        disabled={loading}
                    >
                        <PencilSquareIcon className="w-5 h-5" />
                        {loading ? 'Loading...' : 'Edit'}
                    </button>
                </div>
            </div>

            {/* Edit Modal */}
            {isProfileInfoModal && (<Modal title="Edit Personal Information" onSubmit={handleSubmit} onClose={() => setProfileInfoModal(false)}> <div className="space-y-4"> <Input label="Work Email" id="edit-work-email" name="workEmail" placeholder="Enter work email" value={editData.workEmail} onChange={handleChange} require error={!!errors.workEmail} errorMessage={errors.workEmail || ''} disable={true} /> <Input label="Name" id="edit-name" name="name" placeholder="Enter name" value={editData.name} onChange={handleChange} require error={!!errors.name} errorMessage={errors.name || ''} disable={false} /> <Input label="Personal Email" id="edit-personal-email" name="personalEmail" placeholder="Enter personal email" value={editData.personalEmail} onChange={handleChange} require error={false} errorMessage={''} disable={false} /> <Input label="Work Phone" id="edit-work-phone" name="workPhone" placeholder="Enter work phone" value={editData.workPhone} onChange={handleChange} require={false} error={false} errorMessage="" disable={false} /> <Input label="Personal Phone" id="edit-personal-phone" name="personalPhone" placeholder="Enter personal phone" value={editData.personalPhone} onChange={handleChange} require={false} error={false} errorMessage="" disable={false} /> </div> </Modal>)}
        </>
    )
}
