"use client"

import { useEffect, useState } from "react"

import { XMarkIcon } from "@heroicons/react/24/outline"



export function MailSettingsForm( ) {
    const [savedEmails, setSavedEmails] = useState<string[]>([])
    const [selectedEmail, setSelectedEmail] = useState("")
    const [availableEmails, setAvailableEmails] = useState()
    const [isSaving, setIsSaving] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchSavedEmails = async () => {
            setIsLoading(true)
            // Replace with: const data = await getMailSetting()
            await new Promise((resolve) => setTimeout(resolve, 500))
            setSavedEmails(["john@example.com"]) // Mock data
            setIsLoading(false)
        }
        fetchSavedEmails()
    }, [])

    useEffect(() => {
        const fetchAvailableEmails = async () => {
            // Replace with: const users = await getUsersEmails()
            await new Promise((resolve) => setTimeout(resolve, 500))
            setAvailableEmails(mockAvailableEmails)
        }
        fetchAvailableEmails()
    }, [])

    const filteredOptions = availableEmails.filter((user) => !savedEmails.includes(user.email))

    const handleAdd = () => {
        if (!selectedEmail) return
        if (savedEmails.includes(selectedEmail)) {
            alert("Email already added")
            return
        }
        setSavedEmails((prev) => [...prev, selectedEmail])
        setSelectedEmail("")
    }

    const handleRemove = (email: string) => {
        setSavedEmails((prev) => prev.filter((e) => e !== email))
    }

    const handleSave = async () => {
        setIsSaving(true)
        // Replace with: const res = await saveMailSetting(savedEmails)
        await new Promise((resolve) => setTimeout(resolve, 1000))
        console.log("Saving emails:", savedEmails)
        setIsSaving(false)
        alert("✅ Saved successfully!")
    }

    if (isLoading) {
        return (
            <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-6">
                <div className="text-center text-gray-600 dark:text-gray-400">Loading...</div>
            </div>
        )
    }

    return (
        <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Mail Settings</h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Select and manage email addresses for notifications
                </p>
            </div>

            <div className="p-6 space-y-6">
                <div className="space-y-3">
                    <label className="block text-base font-medium text-gray-900 dark:text-gray-100">
                        Selected Email Addresses
                    </label>
                    {savedEmails.length === 0 ? (
                        <div className="text-sm text-gray-500 dark:text-gray-500 py-4 text-center border border-dashed border-gray-300 dark:border-gray-700 rounded-md">
                            No emails selected yet
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {savedEmails.map((email) => (
                                <div
                                    key={email}
                                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-md"
                                >
                                    <span className="text-gray-900 dark:text-gray-100">{email}</span>
                                    <button
                                        type="button"
                                        onClick={() => handleRemove(email)}
                                        className="shrink-0 p-1 text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                                    >
                                        <XMarkIcon className="h-4 w-4" />
                                        <span className="sr-only">Remove {email}</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="space-y-3">
                    <label htmlFor="email-select" className="block text-base font-medium text-gray-900 dark:text-gray-100">
                        Add Email Address
                    </label>
                    <div className="flex gap-2">
                        <select
                            id="email-select"
                            value={selectedEmail}
                            onChange={(e) => setSelectedEmail(e.target.value)}
                            className="flex-1 px-3 py-2 bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-md text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent"
                        >
                            <option value="">Select an email...</option>
                            {filteredOptions.map((user) => (
                                <option key={user.id} value={user.email}>
                                    {user.name} ({user.email})
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={handleAdd}
                            disabled={!selectedEmail}
                            className="shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 dark:bg-blue-600 dark:hover:bg-blue-700 dark:disabled:bg-blue-800 text-white rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 disabled:cursor-not-allowed"
                        >
                            Add
                        </button>
                    </div>
                </div>

                <div className="pt-4">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 dark:bg-green-600 dark:hover:bg-green-700 dark:disabled:bg-green-800 text-white rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-600 disabled:cursor-not-allowed"
                    >
                        {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    )
}
