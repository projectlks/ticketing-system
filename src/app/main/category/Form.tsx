'use client';

import Input from '@/components/Input';
import React, { Dispatch, SetStateAction, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { CategoryWithRelations } from './page';
import { createCategory, getCategory, updateCategory } from './action';
import Loading from '@/components/Loading';
import Button from '@/components/Button';

interface AccountCreateFormProps {
    setShowForm: (value: boolean) => void;
    setCategories: Dispatch<SetStateAction<CategoryWithRelations[]>>
    updateID: string | null;
    setUpdateID: Dispatch<SetStateAction<string | null>>
}

export default function Form({ setShowForm, setCategories, updateID, setUpdateID }: AccountCreateFormProps) {
    const [errors, setErrors] = useState({
        name: '',
        response: null as string | null,
    });

    const [loading, setLoading] = useState(false);
    const [newSubCategory, setNewSubCategory] = useState<string>("");
    const [subCategories, setSubCategories] = useState<{ id?: string; title: string }[]>([]);

    const addSubCategories = () => {
        if (!newSubCategory.trim()) return;
        setSubCategories(prev => [{ title: newSubCategory.trim() }, ...prev]);
        setNewSubCategory("");
    };

    // Remove job
    // const removeSubCategories = (index: number) => {
    //     setSubCategories(prev => prev.filter((_, i) => i !== index));
    // };

    // Update job title inline
    const updateSubCategories = (index: number, newTitle: string) => {
        setSubCategories(prev => prev.map((job, i) => i === index ? { ...job, title: newTitle } : job));
    };


    const emptyForm = {
        name: '',
    };

    const [form, setForm] = useState(emptyForm);
    const [initialForm, setInitialForm] = useState(emptyForm);
    useEffect(() => {
        if (updateID) {
            const getData = async () => {
                const categories = await getCategory(updateID);

                // Normalize properties to string with defaults
                const normalizedData = {
                    name: categories?.name ?? '',
                };
                setForm(normalizedData);
                setInitialForm(normalizedData);
                console.log(categories?.subcategories)

                // ✅ Correct property name
                if (categories?.subcategories?.length) {
                    const normalizedSubs = categories.subcategories.map(sub => ({
                        id: sub.id,
                        title: sub.name,
                    }));
                    setSubCategories(normalizedSubs);
                } else {
                    setSubCategories([]);
                }
            };

            getData();
        } else {
            setForm(emptyForm);
            setInitialForm(emptyForm);
            setSubCategories([]);
        }
    }, [updateID]);



    // const selectRef = useRef<HTMLSelectElement>(null);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: '', response: null }));
    };

    // Check if form has unsaved changes
    const isFormDirty = () => {
        return (
            form.name.trim() !== initialForm.name.trim()
        );
    };

    // Confirm cancel if form dirty
    const handleCancel = () => {
        if (isFormDirty()) {
            Swal.fire({
                title: 'Are you sure?',
                text: 'You have unsaved changes. Closing the form will lose them.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#6b7280',
                confirmButtonText: 'Yes, close it',
                cancelButtonText: 'No, keep editing',
                customClass: {
                    popup: 'rounded-lg p-6',
                    confirmButton: 'bg-red-500 text-white px-4 py-2 rounded text-sm hover:bg-red-600',
                    cancelButton: 'bg-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-400',
                },
            }).then((result) => {
                if (result.isConfirmed) {
                    setShowForm(false);
                    setUpdateID(null)
                }
            });
        } else {
            setShowForm(false);
            setUpdateID(null)
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setErrors({ name: '', response: null });

        // Validate form
        let isValid = true;
        const newErrors = { name: '', response: null };

        if (!form.name.trim()) {
            newErrors.name = 'Name is required.';
            isValid = false;
        }



        if (!isValid) {
            setErrors(newErrors);
            setLoading(false);
            return;
        }

        const formData = new FormData(e.currentTarget);

        try {
            if (updateID) {
                const { success, data } = await updateCategory(formData, updateID, subCategories);

                if (success) {
                    setCategories((prev) => prev.map((item) => (item.id === updateID ? data : item)));


                    Swal.fire({
                        title: 'Success',
                        text: 'Category updated successfully!',
                        icon: 'success',
                        confirmButtonColor: '#6366f1',
                        customClass: {
                            popup: 'rounded-lg p-6',
                            confirmButton: 'bg-indigo-500 text-white px-4 py-2 rounded text-sm hover:bg-indigo-600',
                        },
                    });
                }
            }



            else {
                const { success, data }: { success: boolean, data: CategoryWithRelations } = await createCategory(formData, subCategories);

                if (success) {
                    setCategories((prev: CategoryWithRelations[]) => [data, ...prev]);

                    Swal.fire({
                        title: 'Success',
                        text: 'Category created successfully!',
                        icon: 'success',
                        confirmButtonColor: '#6366f1',
                        customClass: {
                            popup: 'rounded-lg p-6',
                            confirmButton: 'bg-indigo-500 text-white px-4 py-2 rounded text-sm hover:bg-indigo-600',
                        },
                    });
                }
            }

            setShowForm(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Something went wrong.';
            setErrors((prev) => ({ ...prev, response: message }));

            Swal.fire({
                title: 'Error',
                text: message,
                icon: 'error',
                confirmButtonColor: '#ef4444',
                customClass: {
                    popup: 'rounded-lg p-6',
                    confirmButton: 'bg-red-500 text-white px-4 py-2 rounded text-sm hover:bg-red-600',
                },
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>

            {loading && <Loading />}
            <section className="w-screen fixed top-0 left-0 flex justify-center min-h-screen overflow-auto h-screen items-center backdrop-blur-lg z-50">
                <div
                    className="w-full h-full fixed top-0 left-0 bg-black opacity-20"
                    onClick={handleCancel}
                    aria-hidden="true"
                />

                <form
                    onSubmit={handleSubmit}
                    className="w-[90%] md:w-[600px] rounded-2xl border border-gray-200 bg-white z-50"
                    onClick={(e) => e.stopPropagation()}
                    noValidate
                >
                    <div className="px-5 py-4 sm:px-6 sm:py-5">
                        <h1 className="text-2xl text-gray-800 font-bold mb-3 mt-5">
                            {updateID ? "Update Category" : "Add New Category"}
                        </h1>
                        <p className="text-gray-500 text-sm font-semibold">
                            Effortlessly manage your categories: {updateID ? "update existing details" : "add a new category"}.
                        </p>
                    </div>

                    <section className="p-5 space-y-6 border-t border-gray-100 sm:p-6">
                        {/* Name */}

                        <Input
                            id="name"
                            name="name"
                            placeholder="Enter category name"
                            value={form.name}
                            onChange={handleChange}
                            error={!!errors.name}
                            aria-invalid={!!errors.name}
                            aria-describedby={errors.name ? 'name-error' : undefined}
                            disable={loading}
                            errorMessage={errors.name}
                            label='Category Name'
                            require={true}
                        />

                        {/* Job Positions */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Sub categories
                            </label>

                            {/* Input for adding new job */}
                            <div className="flex space-x-2 items-center mb-3">
                                <input
                                    type="text"
                                    placeholder="SubCategory name"
                                    value={newSubCategory}
                                    onChange={(e) => setNewSubCategory(e.target.value)}
                                    className="flex-1 border rounded-lg px-3 py-2 text-sm border-gray-300 text-gray-800 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300/50"
                                />

                                <Button click={addSubCategories} buttonLabel="Add" disabled={!newSubCategory?.trim()} />

                            </div>

                            {/* Job list */}
                            {subCategories.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2 border border-gray-300 rounded-xl p-3">
                                    {subCategories.map((job, idx) => (
                                        <div key={job.id ?? idx} className="flex flex-col">
                                            <div className="flex items-center w-fit space-x-2 bg-gray-100 border border-gray-300 rounded-full px-3 py-1 pr-1 text-sm relative">
                                                {/* Inline editable title */}
                                                <input
                                                    type="text"
                                                    value={job.title}
                                                    onChange={(e) => updateSubCategories(idx, e.target.value)}
                                                    onBlur={() => {
                                                        // Trim the value
                                                        const trimmed = job.title.trim();
                                                        if (trimmed === "") return; // leave error visible
                                                        updateSubCategories(idx, trimmed);
                                                    }}
                                                    className={`bg-transparent border-none text-sm text-gray-800 focus:outline-none w-auto min-w-[10px] ${job.title.trim() === "" ? "border-b-2 border-red-500" : ""
                                                        }`}
                                                />

                                                {/* Delete button */}
                                                {/* <button
                                                    type="button"
                                                    onClick={() => removeSubCategories(idx)}
                                                    className="text-red-500 hover:text-red-700 cursor-pointer hover:bg-red-300 rounded-full p-1"
                                                >
                                                    <XMarkIcon className="w-4 h-4" />
                                                </button> */}
                                            </div>

                                            {/* Inline error message */}
                                            {job.title.trim() === "" && (
                                                <span className="text-red-500 text-xs mt-1 ml-1">
                                                    subcategories name cannot be empty
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}




                        </div>


                        {/* General Error */}
                        {errors.response && (
                            <p className="text-red-500 text-xs mb-4" role="alert" aria-live="assertive">
                                {errors.response}
                            </p>
                        )}

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
                                className={`px-4 py-3 text-sm font-medium text-white rounded-lg shadow-md h-[44px] ${loading
                                    ? 'bg-indigo-300 cursor-not-allowed'
                                    : 'bg-indigo-500 hover:bg-indigo-600'
                                    }`}
                            >
                                {loading
                                    ? updateID
                                        ? 'Updating...'
                                        : 'Creating...'
                                    : updateID
                                        ? 'Update Category'
                                        : 'Create Category'}
                            </button>
                        </div>
                    </section>
                </form>
            </section>
        </>
    );
}
