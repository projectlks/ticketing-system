"use client";

import { useEffect, useState, useTransition } from "react";
import { getMailSetting, saveMailSetting, getUsersEmails } from "./action";
import SelectBox, { Option } from "@/components/SelectBox";

export default function MailSettingPage() {
    const [emails, setEmails] = useState<string[]>([]);
    const [selectedEmail, setSelectedEmail] = useState("");
    const [options, setOptions] = useState<Option[]>([]);
    const [isPending, startTransition] = useTransition();

    // fetch saved mail settings
    useEffect(() => {
        startTransition(async () => {
            const data = await getMailSetting();
            setEmails(data);
        });
    }, []);

    // fetch ticket system user emails for SelectBox
    useEffect(() => {
        startTransition(async () => {
            const users = await getUsersEmails();
            setOptions(users);
        });
    }, []);

    const handleAdd = () => {
        if (!selectedEmail) return;
        if (emails.includes(selectedEmail)) return alert("Email already added");

        setEmails((prev) => [...prev, selectedEmail]);
        setSelectedEmail("");
    };

    const handleRemove = (index: number) => {
        setEmails((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        startTransition(async () => {
            const res = await saveMailSetting(emails);
            if (res.success) alert("✅ Saved successfully!");
            else alert("❌ Failed to save.");
        });
    };

    // filter options to remove already added emails
    const availableOptions = options.filter(opt => !emails.includes(opt.email || opt.name));

    return (
        <div className="p-6 max-w-lg mx-auto bg-white shadow-md rounded-2xl mt-10">
            <h1 className="text-2xl font-semibold text-center mb-4">Mail Settings</h1>

            <div className="space-y-3">
                {emails.map((email, index) => (
                    <div
                        key={index}
                        className="flex justify-between items-center border rounded-md p-2"
                    >
                        <span>{email}</span>
                        <button
                            onClick={() => handleRemove(index)}
                            className="text-red-500 hover:text-red-700"
                        >
                            ✕
                        </button>
                    </div>
                ))}

                <div className="flex gap-2 items-end">
                    {/* SelectBox for ticket system users */}

                    <SelectBox
                        label="Requester Email"
                        id="requesterEmail"
                        name="requesterEmail"
                        value={selectedEmail}
                        options={availableOptions.map(user => ({
                            id: user.email!, // use email as the id/value
                            name: user.name,
                            email: user.email,
                        }))}
                        onChange={(e) => setSelectedEmail(e.target.value)}
                        placeholder="Select requester email"
                        showEmail={true}
                    />

                    <button
                        onClick={handleAdd}
                        className="bg-blue-500 text-white px-3 rounded-md hover:bg-blue-600"
                        disabled={!selectedEmail}
                    >
                        Add
                    </button>
                </div>
            </div>

            <button
                onClick={handleSave}
                disabled={isPending}
                className="w-full bg-green-500 text-white mt-5 py-2 rounded-md hover:bg-green-600"
            >
                {isPending ? "Saving..." : "Save Changes"}
            </button>
        </div>
    );
}
