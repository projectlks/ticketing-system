"use client";

import Image from "next/image";
import React, { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  ArrowUpTrayIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-toastify";

interface ImageUploaderProps {
  images: File[];
  setImages: React.Dispatch<React.SetStateAction<File[]>>;
  existingImages: { id: string; url: string }[];
  setExistingImages: React.Dispatch<
    React.SetStateAction<{ id: string; url: string }[]>
  >;
  onRemoveExistingImage?: (id: string) => void;
}

const ONE_MB = 1024 * 1024;
const MAX_ATTACHMENTS = 6;
const MAX_IMAGE_ATTACHMENTS = 3;
const MAX_FILE_ATTACHMENTS = 3;
const IMAGE_MAX_BYTES = ONE_MB;
const FILE_MAX_BYTES = 5 * ONE_MB;

type AttachmentCategory = "image" | "file" | "unknown";

const DROPZONE_ACCEPT = {
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    ".xlsx",
  ],
  "text/csv": [".csv"],
  "text/plain": [".txt"],
} as const;

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const DOCUMENT_EXTENSIONS = new Set([".pdf", ".doc", ".docx", ".xls", ".xlsx"]);
const TEXT_EXTENSIONS = new Set([".csv", ".txt"]);

const extractExtension = (name: string) => {
  const dotIndex = name.lastIndexOf(".");
  if (dotIndex < 0) return "";
  return name.slice(dotIndex).toLowerCase();
};

const getAttachmentCategory = (file: File): AttachmentCategory => {
  const ext = extractExtension(file.name);
  const mime = file.type.toLowerCase();

  if (mime.startsWith("image/") || IMAGE_EXTENSIONS.has(ext)) return "image";
  if (
    mime === "application/pdf" ||
    mime.includes("word") ||
    mime.includes("excel") ||
    mime.includes("spreadsheet") ||
    DOCUMENT_EXTENSIONS.has(ext)
  ) {
    return "file";
  }
  if (mime === "text/plain" || mime === "text/csv" || TEXT_EXTENSIONS.has(ext)) {
    return "file";
  }

  return "unknown";
};

const getSizeLimitForCategory = (category: AttachmentCategory): number => {
  if (category === "image") return IMAGE_MAX_BYTES;
  if (category === "file") return FILE_MAX_BYTES;
  return 0;
};

const formatBytes = (bytes: number): string => {
  if (bytes >= ONE_MB) {
    const mb = bytes / ONE_MB;
    return `${Number.isInteger(mb) ? mb : mb.toFixed(1)}MB`;
  }
  return `${Math.ceil(bytes / 1024)}KB`;
};

const isImageByUrl = (url: string) => {
  const safeUrl = url.split("?")[0]?.toLowerCase() ?? "";
  return [".png", ".jpg", ".jpeg", ".webp"].some((ext) => safeUrl.endsWith(ext));
};

const getFileNameFromUrl = (url: string) => {
  const raw = url.split("?")[0]?.split("/").pop() ?? "attachment";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};

