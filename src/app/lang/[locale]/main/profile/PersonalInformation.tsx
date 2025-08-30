"use client"

import Input from "@/components/Input";
import { JSX, ReactNode, useState } from "react";
import { changePassword } from "./action";
import Loading from "@/components/Loading";
import Swal from "sweetalert2";
import { UserFullData } from "./page";
import { useTranslations } from "next-intl";

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
    const t = useTranslations("personal"); // translations namespace
    const [openChangePasswordModal, setChangePasswordModal] = useState(false);

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState<boolean>(false);

    const [errors, setErrors] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
        generalError: ""
    });

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const newErrors = { currentPassword: "", newPassword: "", confirmPassword: "", generalError: "" };
        let hasError = false;

        if (!currentPassword) { newErrors.currentPassword = `${t("currentPassword")} is required.`; hasError = true; }
        if (newPassword.length < 8) { newErrors.newPassword = `${t("newPassword")} must be at least 8 characters.`; hasError = true; }
        if (confirmPassword.length < 8) { newErrors.confirmPassword = `${t("confirmPassword")} must be at least 8 characters.`; hasError = true; }
        if (currentPassword === newPassword) { newErrors.newPassword = `${t("newPassword")} cannot be same as current.`; hasError = true; }
        if (newPassword !== confirmPassword) { newErrors.confirmPassword = `${t("confirmPassword")} do not match.`; hasError = true; }

        setErrors(newErrors);
        if (hasError) return;

        try {
            setLoading(true);
            await changePassword(currentPassword, newPassword, data.id);
            setChangePasswordModal(false);
            setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");

            Swal.fire({
                icon: 'success',
                title: t("passwordChanged"),
                text: t("passwordChangedText"),
                timer: 2000,
                showConfirmButton: false
            });
        } catch (err) {
            if (err instanceof Error) setErrors(prev => ({ ...prev, generalError: err.message }));
            else setErrors(prev => ({ ...prev, generalError: "An unknown error occurred" }));
        } finally { setLoading(false); }
    };

    return (
        <>
            {loading && <Loading />}
            <div className="p-5 mb-6 border border-gray-200 rounded-2xl lg:p-6">
                <h4 className="text-lg font-semibold text-gray-800 lg:mb-6">{t("personalInfo")}</h4>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
                    <div><p className="mb-2 text-xs text-gray-500">{t("name")}</p><p className="text-sm font-medium text-gray-800">{data.name}</p></div>
                    <div><p className="mb-2 text-xs text-gray-500">{t("role")}</p><p className="text-sm font-medium text-gray-800">{data.role}</p></div>
                    <div><p className="mb-2 text-xs text-gray-500">{t("workEmail")}</p><p className="text-sm font-medium text-gray-800">{data.email}</p></div>
                    <div><p className="mb-2 text-xs text-gray-500">{t("personalEmail")}</p><p className="text-sm font-medium text-gray-800">{data.personalEmail}</p></div>
                    <div><p className="mb-2 text-xs text-gray-500">{t("workPhone")}</p><p className="text-sm font-medium text-gray-800">{data.workMobile || "N/A"}</p></div>
                    <div><p className="mb-2 text-xs text-gray-500">{t("personalPhone")}</p><p className="text-sm font-medium text-gray-800">{data.personalPhone || "N/A"}</p></div>

                    <div className="col-span-2">
                        <button onClick={() => setChangePasswordModal(true)}
                            className="mt-2 text-sm border cursor-pointer border-gray-300 rounded px-4 py-2 hover:bg-gray-100">
                            {t("changePassword")}
                        </button>
                    </div>
                </div>
            </div>

            {openChangePasswordModal && (
                <Modal title={t("changePassword")} onSubmit={handleSubmit} onClose={() => setChangePasswordModal(false)}>
                    <div className="space-y-4">
                        <Input label={t("currentPassword")} id="current_password" name="current_password" placeholder={t("enterCurrentPassword")} type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} require={true} error={!!errors.currentPassword} errorMessage={errors.currentPassword} disable={false} />
                        <Input label={t("newPassword")} id="new_password" name="new_password" placeholder={t("enterNewPassword")} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} require={true} error={!!errors.newPassword} errorMessage={errors.newPassword} disable={false} />
                        <Input label={t("confirmPassword")} id="confirm_password" name="confirm_password" placeholder={t("confirmNewPassword")} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} require={true} error={!!errors.confirmPassword} errorMessage={errors.confirmPassword} disable={false} />
                    </div>
                </Modal>
            )}
        </>
    );
}
