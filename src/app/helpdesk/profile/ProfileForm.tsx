"use client";

import {
  ArrowPathIcon,
  ArrowUpTrayIcon,
  EyeIcon,
  EyeSlashIcon,
  ExclamationTriangleIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useCallback, useEffect, useMemo, useState } from "react";
import { type FileRejection, useDropzone } from "react-dropzone";
import { toast } from "react-toastify";
import { z } from "zod";

import Avatar from "@/components/Avatar";
import { useUserData } from "@/context/UserProfileContext";
import { formatMyanmarDateTime } from "@/libs/myanmar-date-time";

import type { MyAccountProfile } from "./action";
import { updateMyAccountPassword, updateMyAccountProfile } from "./action";

const MAX_PROFILE_IMAGE_SIZE_BYTES = 1024 * 1024; // 1MB
const ACCEPTED_PROFILE_IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;
const ACCEPTED_PROFILE_IMAGE_MAP: Record<(typeof ACCEPTED_PROFILE_IMAGE_MIME_TYPES)[number], []> =
  {
    "image/png": [],
    "image/jpeg": [],
    "image/webp": [],
  };

const ProfileFormSchema = z.object({
  name: z.string().trim().min(5, "Name must be at least 5 characters").max(100),
});

type ProfileFormValues = z.infer<typeof ProfileFormSchema>;
type ProfileFormErrors = Partial<Record<keyof ProfileFormValues, string>>;

const PasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });

type PasswordFormValues = z.infer<typeof PasswordFormSchema>;
type PasswordFormErrors = Partial<Record<keyof PasswordFormValues, string>>;
type ProfileFormProps = {
  initialProfile: MyAccountProfile;
};

type PersistedProfileState = {
  name: string;
  profileUrl: string | null;
  updatedAt: Date;
};

const inputClass =
  "h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200";

const readonlyInputClass =
  "h-10 w-full cursor-not-allowed rounded-lg border border-zinc-200 bg-zinc-100 px-3 text-sm text-zinc-500";

function formatRole(role: string) {
  return role.replaceAll("_", " ");
}

function extractUploadFilename(url: string): string | null {
  const prefix = "/api/uploads/";
  if (!url.startsWith(prefix)) return null;

  const fileName = url.slice(prefix.length).trim();
  if (!fileName) return null;
  return fileName;
}

function getDropzoneErrorMessage(rejection: FileRejection): string {
  const firstError = rejection.errors[0];
  if (!firstError) return "Invalid file.";

  if (firstError.code === "file-too-large") {
    return `${rejection.file.name} is larger than 1MB.`;
  }
  if (firstError.code === "file-invalid-type") {
    return `${rejection.file.name} has unsupported format (PNG/JPG/WEBP only).`;
  }

  return `${rejection.file.name}: ${firstError.message}`;
}

async function uploadProfileImage(file: File): Promise<string> {
  const payload = new FormData();
  payload.append("file", file);

  const response = await fetch("/api/uploads", {
    method: "POST",
    body: payload,
  });

  const responseData = (await response.json()) as { urls?: string[]; message?: string };
  if (!response.ok || !responseData.urls?.length) {
    throw new Error(responseData.message ?? "Failed to upload profile image.");
  }

  return responseData.urls[0];
}

async function deleteUploadedFileByUrl(url: string): Promise<void> {
  const fileName = extractUploadFilename(url);
  if (!fileName) return;

  await fetch(`/api/uploads/${fileName}`, { method: "DELETE" });
}

