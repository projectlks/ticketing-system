"use client";

import { useEffect, useState, useTransition } from "react";
import { getMailSetting, saveMailSetting, getUsersEmails } from "./action";
import SelectBox, { Option } from "@/components/SelectBox";
import { TrashIcon } from "@heroicons/react/24/outline";

export default function MailSettingPage() {
    const [emails, setEmails] = useState<string[]>([]);
    const [selectedEmail, setSelectedEmail] = useState("");
    const [options, setOptions] = useState<Option[]>([]);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        startTransition(async () => {
            const data = await getMailSetting();
            setEmails(data);
        });
    }, []);

    useEffect(() => {
        startTransition(async () => {
            const users = await getUsersEmails();
            setOptions(users);
        });
    }, []);

    const handleAdd = () => {
        if (!selectedEmail || emails.includes(selectedEmail)) return;
        setEmails((prev) => [...prev, selectedEmail]);
        setSelectedEmail("");
    };

    const handleRemove = (index: number) => {
        setEmails((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        startTransition(async () => {
            const res = await saveMailSetting(emails);
            alert(res.success ? "✅ Saved successfully!" : "❌ Failed to save.");
        });
    };

    const availableOptions = options.filter(
        (opt) => !emails.includes(opt.email || opt.name)
    );

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
                <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                        Mail Settings
                    </h2>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Select and manage email addresses for notifications
                    </p>
                </div>

                <div className="p-6 space-y-6">
                    {/* Selected Emails */}
                    <div className="space-y-3">
                        <label className="block text-base font-medium text-gray-900 dark:text-gray-100">
                            Selected Email Addresses
                        </label>

                        {emails.length === 0 ? (
                            <div className="text-sm text-gray-500 py-4 text-center border border-dashed border-gray-300 dark:border-gray-700 rounded-md">
                                No emails selected yet
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {emails.map((email, index) => (
                                    <div
                                        key={email}
                                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-md"
                                    >
                                        <span className="text-gray-900 dark:text-gray-100">
                                            {email}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemove(index)}
                                            className="p-1 text-red-600 hover:bg-red-50 dark:text-red-500 dark:hover:bg-red-950 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                            <span className="sr-only">Remove {email}</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Add Email */}
                    <div className="space-y-3">
                        <label
                            htmlFor="email-select"
                            className="block text-base font-medium text-gray-900 dark:text-gray-100"
                        >
                            Add Email Address
                        </label>
                        <div className="flex items-end-safe gap-2">
                            <div className="flex-1">
                                <SelectBox
                                    label="Email for Ticket Creation Notifications"

                                    id="requesterEmail"
                                    name="requesterEmail"
                                    value={selectedEmail}
                                    options={availableOptions.map((user) => ({
                                        id: user.email!,
                                        name: user.name,
                                        email: user.email,
                                    }))}
                                    onChange={(e) => setSelectedEmail(e.target.value)}
                                    placeholder="Select requester email"
                                    showEmail={true}

                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleAdd}
                                disabled={!selectedEmail}
                                className="shrink-0 px-4 py-2 h-9 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed"
                            >
                                Add
                            </button>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="pt-4">
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isPending}
                            className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-green-500 disabled:cursor-not-allowed"
                        >
                            {isPending ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
