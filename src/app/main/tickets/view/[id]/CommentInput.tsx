"use client";

import { PaperClipIcon, TrashIcon } from "@heroicons/react/24/outline";
import React, { ChangeEvent, useRef, useState } from "react";
import Swal from "sweetalert2";
import Image from "next/image";
import Loading from "@/components/Loading";
import { CommentWithRelations } from "./TicketView";
import { uploadComment } from "../../action";

interface Props {
  setComments: React.Dispatch<React.SetStateAction<CommentWithRelations[]>>;
  ticketId: string;
  parentId?: string;
  onReply?: (parentId: string, replyComment: CommentWithRelations) => Promise<void>;
}

export default function CommentInput({ setComments, ticketId, parentId, onReply }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [commentText, setCommentText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // const maxChars = 500;

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 1024 * 1024) {
        Swal.fire({ icon: "warning", title: "File too large", text: "Image must be <1MB" });
        e.target.value = "";
        setImageFile(null);
        setImagePreview(null);
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImageFile(null);
      setImagePreview(null);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
    const data = await res.json();
    return data.urls[0];
  };

  const handlePostComment = async () => {
    if (!commentText.trim() && !imageFile) return;
    setLoading(true);

    try {
      let imgUrl = "";
      if (imageFile) imgUrl = await uploadImage(imageFile);

      const { data, success } = await uploadComment({
        content: commentText || null,
        imageUrl: imgUrl || null,
        ticketId,
        parentId,
      });

      if (success) {
        if (parentId && onReply) {
          await onReply(parentId, data); // ✅ pass created comment
        } else {
          setComments(prev => [data, ...prev]);
        }

        setCommentText("");
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        Swal.fire({ icon: "success", title: "Comment posted!", timer: 1500, showConfirmButton: false });
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Oops!",
        text: error instanceof Error ? error.message : "Something went wrong.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {loading && <Loading />}
      <div className="mx-auto max-h-[162px] w-full rounded-2xl border border-gray-200 shadow-xs dark:border-gray-800 dark:bg-gray-800">
        <textarea
          placeholder="Type your reply here..."
          value={commentText}
          onChange={e => { if (e.target.value.length) setCommentText(e.target.value); }}
          className="h-20 w-full resize-none border-none bg-transparent p-5 font-normal text-gray-800 outline-none placeholder:text-gray-400 focus:ring-0 dark:text-white"
        />
        <div className="flex items-center justify-between p-3">
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="flex h-9 items-center gap-1.5 rounded-lg bg-transparent px-2 py-3 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-gray-300">
            <PaperClipIcon className="h-5 w-5" aria-hidden="true" />
            Attach
          </button>
          <button
            type="button"
            onClick={handlePostComment}
            disabled={!commentText.trim() && !imageFile}
            className="h-[44px] px-4 py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 transition rounded-lg shadow-md flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Post Comment
          </button>
        </div>
      </div>

      {imagePreview && (<>




        <div onClick={(e) => {
          e.stopPropagation();

          setImageFile(null);
          setImagePreview(null);

        }} className="group w-fit relative">
          <div className="absolute inset-0 bg-transparent flex justify-center items-center
                  group-hover:bg-[rgba(0,0,0,0.5)] transition-colors ">
            <span className="w-[50px] aspect-square group-hover:opacity-100 opacity-0 rounded-full bg-gray-100 flex justify-center items-center">
              <TrashIcon className="w-6 h-6 text-red-400" />
            </span>
          </div>

          <Image src={imagePreview} width={500} height={500} alt="Preview" className="mt-2 w-[200px] rounded" unoptimized />
        </div>
      </>

      )}

    </>
  );
}