export default function ProfileForm({ initialProfile }: ProfileFormProps) {
  const { setUserData } = useUserData();

  const [persistedProfile, setPersistedProfile] = useState<PersistedProfileState>({
    name: initialProfile.name,
    profileUrl: initialProfile.profileUrl,
    updatedAt: new Date(initialProfile.updatedAt),
  });
  const [name, setName] = useState(initialProfile.name);

  // stageImageFile/PreviewUrl သည် user မှရွေးထားသော်လည်း မသိမ်းရသေးသော image state ဖြစ်သည်။
  const [stagedImageFile, setStagedImageFile] = useState<File | null>(null);
  const [stagedImagePreviewUrl, setStagedImagePreviewUrl] = useState<string | null>(null);
  const [removeCurrentImage, setRemoveCurrentImage] = useState(false);

  const [errors, setErrors] = useState<ProfileFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverErrorMessage, setServerErrorMessage] = useState<string | null>(null);

  const [passwordForm, setPasswordForm] = useState<PasswordFormValues>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState<PasswordFormErrors>({});
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordErrorMessage, setPasswordErrorMessage] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    next: false,
    confirm: false,
  });

  const createdAtLabel = useMemo(
    () => formatMyanmarDateTime(initialProfile.createdAt),
    [initialProfile.createdAt],
  );
  const updatedAtLabel = useMemo(
    () => formatMyanmarDateTime(persistedProfile.updatedAt),
    [persistedProfile.updatedAt],
  );

  const hasPersistedImage = Boolean(persistedProfile.profileUrl);
  const hasStagedImage = Boolean(stagedImageFile);
  const effectiveProfileUrl =
    stagedImagePreviewUrl ?? (removeCurrentImage ? null : persistedProfile.profileUrl);

  const clearStagedImage = useCallback(() => {
    if (stagedImagePreviewUrl) {
      URL.revokeObjectURL(stagedImagePreviewUrl);
    }
    setStagedImageFile(null);
    setStagedImagePreviewUrl(null);
  }, [stagedImagePreviewUrl]);

  useEffect(() => {
    return () => {
      if (stagedImagePreviewUrl) {
        URL.revokeObjectURL(stagedImagePreviewUrl);
      }
    };
  }, [stagedImagePreviewUrl]);

  const stageImageFile = useCallback(
    (file: File) => {
      if (!ACCEPTED_PROFILE_IMAGE_MIME_TYPES.includes(file.type as (typeof ACCEPTED_PROFILE_IMAGE_MIME_TYPES)[number])) {
        toast.error("Only PNG, JPG, and WEBP images are allowed.");
        return;
      }

      if (file.size > MAX_PROFILE_IMAGE_SIZE_BYTES) {
        toast.error("Profile image must be under 1MB.");
        return;
      }

      if (stagedImagePreviewUrl) {
        URL.revokeObjectURL(stagedImagePreviewUrl);
      }

      const nextPreviewUrl = URL.createObjectURL(file);
      setStagedImageFile(file);
      setStagedImagePreviewUrl(nextPreviewUrl);
      setRemoveCurrentImage(false);
      setServerErrorMessage(null);
    },
    [stagedImagePreviewUrl],
  );

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      if (rejectedFiles.length > 0) {
        toast.error(getDropzoneErrorMessage(rejectedFiles[0]));
      }

      if (!acceptedFiles.length) return;
      stageImageFile(acceptedFiles[0]);
    },
    [stageImageFile],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: ACCEPTED_PROFILE_IMAGE_MAP,
    multiple: false,
    maxFiles: 1,
    maxSize: MAX_PROFILE_IMAGE_SIZE_BYTES,
    disabled: submitting,
  });

  const handleRemoveImage = () => {
    if (hasStagedImage) {
      clearStagedImage();
      return;
    }

    if (hasPersistedImage) {
      setRemoveCurrentImage(true);
    }
  };

  const handleUndoRemoveImage = () => {
    setRemoveCurrentImage(false);
  };

  const handleReset = () => {
    setName(persistedProfile.name);
    clearStagedImage();
    setRemoveCurrentImage(false);
    setErrors({});
    setServerErrorMessage(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerErrorMessage(null);

    const parsed = ProfileFormSchema.safeParse({ name });
    if (!parsed.success) {
      const fieldErrors: ProfileFormErrors = {};
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof ProfileFormValues;
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    let uploadedImageUrl: string | null = null;

    try {
      setSubmitting(true);

      let nextProfileUrl = removeCurrentImage ? "" : (persistedProfile.profileUrl ?? "");

      if (stagedImageFile) {
        uploadedImageUrl = await uploadProfileImage(stagedImageFile);
        nextProfileUrl = uploadedImageUrl;
      }

      const formData = new FormData();
      formData.append("name", parsed.data.name);
      formData.append("profileUrl", nextProfileUrl);

      const result = await updateMyAccountProfile(formData);
      if (result?.error || !result?.data) {
        if (uploadedImageUrl) {
          await deleteUploadedFileByUrl(uploadedImageUrl).catch(() => undefined);
        }

        const message = result?.error ?? "Failed to update profile.";
        setServerErrorMessage(message);
        toast.error(message);
        return;
      }

      const updated = result.data;
      const nextUpdatedAt = new Date(updated.updatedAt);

      setPersistedProfile({
        name: updated.name,
        profileUrl: updated.profileUrl,
        updatedAt: nextUpdatedAt,
      });
      setName(updated.name);
      clearStagedImage();
      setRemoveCurrentImage(false);
      setErrors({});

      setUserData({
        id: updated.id,
        name: updated.name,
        email: updated.email,
        profileUrl: updated.profileUrl,
      });

      toast.success("Profile updated successfully.");
    } catch (error) {
      // Upload အောင်မြင်ပြီး DB update fail ဖြစ်ခဲ့ရင် orphan file မကျန်စေဖို့ ပြန်ဖျက်သည်။
      if (uploadedImageUrl) {
        await deleteUploadedFileByUrl(uploadedImageUrl).catch(() => undefined);
      }

      const message = error instanceof Error ? error.message : "Failed to update profile.";
      setServerErrorMessage(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setPasswordErrorMessage(null);

    const parsed = PasswordFormSchema.safeParse(passwordForm);
    if (!parsed.success) {
      const fieldErrors: PasswordFormErrors = {};
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof PasswordFormValues;
        fieldErrors[field] = issue.message;
      });
      setPasswordErrors(fieldErrors);
      return;
    }

    try {
      setPasswordSubmitting(true);
      const formData = new FormData();
      formData.append("currentPassword", parsed.data.currentPassword);
      formData.append("newPassword", parsed.data.newPassword);
      formData.append("confirmPassword", parsed.data.confirmPassword);

      const result = await updateMyAccountPassword(formData);
      if (result?.error) {
        setPasswordErrorMessage(result.error);
        toast.error(result.error);
        return;
      }

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordErrors({});
      toast.success("Password updated successfully.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update password.";
      setPasswordErrorMessage(message);
      toast.error(message);
    } finally {
      setPasswordSubmitting(false);
    }
  };

  return (
    <section className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto w-full max-w-5xl space-y-3 px-4 py-4 sm:px-6 sm:py-5">
        <header className="rounded-2xl border border-zinc-200 bg-[radial-gradient(circle_at_12%_10%,#f5f5f5_0%,#ffffff_52%)] p-4 sm:p-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
            Account Center
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-zinc-900">
            My Profile
          </h1>
          <p className="mt-1 text-xs text-zinc-500">
            Update your display information. Email and role are locked by policy.
          </p>

          <div className="mt-4 flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3">
            <Avatar
              name={name}
              profileUrl={effectiveProfileUrl}
              size={48}
              className="border border-zinc-200"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-900">{name}</p>
              <p className="truncate text-xs text-zinc-500">{initialProfile.email}</p>
            </div>
          </div>
        </header>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5"
        >
          {serverErrorMessage && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{serverErrorMessage}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">
                Name
              </span>
              <input
                name="name"
                type="text"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setErrors((previous) => ({ ...previous, name: "" }));
                  setServerErrorMessage(null);
                }}
                className={`${inputClass} ${errors.name ? "border-red-400 focus:border-red-500 focus:ring-red-100" : ""}`}
                placeholder="Enter your name"
                autoComplete="name"
                disabled={submitting}
              />
              {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">
                Email
              </span>
              <input
                type="email"
                value={initialProfile.email}
                className={readonlyInputClass}
                disabled
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">
                Role
              </span>
              <input
                type="text"
                value={formatRole(initialProfile.role)}
                className={readonlyInputClass}
                disabled
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">
                Department
              </span>
              <input
                type="text"
                value={initialProfile.departmentName ?? "N/A"}
                className={readonlyInputClass}
                disabled
              />
            </label>

            <div className="space-y-2 sm:col-span-2">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">
                Profile Photo
              </p>

              <div
                {...getRootProps()}
                className={`rounded-xl border border-dashed p-4 transition-colors ${
                  isDragActive
                    ? "border-zinc-500 bg-zinc-100"
                    : "border-zinc-300 bg-zinc-50 hover:border-zinc-400"
                }`}
              >
                <input {...getInputProps()} />

                <div className="flex flex-col items-center gap-3 sm:flex-row">
                  <Avatar
                    name={name}
                    profileUrl={effectiveProfileUrl}
                    size={72}
                    className="border border-zinc-200"
                  />
                  <div className="text-center sm:text-left">
                    <p className="text-sm font-medium text-zinc-800">
                      Drop image here or click to upload
                    </p>
                    <p className="text-xs text-zinc-500">
                      PNG/JPG/WEBP only, maximum size 1MB, single image.
                    </p>
                    {hasStagedImage && (
                      <p className="mt-1 text-xs font-medium text-emerald-700">
                        New image selected. Save Profile to apply.
                      </p>
                    )}
                    {removeCurrentImage && !hasStagedImage && (
                      <p className="mt-1 text-xs font-medium text-amber-700">
                        Current profile image will be deleted after save.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => open()}
                  disabled={submitting}
                  className="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowUpTrayIcon className="h-4 w-4" />
                  {hasPersistedImage || hasStagedImage ? "Replace" : "Upload"}
                </button>

                <button
                  type="button"
                  onClick={handleRemoveImage}
                  disabled={submitting || (!hasPersistedImage && !hasStagedImage)}
                  className="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-red-200 bg-white px-3 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <TrashIcon className="h-4 w-4" />
                  Remove
                </button>

                {removeCurrentImage && hasPersistedImage && !hasStagedImage && (
                  <button
                    type="button"
                    onClick={handleUndoRemoveImage}
                    disabled={submitting}
                    className="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ArrowPathIcon className="h-4 w-4" />
                    Undo Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 border-t border-zinc-200 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-zinc-500">
              Created at: {createdAtLabel} | Last updated: {updatedAtLabel}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                disabled={submitting}
                className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-9 items-center justify-center rounded-md bg-zinc-900 px-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>
        </form>

        <form
          onSubmit={handlePasswordSubmit}
          className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5"
        >
          <div className="mb-3">
            <h2 className="text-sm font-semibold tracking-tight text-zinc-900">
              Change Password
            </h2>
            <p className="text-xs text-zinc-500">
              Use your current password and set a new one to keep your account secure.
            </p>
          </div>

          {passwordErrorMessage && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{passwordErrorMessage}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">
                Current Password
              </span>
              <div className="relative">
                <input
                  name="currentPassword"
                  type={showPasswords.current ? "text" : "password"}
                  autoComplete="current-password"
                  value={passwordForm.currentPassword}
                  onChange={(event) => {
                    setPasswordForm((previous) => ({
                      ...previous,
                      currentPassword: event.target.value,
                    }));
                    setPasswordErrors((previous) => ({ ...previous, currentPassword: "" }));
                    setPasswordErrorMessage(null);
                  }}
                  className={`${inputClass} pr-10 ${passwordErrors.currentPassword ? "border-red-400 focus:border-red-500 focus:ring-red-100" : ""}`}
                  placeholder="Enter current password"
                  disabled={passwordSubmitting}
                />
                <button
                  type="button"
                  onPointerDown={() =>
                    setShowPasswords((previous) => ({
                      ...previous,
                      current: true,
                    }))
                  }
                  onPointerUp={() =>
                    setShowPasswords((previous) => ({
                      ...previous,
                      current: false,
                    }))
                  }
                  onPointerLeave={() =>
                    setShowPasswords((previous) => ({
                      ...previous,
                      current: false,
                    }))
                  }
                  onPointerCancel={() =>
                    setShowPasswords((previous) => ({
                      ...previous,
                      current: false,
                    }))
                  }
                  onKeyDown={(event) => {
                    if (event.key === " " || event.key === "Enter") {
                      event.preventDefault();
                      setShowPasswords((previous) => ({
                        ...previous,
                        current: true,
                      }));
                    }
                  }}
                  onKeyUp={() =>
                    setShowPasswords((previous) => ({
                      ...previous,
                      current: false,
                    }))
                  }
                  onBlur={() =>
                    setShowPasswords((previous) => ({
                      ...previous,
                      current: false,
                    }))
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-500 hover:text-zinc-700"
                  aria-label="Hold to reveal password"
                  disabled={passwordSubmitting}
                >
                  {showPasswords.current ? (
                    <EyeSlashIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
              {passwordErrors.currentPassword && (
                <p className="text-xs text-red-600">
                  {passwordErrors.currentPassword}
                </p>
              )}
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">
                New Password
              </span>
              <div className="relative">
                <input
                  name="newPassword"
                  type={showPasswords.next ? "text" : "password"}
                  autoComplete="new-password"
                  value={passwordForm.newPassword}
                  onChange={(event) => {
                    setPasswordForm((previous) => ({
                      ...previous,
                      newPassword: event.target.value,
                    }));
                    setPasswordErrors((previous) => ({ ...previous, newPassword: "" }));
                    setPasswordErrorMessage(null);
                  }}
                  className={`${inputClass} pr-10 ${passwordErrors.newPassword ? "border-red-400 focus:border-red-500 focus:ring-red-100" : ""}`}
                  placeholder="Enter new password"
                  disabled={passwordSubmitting}
                />
                <button
                  type="button"
                  onPointerDown={() =>
                    setShowPasswords((previous) => ({
                      ...previous,
                      next: true,
                    }))
                  }
                  onPointerUp={() =>
                    setShowPasswords((previous) => ({
                      ...previous,
                      next: false,
                    }))
                  }
                  onPointerLeave={() =>
                    setShowPasswords((previous) => ({
                      ...previous,
                      next: false,
                    }))
                  }
                  onPointerCancel={() =>
                    setShowPasswords((previous) => ({
                      ...previous,
                      next: false,
                    }))
                  }
                  onKeyDown={(event) => {
                    if (event.key === " " || event.key === "Enter") {
                      event.preventDefault();
                      setShowPasswords((previous) => ({
                        ...previous,
                        next: true,
                      }));
                    }
                  }}
                  onKeyUp={() =>
                    setShowPasswords((previous) => ({
                      ...previous,
                      next: false,
                    }))
                  }
                  onBlur={() =>
                    setShowPasswords((previous) => ({
                      ...previous,
                      next: false,
                    }))
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-500 hover:text-zinc-700"
                  aria-label="Hold to reveal password"
                  disabled={passwordSubmitting}
                >
                  {showPasswords.next ? (
                    <EyeSlashIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
              {passwordErrors.newPassword && (
                <p className="text-xs text-red-600">{passwordErrors.newPassword}</p>
              )}
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">
                Confirm Password
              </span>
              <div className="relative">
                <input
                  name="confirmPassword"
                  type={showPasswords.confirm ? "text" : "password"}
                  autoComplete="new-password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) => {
                    setPasswordForm((previous) => ({
                      ...previous,
                      confirmPassword: event.target.value,
                    }));
                    setPasswordErrors((previous) => ({ ...previous, confirmPassword: "" }));
                    setPasswordErrorMessage(null);
                  }}
                  className={`${inputClass} pr-10 ${passwordErrors.confirmPassword ? "border-red-400 focus:border-red-500 focus:ring-red-100" : ""}`}
                  placeholder="Re-enter new password"
                  disabled={passwordSubmitting}
                />
                <button
                  type="button"
                  onPointerDown={() =>
                    setShowPasswords((previous) => ({
                      ...previous,
                      confirm: true,
                    }))
                  }
                  onPointerUp={() =>
                    setShowPasswords((previous) => ({
                      ...previous,
                      confirm: false,
                    }))
                  }
                  onPointerLeave={() =>
                    setShowPasswords((previous) => ({
                      ...previous,
                      confirm: false,
                    }))
                  }
                  onPointerCancel={() =>
                    setShowPasswords((previous) => ({
                      ...previous,
                      confirm: false,
                    }))
                  }
                  onKeyDown={(event) => {
                    if (event.key === " " || event.key === "Enter") {
                      event.preventDefault();
                      setShowPasswords((previous) => ({
                        ...previous,
                        confirm: true,
                      }));
                    }
                  }}
                  onKeyUp={() =>
                    setShowPasswords((previous) => ({
                      ...previous,
                      confirm: false,
                    }))
                  }
                  onBlur={() =>
                    setShowPasswords((previous) => ({
                      ...previous,
                      confirm: false,
                    }))
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-500 hover:text-zinc-700"
                  aria-label="Hold to reveal password"
                  disabled={passwordSubmitting}
                >
                  {showPasswords.confirm ? (
                    <EyeSlashIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
              {passwordErrors.confirmPassword && (
                <p className="text-xs text-red-600">
                  {passwordErrors.confirmPassword}
                </p>
              )}
            </label>
          </div>

          <div className="mt-4 flex items-center justify-end">
            <button
              type="submit"
              disabled={passwordSubmitting}
              className="inline-flex h-9 items-center justify-center rounded-md bg-zinc-900 px-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {passwordSubmitting ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
