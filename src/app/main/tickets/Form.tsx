'use client';

import React, { Dispatch, SetStateAction, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import Loading from '@/components/Loading';
import Input from '@/components/Input';
import { createTicket, getTicket, updateTicket } from './action';
import { TicketWithRelations } from './page';
import { getAllCategoryIdAndName, getAllDepartmentIdAndName } from '@/libs/action';
import SelectBox from '@/components/SelectBox';
import ImageInput from './ImageInput';

interface TicketFormProps {
    setShowForm: (value: boolean) => void;
    setTickets: Dispatch<SetStateAction<TicketWithRelations[]>>;
    updateID: string | null;
    setUpdateID: Dispatch<SetStateAction<string | null>>

}

const emptyForm = {
    title: '',
    description: '',
    departmentId: '',
    categoryId: '',
    subcategoryId: '',
    priority: 'MEDIUM',
};

export default function TicketForm({
    setShowForm,
    setTickets,
    updateID,
    setUpdateID
}: TicketFormProps) {
    const [form, setForm] = useState(emptyForm);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string | null }>({});
    const [categories, setCategories] = useState<{ id: string; name: string, subcategories?: { id: string; name: string }[]; }[]>([]);
    const [subcategories, setSubcategories] = useState<{ id: string; name: string }[]>([]);
    const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
    const [images, setImages] = useState<File[]>([]);


    const [existingImages, setExistingImages] = useState<{ id: string; url: string }[]>([]);
    // const [newImages, setNewImages] = useState<File[]>([]);

    useEffect(() => {
        // Fetch categories and departments once
        const fetchData = async () => {
            const cats = await getAllCategoryIdAndName();
            const depts = await getAllDepartmentIdAndName();

            setCategories(cats);
            setDepartments(depts);

        };
        fetchData();
    }, []);
    useEffect(() => {
        const selectedCat = categories.find(c => c.id === form.categoryId);
        setSubcategories(selectedCat?.subcategories || []);

        // တစ်ခါလောက်သာ reset လုပ်ချင်ရင်
        if (!updateID) {  // updateID မရှိရင် create mode
            setForm(prev => ({ ...prev, subcategoryId: '' }));
        }
    }, [form.categoryId, categories, updateID]);


    useEffect(() => {
        if (updateID) {
            getTicket(updateID).then((data) => {
                if (data) {
                    setForm({
                        title: data.title ?? '',
                        description: data.description ?? '',
                        categoryId: data.categoryId ?? '',
                        departmentId: data.departmentId ?? '',
                        subcategoryId: data.subcategoryId ?? '',
                        priority: data.priority ?? 'MEDIUM',
                    });


                    setExistingImages(data.images || [])
                }
            });
        } else {
            setForm(emptyForm);
        }
    }, [updateID]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: null }));
    };


    const handleCategoryChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { value } = e.target;

        // category value update
        setForm(prev => ({
            ...prev,
            categoryId: value,
            subcategoryId: '' // category ပြောင်းတိုင်း subcategory reset
        }));

        // subcategories update
        const selectedCat = categories.find(c => c.id === value);
        setSubcategories(selectedCat?.subcategories || []);
    };


    const handleCancel = () => {
        Swal.fire({
            title: 'Are you sure?',
            text: 'Any unsaved changes will be lost.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, close it',
            cancelButtonText: 'No, keep editing',
        }).then((result) => {
            if (result.isConfirmed) {
                setShowForm(false);
            }
        });
        setUpdateID(null)
    };

    const validate = () => {
        const newErrors: { [key: string]: string } = {};
        if (!form.title.trim()) newErrors.title = 'Title is required';
        if (!form.description.trim()) newErrors.description = 'Description is required';
        if (!form.categoryId) newErrors.categoryId = 'Category is required';
        if (!form.departmentId) newErrors.departmentId = 'DepartmentId is required';
        if (!form.subcategoryId) newErrors.subcategoryId = 'SubcategoryId is required';
        if (!form.priority) newErrors.priority = 'Priority is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };


    const uploadImages = async (files: FileList | File[]) => {
        const formData = new FormData();
        Array.from(files).forEach((file) => {
            formData.append('file', file);
        });

        const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
        });

        const data = await res.json();
        return data.urls as string[]; // returned URLs from your upload API
    };






    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!validate()) return;

        setLoading(true);

        try {
            // 1. Upload images and get their URLs
            const imageUrls = await uploadImages(images);
            // console.log(imageUrls, "images uploaded");

            // 2. Create FormData and append form fields
            const formData = new FormData();
            Object.entries(form).forEach(([key, value]) => {
                formData.append(key, value);
            });

            // 3. Append image URLs as JSON string (your backend should parse this accordingly)


            // 4. Call your create or update API function with FormData
            let response;
            if (updateID) {

                formData.append("newImages", JSON.stringify(imageUrls));
                formData.append('existingImageIds', JSON.stringify(existingImages.map(i => i.id)))
                response = await updateTicket(formData, updateID);
            } else {

                formData.append("images", JSON.stringify(imageUrls));
                response = await createTicket(formData);
            }

            // 5. If success, update local tickets state and notify user
            if (response.success) {



                if (updateID) {
                    setTickets((prev) =>
                        prev.map((ticket) => (ticket.id === updateID ? response.data : ticket))
                    );
                    Swal.fire("Success", "Ticket updated successfully!", "success");
                } else {
                    setTickets((prev) => [response.data, ...prev]);
                    Swal.fire("Success", "Ticket created successfully!", "success");
                }
                setShowForm(false);
                // setUpdateID(null);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Something went wrong.";
            Swal.fire({
                title: "Error",
                text: message,
                icon: "error",
                confirmButtonColor: "#ef4444",
                customClass: {
                    popup: "rounded-lg p-6",
                    confirmButton: "bg-red-500 text-white px-4 py-2 rounded text-sm hover:bg-red-600",
                },
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {loading && <Loading />}
            <section
                className="w-screen fixed top-0 left-0 flex justify-center min-h-screen overflow-auto h-screen items-center backdrop-blur-lg z-50"
                aria-modal="true"
                role="dialog"
            >
                <div
                    className="w-full h-full  fixed top-0 left-0 bg-black opacity-20"
                    onClick={handleCancel}
                    aria-hidden="true"
                />



                <form
                    onSubmit={handleSubmit}
                    className="w-[90%] md:w-[700px] rounded-2xl  zoom-in border border-gray-200  bg-white z-50"
                    onClick={(e) => e.stopPropagation()}
                    noValidate
                >
                    <div className="px-5 py-4 sm:px-6 sm:py-5">
                        <h1 className="text-2xl font-bold mb-3 mt-5">
                            {updateID ? 'Update Ticket' : 'Create New Ticket'}
                        </h1>
                        <p className="text-gray-500 text-sm mb-3">
                            {updateID ? 'Update ticket details' : 'Fill out the form to create a ticket'}
                        </p>
                    </div>

                    <section className="p-5 space-y-6 border-t max-h-[80vh] overflow-y-auto border-gray-100 sm:p-6">
                        {/* Title */}

                        <Input
                            id="title"
                            name="title"
                            placeholder="Enter ticket title"
                            value={form.title}
                            onChange={handleChange}
                            error={!!errors.title}
                            aria-invalid={!!errors.title}
                            aria-describedby={errors.title ? 'title-error' : undefined}
                            label='Title'
                            errorMessage={errors.title ? errors.title : ""}
                            disable={loading}
                            require={true}
                        />



                        {/* Description */}
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                            </label>
                            <textarea
                                id="description"
                                name="description"
                                rows={4}
                                placeholder="Enter ticket description"
                                value={form.description}
                                onChange={handleChange}
                                className={`w-full rounded-lg border ${errors.description ? "border-red-500" : "border-gray-300"} bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300/50
                                    }`}
                                aria-invalid={!!errors.description}
                                aria-describedby={errors.description ? 'description-error' : undefined}
                            />
                            {errors.description && (
                                <p id="description-error" className="text-red-600 text-sm mt-1">
                                    {errors.description}
                                </p>
                            )}
                        </div>
                        {/* Department */}
                        <SelectBox
                            label="Department"
                            id="departmentId"
                            name="departmentId"
                            value={form.departmentId}
                            options={departments}  // departments is [{ id, name }]
                            onChange={handleChange}
                            error={errors.departmentId}
                            placeholder="Select Department"
                        />


                        <div className='grid grid-cols-2 gap-3'>


                            {/* Category */}
                            <SelectBox
                                label="Category"
                                id="categoryId"
                                name="categoryId"
                                value={form.categoryId}
                                options={categories}  // categories is [{ id, name }]
                                onChange={handleCategoryChange}
                                error={errors.categoryId}
                                placeholder="Select Category"
                            />

                            {/* setSubcategories */}
                            <SelectBox
                                label="Subcategory"
                                id="subcategoryId"
                                name="subcategoryId"
                                value={form.subcategoryId}
                                options={subcategories}  // setSubcategories state ကိုသုံး
                                onChange={handleChange}
                                error={errors.subcategoryId}
                                placeholder="Select Subcategory"
                                disabled={!form.categoryId}  // categoryId မရှိရင် ပိတ်ထားမယ်
                            />
                        </div>
                        {/* Priority */}
                        <SelectBox
                            label="Priority"
                            id="priority"
                            name="priority"
                            value={form.priority}
                            options={[
                                { id: 'LOW', name: 'Low' },
                                { id: 'MEDIUM', name: 'Medium' },
                                { id: 'HIGH', name: 'High' },
                                { id: 'URGENT', name: 'Urgent' },
                            ]}
                            onChange={handleChange}
                            error={errors.priority}
                            placeholder="Select Priority"
                        />





                        <ImageInput images={images} setImages={setImages} existingImages={existingImages} setExistingImages={setExistingImages} />




                        {/* Buttons */}
                        <div className="mt-6 flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="px-4 py-3 text-sm font-medium border border-gray-300 rounded-lg text-gray-800 hover:bg-gray-100 h-[44px]"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className={`px-4 py-3 text-sm font-medium text-white rounded-lg shadow-md h-[44px] ${loading ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-600'
                                    }`}
                            >
                                {loading ? (updateID ? 'Updating...' : 'Creating...') : updateID ? 'Update Ticket' : 'Create Ticket'}
                            </button>
                        </div>
                    </section>
                </form>

            </section>
        </>
    );
}
