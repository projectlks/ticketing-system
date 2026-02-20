"use client";

import { getSocket } from "@/libs/socket-client";
import { PaperClipIcon, TrashIcon } from "@heroicons/react/24/outline";
import React, { ChangeEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Loading from "@/components/Loading";
import { CommentWithRelations } from "./CommentSection";
import { uploadComment } from "@/libs/action";
import { useSession } from "next-auth/react";

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
  // hidden `<input type="file" />` ကို button ကနေ click ခေါ်ဖို့ ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [commentText, setCommentText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { data: session } = useSession();

  // Socket instance ကို re-render တိုင်း မအသစ်ဖန်တီးဘဲ ref ထဲမှာပဲ ထိန်းထားပါတယ်
  const socketRef = useRef(getSocket());
  const typingTimeout = useRef<NodeJS.Timeout | undefined>(undefined);

  // Component mount ဖြစ်ချိန် ticket room ထဲ join (ဒီ ticket အတွက် event တွေရယူဖို့)
  useEffect(() => {
    const socket = socketRef.current;
    socket.emit("join-ticket", ticketId);
    console.log("Joined ticket:", ticketId);

    // (Optional) Typing event လာမလာ log ထုတ်ပြီး စစ်ချင်ရင် listener ထားနိုင်
    socket.on("user-typing", (data) => {
      console.log("Someone is typing:", data);
    });

    return () => {
      // သတိ: socket ကို ဒီမှာ disconnect လုပ်လိုက်ရင် တခြား component တွေမှာလည်း အကျိုးသက်ရောက်နိုင်
      // socket.disconnect();
    };
  }, [ticketId]);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      // 1MB ထက်ကြီးတဲ့ပုံတွေကို မခွင့်ပြု (လိုအပ်ရင် limit ကိုပြောင်းနိုင်)
      if (file.size > 1024 * 1024) {
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

  // Image ကို `/api/uploads` သို့တင်ပြီး URL ပြန်ယူ (comment payload ထဲမှာသုံးဖို့)
  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/uploads", { method: "POST", body: formData });
    if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
    const data = await res.json();
    return data.urls[0];
  };

  const handlePostComment = async () => {
    // စာလည်းမရှိ ပုံလည်းမရှိရင် မပို့
    if (!commentText.trim() && !imageFile) return;
    setLoading(true);
    const socket = socketRef.current;

    try {
      let imgUrl = "";
      if (imageFile) imgUrl = await uploadImage(imageFile);

      // DB ထဲသို့ comment ကို server action နဲ့ save
      const { data, success } = await uploadComment({
        content: commentText || null,
        imageUrl: imgUrl || null,
        ticketId,
        parentId,
      });

      // Realtime update အတွက် socket နဲ့ event ပို့ (server က broadcast လုပ်ပေးမယ်)
      socket.emit("send-comment", data);

      if (success) {
        if (parentId && onReply) {
          await onReply(parentId, data);
        } else {
          // setComments((prev) => [data, ...prev]);
        }

        setCommentText("");
        setImageFile(null);
        setImagePreview(null);
        if (isReply && setShowReplyForm) {
          setShowReplyForm(false);
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Comment upload failed:", error);
    } finally {
      setLoading(false);
    }
  };

  // Typing indicator ပြသနိုင်ဖို့ socket နဲ့ typing event ပို့ (throttle သဘောနဲ့ timeout ထား)
  const handleTyping = () => {
    const socket = socketRef.current;

    socket.emit("typing", {
      ticketId,
      userName: session?.user?.name || "Unknown",
    });
    // (Optional) typing event တွေကို flood မဖြစ်အောင် throttle သဘောနဲ့ timeout ထား
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      // console.log("Typing stopped");
    }, 5000);
  };

  // Reply form ပိတ်ထားရင် UI မပြ
  if (!showReplyForm) {
    return null;
  }

  return (
    <>
      {loading && <Loading />}

      {imagePreview && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setImageFile(null);
            setImagePreview(null);
          }}
          className="group mb-2 w-fit relative">
          <div className="absolute inset-0 bg-transparent flex justify-center items-center group-hover:bg-[rgba(0,0,0,0.5)] transition-colors">
            <span className="w-[50px] aspect-square group-hover:opacity-100 opacity-0 rounded-full bg-gray-100 flex justify-center items-center">
              <TrashIcon className="w-6 h-6 text-red-400" />
            </span>
          </div>
          <Image
            src={imagePreview}
            width={500}
            height={500}
            alt="Preview"
            className=" w-auto border border-gray-300 h-[200px] rounded"
            unoptimized
          />
        </div>
      )}
      
      <div className="mx-auto max-h-[162px] w-full rounded-2xl border border-gray-300 shadow-xs">
        <textarea
          placeholder="Type your reply here..."
          value={commentText}
          onChange={(e) => {
            setCommentText(e.target.value);
            handleTyping();
          }}
          className="h-20 w-full resize-none border-none overflow-auto hiddenscrollbar p-5 font-normal text-gray-800 outline-none placeholder:text-gray-400 focus:ring-0"
        />
        <div className="flex items-center justify-between p-3">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-transparent px-2 py-3 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-gray-300">
            <PaperClipIcon className="h-5 w-5" aria-hidden="true" />
            Attach
          </button>
          <button
            type="button"
            onClick={handlePostComment}
            disabled={!commentText.trim() && !imageFile}
            className="h-11 px-4 py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 transition rounded-lg shadow-md flex items-center disabled:opacity-50 disabled:cursor-not-allowed">
            Post Comment
          </button>
        </div>
      </div>
      {/* 
      {imagePreview && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setImageFile(null);
            setImagePreview(null);
          }}
          className="group w-fit relative">
          <div className="absolute inset-0 bg-transparent flex justify-center items-center group-hover:bg-[rgba(0,0,0,0.5)] transition-colors">
            <span className="w-[50px] aspect-square group-hover:opacity-100 opacity-0 rounded-full bg-gray-100 flex justify-center items-center">
              <TrashIcon className="w-6 h-6 text-red-400" />
            </span>
          </div>
          <Image
            src={imagePreview}
            width={500}
            height={500}
            alt="Preview"
            className="mt-2 w-[200px] rounded"
            unoptimized
          />
        </div>
      )} */}
    </>
  );
}
