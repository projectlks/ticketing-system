"use client";

import Image from "next/image";
import React, { ChangeEvent, useEffect, useRef, useState } from "react";
import { PaperClipIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useSession } from "next-auth/react";

import Loading from "@/components/Loading";
import { uploadComment } from "@/libs/action";
import { getSocket } from "@/libs/socket-client";

import { CommentWithRelations } from "./CommentSection";

interface Props {
  ticketId: string;
  parentId?: string;
  onReply?: (
    parentId: string,
    replyComment: CommentWithRelations,
  ) => Promise<void>;
  isReply?: boolean;
  showReplyForm?: boolean;
  setShowReplyForm?: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function CommentInput({
  ticketId,
  parentId,
  onReply,
  isReply,
  showReplyForm = true,
  setShowReplyForm,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const socketRef = useRef(getSocket());
  const typingTimeout = useRef<NodeJS.Timeout | undefined>(undefined);

  const [commentText, setCommentText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { data: session } = useSession();

  useEffect(() => {
    const socket = socketRef.current;
    socket.emit("join-ticket", ticketId);
  }, [ticketId]);

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      setImageFile(null);
      setImagePreview(null);
      return;
    }

    const file = event.target.files[0];

    if (file.size > 1024 * 1024) {
      event.target.value = "";
      setImageFile(null);
      setImagePreview(null);
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/uploads", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const payload = await response.json();
    return payload.urls[0];
  };

  const handlePostComment = async () => {
    if (!commentText.trim() && !imageFile) return;
    setLoading(true);

    const socket = socketRef.current;

    try {
      let imageUrl = "";
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const { data, success } = await uploadComment({
        content: commentText || null,
        imageUrl: imageUrl || null,
        ticketId,
        parentId,
      });

      socket.emit("send-comment", data);

      if (success) {
        if (parentId && onReply) {
          await onReply(parentId, data);
        }

        setCommentText("");
        setImageFile(null);
        setImagePreview(null);

        if (isReply && setShowReplyForm) {
          setShowReplyForm(false);
        }

        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    } catch (error) {
      console.error("Comment upload failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTyping = () => {
    const socket = socketRef.current;

    socket.emit("typing", {
      ticketId,
      userName: session?.user?.name || "Unknown",
    });

    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => undefined, 5000);
  };

  if (!showReplyForm) return null;

  return (
    <>
      {loading && <Loading />}

      {imagePreview && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setImageFile(null);
            setImagePreview(null);
          }}
          className="group relative mb-2 block w-fit overflow-hidden rounded-lg border border-zinc-200">
          <Image
            src={imagePreview}
            width={260}
            height={160}
            alt="Comment attachment preview"
            className="h-36 w-auto object-cover"
            unoptimized
          />
          <span className="absolute inset-0 hidden items-center justify-center bg-black/35 group-hover:flex">
            <TrashIcon className="h-5 w-5 text-white" />
          </span>
        </button>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white">
        <textarea
          value={commentText}
          placeholder={isReply ? "Write a reply..." : "Write a comment..."}
          onChange={(event) => {
            setCommentText(event.target.value);
            handleTyping();
          }}
          className="h-20 w-full resize-none border-none px-3 py-2.5 text-sm text-zinc-800 outline-none"
        />

        <div className="flex items-center justify-between border-t border-zinc-100 px-2.5 py-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-800">
            <PaperClipIcon className="h-4 w-4" aria-hidden="true" />
            Attach
          </button>

          <button
            type="button"
            onClick={handlePostComment}
            disabled={!commentText.trim() && !imageFile}
            className="inline-flex h-8 items-center justify-center rounded-lg bg-zinc-900 px-3 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50">
            {isReply ? "Reply" : "Post"}
          </button>
        </div>
      </div>
    </>
  );
}
