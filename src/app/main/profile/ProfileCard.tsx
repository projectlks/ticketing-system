"use client"
import Avatar from '@/components/Avatar'
import { CameraIcon, PencilSquareIcon } from '@heroicons/react/24/outline'
import React, { JSX, ReactNode, useState } from 'react'
import Image from "next/image";
import { User } from '@prisma/client';
import Input from '@/components/Input';
import { changeProfileUrl } from './action';

interface Props {
    data: User
    Modal({ title, children, onClose }: {
        title: string;
        children?: ReactNode;
        onClose: () => void;
    }): JSX.Element
}

export default function ProfileCard({ data, Modal }: Props) {
    const [isProfileInfoModal, setProfileInfoModal] = useState(false);
    const [currentProfileUrl, setCurrentProfileUrl] = useState<string | null>(data.profileUrl || null);


    // Function to delete old image from server
    const deleteImage = async (url: string) => {
        const encodedUrl = encodeURIComponent(url);
        await fetch(`/api/delete-image?url=${encodedUrl}`, { method: 'DELETE' });

    };


    const uploadImage = async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
        const data = await res.json();
        return data.urls[0];
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Show local preview immediately

        try {
            // Delete old image if exists
            if (currentProfileUrl) {
                await deleteImage(currentProfileUrl);
            }

            // Upload new image to server
            const uploadedUrl = await uploadImage(file);

            // Update database with new profileUrl
            await changeProfileUrl(data.id, uploadedUrl);

            // Update preview with actual server URL
            setCurrentProfileUrl(uploadedUrl); // <--- sync new URL

        } catch (err) {
            console.error("Error updating profile image:", err);
        }
    };


    return (
        <>
            <div className="p-5 mb-6 border border-gray-200 rounded-2xl lg:p-6">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex flex-col items-center w-full gap-6 xl:flex-row">

                        {/* profile img */}
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
                            />
                        </div>


                        {/* use info  */}
                        <div>
                            <h4 className=" text-lg font-semibold text-center text-gray-800 xl:text-left">
                                {data.name || "No Name"}
                            </h4>
                            <p className='text-[10px] mb-2 text-gray-500 '>
                                {data.email}
                            </p>
                            <div className="flex flex-col items-center gap-1 text-center xl:flex-row xl:gap-3 xl:text-left">
                                <p className="text-sm text-gray-500">{data.role}</p>
                                <div className="hidden h-3.5 w-px bg-gray-300 xl:block"></div>
                                <p className="text-sm text-gray-500">
                                    {data.department || "No Department"}
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

            {/* Modals */}
            {isProfileInfoModal && (
                <Modal title="Edit Personal Information" onClose={() => setProfileInfoModal(false)}>
                    <div className="space-y-4">
                        <Input
                            label="Name"
                            id="name"
                            name="name"
                            placeholder="Enter name"
                            value={data.name || ""}
                            onChange={(e) => console.log("Update name", e.target.value)}
                            require={true}
                            error={false}
                            errorMessage=""
                            disable={false}
                        />
                        <Input
                            label="Email"
                            id="email"
                            name="email"
                            placeholder="Enter email"
                            value={data.email || ""}
                            onChange={(e) => console.log("Update email", e.target.value)}
                            require={true}
                            error={false}
                            errorMessage=""
                            disable={false}
                        />
                        <Input
                            label="Phone"
                            id="phone"
                            name="phone"
                            placeholder="Enter phone"
                            value={data.work_mobile || data.personal_phone || ""}
                            onChange={(e) => console.log("Update phone", e.target.value)}
                            require={false}
                            error={false}
                            errorMessage=""
                            disable={false}
                        />
                    </div>
                </Modal>
            )}
        </>
    )
}