export default function ImageUploader({
  images,
  setImages,
  existingImages,
  setExistingImages,
  onRemoveExistingImage,
}: ImageUploaderProps) {
  const [previews, setPreviews] = useState<Array<{ file: File; url: string }>>(
    [],
  );

  useEffect(() => {
    const previewUrls = previews.map((preview) => preview.url);
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  const onDrop = (acceptedFiles: File[]) => {
    const currentImageCountFromExisting = existingImages.filter((item) =>
      isImageByUrl(item.url),
    ).length;
    const currentFileCountFromExisting =
      existingImages.length - currentImageCountFromExisting;
    const currentImageCountFromNew = images.filter(
      (item) => getAttachmentCategory(item) === "image",
    ).length;
    const currentFileCountFromNew = images.filter(
      (item) => getAttachmentCategory(item) === "file",
    ).length;

    let nextImageCount = currentImageCountFromExisting + currentImageCountFromNew;
    let nextFileCount = currentFileCountFromExisting + currentFileCountFromNew;
    let nextTotalCount = nextImageCount + nextFileCount;

    const validFiles = acceptedFiles.filter((file) => {
      const category = getAttachmentCategory(file);
      if (category === "unknown") {
        toast.error(`${file.name} has an unsupported file type.`);
        return false;
      }

      const limit = getSizeLimitForCategory(category);
      if (file.size > limit) {
        toast.error(`${file.name} exceeds ${formatBytes(limit)} and was skipped.`);
        return false;
      }

      if (nextTotalCount >= MAX_ATTACHMENTS) {
        toast.error(`You can upload up to ${MAX_ATTACHMENTS} attachments total.`);
        return false;
      }

      if (category === "image") {
        if (nextImageCount >= MAX_IMAGE_ATTACHMENTS) {
          toast.error(`You can upload up to ${MAX_IMAGE_ATTACHMENTS} images.`);
          return false;
        }
        nextImageCount += 1;
      } else {
        if (nextFileCount >= MAX_FILE_ATTACHMENTS) {
          toast.error(`You can upload up to ${MAX_FILE_ATTACHMENTS} files.`);
          return false;
        }
        nextFileCount += 1;
      }
      nextTotalCount += 1;

      return true;
    });

    if (!validFiles.length) return;

    setImages((previous) => [...previous, ...validFiles]);
    setPreviews((previous) => [
      ...previous,
      ...validFiles.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      })),
    ]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: DROPZONE_ACCEPT,
    maxFiles: Math.max(0, MAX_ATTACHMENTS - (images.length + existingImages.length)),
  });

  const showEmptyState = previews.length === 0 && existingImages.length === 0;

  return (
    <section className="space-y-2">
      <p className="text-sm font-medium text-zinc-700">Attachments</p>

      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-xl border border-dashed p-5 text-center transition-colors ${
          isDragActive
            ? "border-zinc-500 bg-zinc-100"
            : "border-zinc-300 bg-zinc-50 hover:border-zinc-400"
        }`}
      >
        <input {...getInputProps()} />

        {showEmptyState ? (
          <div className="flex h-70 flex-col justify-center space-y-2">
            <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 bg-white">
              <ArrowUpTrayIcon className="h-5 w-5 text-zinc-500" />
            </span>
            <p className="text-sm font-medium text-zinc-700">
              Drop files here or click to upload
            </p>
            <p className="text-xs text-zinc-500">
              Max 6 attachments total: up to 3 images (1MB each) and 3 files (5MB each).
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {existingImages.map((attachment) => (
              <AttachmentTile
                key={attachment.id}
                fileUrl={attachment.url}
                fileName={getFileNameFromUrl(attachment.url)}
                isImage={isImageByUrl(attachment.url)}
                onDownloadClick={(event) => event.stopPropagation()}
                onDelete={() => {
                  onRemoveExistingImage?.(attachment.id);
                  setExistingImages((previous) =>
                    previous.filter((item) => item.id !== attachment.id),
                  );
                }}
              />
            ))}

            {previews.map(({ file, url }) => (
              <AttachmentTile
                key={url}
                fileUrl={url}
                fileName={file.name}
                isImage={getAttachmentCategory(file) === "image"}
                onDownloadClick={(event) => event.stopPropagation()}
                onDelete={() => {
                  setPreviews((previous) =>
                    previous.filter((preview) => preview.url !== url),
                  );
                  setImages((previous) => previous.filter((item) => item !== file));
                  URL.revokeObjectURL(url);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

type AttachmentTileProps = {
  fileUrl: string;
  fileName: string;
  isImage: boolean;
  onDelete: () => void;
  onDownloadClick?: (event: React.MouseEvent<HTMLElement>) => void;
};

function AttachmentTile({
  fileUrl,
  fileName,
  isImage,
  onDelete,
  onDownloadClick,
}: AttachmentTileProps) {
  return (
    <div className="group relative overflow-hidden rounded-lg border border-zinc-200 bg-white">
      {isImage ? (
        <Image
          src={fileUrl}
          alt="ticket attachment"
          width={420}
          height={280}
          className="aspect-square w-full object-cover"
          unoptimized
        />
      ) : (
        <div className="flex aspect-square flex-col items-center justify-center gap-2 px-3 text-center">
          <DocumentTextIcon className="h-10 w-10 text-zinc-500" />
          <p className="line-clamp-3 text-xs font-medium text-zinc-700" title={fileName}>
            {fileName}
          </p>
        </div>
      )}

      <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
        <a
          href={fileUrl}
          download={fileName}
          onClick={onDownloadClick}
          className="rounded-full bg-white p-2 transition hover:bg-zinc-200"
        >
          <ArrowDownTrayIcon className="h-4 w-4 text-zinc-700" />
        </a>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          className="rounded-full bg-white p-2 transition hover:bg-zinc-200"
        >
          <TrashIcon className="h-4 w-4 text-zinc-700" />
        </button>
      </div>
    </div>
  );
}
