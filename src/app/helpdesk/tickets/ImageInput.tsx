"use client";

import React, { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { ArrowUpTrayIcon, TrashIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import { toast, ToastContainer } from "react-toastify";

interface ImageUploaderProps {
  images: File[];
  setImages: React.Dispatch<React.SetStateAction<File[]>>;
  existingImages: { id: string; url: string }[];
  setExistingImages: React.Dispatch<
    React.SetStateAction<{ id: string; url: string }[]>
  >;
}

export default function ImageUploader({
  images,
  setImages,
  existingImages,
  setExistingImages,
}: ImageUploaderProps) {
  const [previews, setPreviews] = useState<
    { file: File; url: string }[]
  >([]);

  /** ---------------------------------------
   *  Generate previews WHEN images change
   *  (NO setState inside useEffect)
   * -------------------------------------- */
  useEffect(() => {
    const urls = previews.map((p) => p.url);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  /** Handle file selection */
  const onDrop = (acceptedFiles: File[]) => {
    if (images.length + existingImages.length + acceptedFiles.length > 3) {
      return toast.error(`You can upload a maximum of 3 images.`);
    }

    const validFiles = acceptedFiles.filter((file) => {
      if (file.size > 1024 * 1024) {
        toast.error(`${file.name} is larger than 1MB and was skipped.`);
        return false;
      }
      return true;
    });

    // Add new images
    setImages((prev) => [...prev, ...validFiles]);

    // Generate previews IMMEDIATELY
    const newPreview = validFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));

    setPreviews((prev) => [...prev, ...newPreview]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/png": [],
      "image/jpeg": [],
      "image/webp": [],
    },
    maxFiles: 3 - (images.length + existingImages.length),
  });

  return (
    <div
      {...getRootProps()}
      className={`rounded-xl border border-dashed p-5 lg:p-10 w-full cursor-pointer text-center
        ${
          isDragActive
            ? "border-indigo-600 bg-indigo-50 "
            : "border-gray-300 bg-gray-50 hover:border-indigo-600 "
        }`}
    >
      <ToastContainer />
      <input {...getInputProps()} />

      {previews.length === 0 && existingImages.length === 0 ? (
        <div className="text-center">
          <div className="mb-[22px] flex justify-center">
            <div className="h-[68px] w-[68px] rounded-full bg-gray-200  flex items-center justify-center">
              <ArrowUpTrayIcon className="w-[29px] h-7" />
            </div>
          </div>

          <span className="mx-auto mb-5 block text-xs text-gray-700  max-w-[290px]">
            You can upload up to <strong>3 images</strong>. Each image must be
            under <strong>1MB</strong>. Supported formats:{" "}
            <strong>PNG, JPG, JPEG</strong>.
          </span>

          <span className="text-sm text-indigo-500 font-medium underline">
            Drag & drop or browse files
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-gray-300  p-3 rounded-xl">
          {/* Existing images */}
          {existingImages.map((img) => (
            <div
              key={img.id}
              className="group relative"
              onClick={(e) => {
                e.stopPropagation();
                // setDeletedImageIds((prev) => [...prev, img.url]);
                setExistingImages((prev) =>
                  prev.filter((i) => i.id !== img.id)
                );
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center bg-transparent group-hover:bg-black/50 transition-colors">
                <span className="w-[50px] aspect-square opacity-0 group-hover:opacity-100 rounded-full bg-gray-100 flex items-center justify-center">
                  <TrashIcon className="w-6 h-6 text-red-400" />
                </span>
              </div>

              <Image
                src={img.url}
                alt="existing"
                width={500}
                height={500}
                className="rounded"
              />
            </div>
          ))}

          {/* New previews */}
          {previews.map(({ file, url }) => (
            <div
              key={url}
              className="group relative"
              onClick={(e) => {
                e.stopPropagation();
                setPreviews((prev) => prev.filter((p) => p.url !== url));
                setImages((prev) => prev.filter((f) => f.name !== file.name));
                URL.revokeObjectURL(url);
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center bg-transparent group-hover:bg-black/50 transition-colors">
                <span className="w-[50px] aspect-square opacity-0 group-hover:opacity-100 rounded-full bg-gray-100 flex items-center justify-center">
                  <TrashIcon className="w-6 h-6 text-red-400" />
                </span>
              </div>

              <Image
                src={url}
                alt="preview"
                width={500}
                height={500}
                className="rounded"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
