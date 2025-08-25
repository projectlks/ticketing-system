"use client";

import React, { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { ArrowUpTrayIcon, TrashIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import Swal from "sweetalert2";

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
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([]);

  // Generate previews for new uploads
  useEffect(() => {
    const newPreviews = images.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setPreviews(newPreviews);

    return () => {
      newPreviews.forEach(({ url }) => URL.revokeObjectURL(url));
    };
  }, [images]);

  // Handle file drop
  const onDrop = (acceptedFiles: File[]) => {
    if (images.length + existingImages.length + acceptedFiles.length > 3) {
      Swal.fire({
        icon: "error",
        title: "Too many images",
        text: "You can upload a maximum of 3 images.",
      });
      return;
    }

    const validFiles = acceptedFiles.filter((file) => {
      if (file.size > 1024 * 1024) {
        Swal.fire({
          icon: "error",
          title: "File too large",
          text: `${file.name} is larger than 1MB and was skipped.`,
        });
        return false;
      }
      return true;
    });

    setImages((prev) => [...prev, ...validFiles]);
  };

  // Delete existing image
  async function deleteImage(url: string, id?: string) {
    const filename = url.split("/").pop();
    if (!filename) return;

    try {
      const res = await fetch(`/api/uploads/${filename}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");

      if (id) {
        setExistingImages((prev) => prev.filter((img) => img.id !== id));
      }
    } catch (err: unknown) {
      let message = "Something went wrong";

      if (err instanceof Error) {
        message = err.message;
      }

      Swal.fire({ icon: "error", title: "Delete failed", text: message });
    }
  }

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
      className={`rounded-xl border border-dashed p-5 lg:p-10 w-full block cursor-pointer text-center
        ${isDragActive
          ? "border-indigo-600 bg-indigo-50"
          : "border-gray-300 bg-gray-50 hover:border-indigo-600"
        }`}
    >
      <input {...getInputProps()} />

      {previews.length === 0 && existingImages.length === 0 ? (
        <div className="text-center">
          <div className="mb-[22px] flex justify-center">
            <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-gray-200 text-gray-700">
              <ArrowUpTrayIcon className="w-[29px] h-[28px]" />
            </div>
          </div>

          <span className="mx-auto mb-5 block max-w-[290px] text-xs text-gray-700">
            You can upload up to <strong>3 images</strong>. Each image must be
            under <strong>1MB</strong>. Supported formats: <strong>PNG, JPG, JPEG</strong>.
          </span>

          <span className="text-sm text-indigo-500 font-medium underline">
            Drag & drop or browse files
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full bg-gray-300 p-3 rounded-xl">
          {/* Existing images */}
          {existingImages.map((d) => (
            <div
              key={d.id}
              className="group relative"
              onClick={(e) => {
                e.stopPropagation();
                deleteImage(d.url, d.id);
              }}
            >
              <div className="absolute inset-0 bg-transparent flex justify-center items-center
                  group-hover:bg-[rgba(0,0,0,0.5)] transition-colors ">
                <span className="w-[50px] aspect-square group-hover:opacity-100 opacity-0 rounded-full bg-gray-100 flex justify-center items-center">
                  <TrashIcon className="w-6 h-6 text-red-400" />
                </span>
              </div>

              <Image
                src={d.url}
                alt={`upload-${d.id}`}
                className="w-full h-auto rounded-lg object-cover"
                width={500}
                height={500}
              />
            </div>
          ))}

          {/* New upload previews */}
          {previews.map(({ file, url }) => (
            <div
              key={url}
              className="group relative"
              onClick={(e) => {
                e.stopPropagation();
                setPreviews((prev) => prev.filter((p) => p.url !== url));
                setImages((prev) => prev.filter((f) => f.name !== file.name));
              }}
            >
              <div className="absolute inset-0 bg-transparent flex justify-center items-center
                  group-hover:bg-[rgba(0,0,0,0.5)] transition-colors ">
                <span className="w-[50px] aspect-square group-hover:opacity-100 opacity-0 rounded-full bg-gray-100 flex justify-center items-center">
                  <TrashIcon className="w-6 h-6 text-red-400" />
                </span>
              </div>

              <Image
                src={url}
                alt={`upload-${file.name}`}
                className="w-full h-auto rounded-lg object-cover"
                width={500}
                height={500}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
