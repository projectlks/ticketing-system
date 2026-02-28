"use client";

import Image from "next/image";
import React, { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  ArrowUpTrayIcon,
  TrashIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-toastify";

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
    if (images.length + existingImages.length + acceptedFiles.length > 3) {
      toast.error("You can upload up to 3 images.");
      return;
    }

    const validFiles = acceptedFiles.filter((file) => {
      if (file.size > 1024 * 1024) {
        toast.error(`${file.name} is larger than 1MB and was skipped.`);
        return false;
      }
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
    accept: {
      "image/png": [],
      "image/jpeg": [],
      "image/webp": [],
    },
    maxFiles: 3 - (images.length + existingImages.length),
  });

  const showEmptyState = previews.length === 0 && existingImages.length === 0;


  console.log("existingImages.length:", existingImages.length);

  return (
    <section className="space-y-2">
      <p className="text-sm font-medium text-zinc-700">Attachments</p>

      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-xl border border-dashed p-5 text-center transition-colors ${
          isDragActive
            ? "border-zinc-500 bg-zinc-100"
            : "border-zinc-300 bg-zinc-50 hover:border-zinc-400"
        }`}>
        <input {...getInputProps()} />

        {showEmptyState ? (
          <div className="space-y-2 h-70 flex flex-col justify-center">
            <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 bg-white">
              <ArrowUpTrayIcon className="h-5 w-5 text-zinc-500" />
            </span>
            <p className="text-sm font-medium text-zinc-700">
              Drop images here or click to upload
            </p>
            <p className="text-xs text-zinc-500">
              Maximum 3 files, each under 1MB (PNG/JPG/WEBP)
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {/* Existing image / new preview နှစ်မျိုးလုံးကိုတူညီတဲ့ tile UI နဲ့ပြထားလို့ action consistency ကောင်းပါတယ်။ */}
            {/* {existingImages.map((image) => (
              <button
                key={image.id}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setExistingImages((previous) =>
                    previous.filter((item) => item.id !== image.id),
                  );
                }}
                className="group relative overflow-hidden rounded-lg border border-zinc-200 bg-white">
                <Image
                  src={image.url}
                  alt="existing ticket attachment"
                  width={420}
                  height={280}
                  className="h-28 w-full object-cover"
                />
                <span className="absolute inset-0 hidden items-center justify-center bg-black/35 group-hover:flex">
                  <TrashIcon className="h-5 w-5 text-white" />
                </span>
              </button>
            ))} */}
            {existingImages.map((image) => (
              <div
                key={image.id}
                className="group relative overflow-hidden rounded-lg border border-zinc-200 bg-white">
                <Image
                  src={image.url}
                  alt="existing ticket attachment"
                  width={420}
                  height={280}
                  className="aspect-square w-full object-cover"
                />

                {/* Overlay */}
                <div className="absolute inset-0 hidden items-center justify-center gap-3 bg-black/40 group-hover:flex">
                  {/* Download */}
                  <a
                    href={image.url}
                    download
                    onClick={(event) => event.stopPropagation()}
                    className="rounded-full bg-white p-2 transition hover:bg-zinc-200">
                    <ArrowDownTrayIcon className="h-4 w-4 text-zinc-700" />
                  </a>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setExistingImages((previous) =>
                        previous.filter((item) => item.id !== image.id),
                      );
                    }}
                    className="rounded-full bg-white p-2 transition hover:bg-zinc-200">
                    <TrashIcon className="h-4 w-4 text-zinc-700" />
                  </button>
                </div>
              </div>
            ))}
            {/* {previews.map(({ file, url }) => (
              <button
                key={url}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setPreviews((previous) =>
                    previous.filter((preview) => preview.url !== url),
                  );
                  setImages((previous) =>
                    previous.filter((item) => item.name !== file.name),
                  );
                  URL.revokeObjectURL(url);
                }}
                className="group relative overflow-hidden rounded-lg border border-zinc-200 bg-white">
                <Image
                  src={url}
                  alt="new ticket attachment preview"
                  width={420}
                  height={280}
                  className="h-28 w-full object-cover"
                />
                <span className="absolute inset-0 hidden items-center justify-center bg-black/35 group-hover:flex">
                  <TrashIcon className="h-5 w-5 text-white" />
                </span>
              </button>
            ))} */}

            {previews.map(({ file, url }) => (
              <div
                key={url}
                className="group relative overflow-hidden rounded-lg border border-zinc-200 bg-white">
                <Image
                  src={url}
                  alt="new ticket attachment preview"
                  width={420}
                  height={280}
                  className="aspect-square w-full object-cover"
                />

                <div className="absolute inset-0 hidden items-center justify-center gap-3 bg-black/40 group-hover:flex">
                  {/* Download */}
                  <a
                    href={url}
                    download={file.name}
                    onClick={(event) => event.stopPropagation()}
                    className="rounded-full bg-white p-2 transition hover:bg-zinc-200">
                    <ArrowDownTrayIcon className="h-4 w-4 text-zinc-700" />
                  </a>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setPreviews((previous) =>
                        previous.filter((preview) => preview.url !== url),
                      );
                      setImages((previous) =>
                        previous.filter((item) => item.name !== file.name),
                      );
                      URL.revokeObjectURL(url);
                    }}
                    className="rounded-full bg-white p-2 transition hover:bg-zinc-200">
                    <TrashIcon className="h-4 w-4 text-zinc-700" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
