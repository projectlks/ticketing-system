"use client";

import React, { useState, ChangeEvent, useRef, useEffect } from "react";
import { EyeIcon, EyeSlashIcon, PaperClipIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import Swal from "sweetalert2";
import { uploadComment } from "../../action";
import Loading from "@/components/Loading";
import { CommentWithRelations } from "./TicketView";
import moment from "moment";

interface Prop {
  ticketId: string;
  commets: CommentWithRelations[];
}

export default function CommentSection({ ticketId, commets }: Prop) {
  const [showComments, setShowComments] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const maxChars = 500;

  const [comments, setComments] = useState<CommentWithRelations[]>([]);

  useEffect(() => {
    setComments(commets || []);
  }, [commets]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleCommentChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length <= maxChars) setCommentText(e.target.value);
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      // Limit file size to 1MB
      if (file.size > 1024 * 1024) {
        Swal.fire({
          icon: "warning",
          title: "File too large",
          text: "Image size should be less than 1MB.",
        });
        e.target.value = ""; // Reset file input
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


  const toggleComments = () => setShowComments(prev => !prev);

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

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
      });

      if (success) {
        setComments(prev => [data, ...prev]);
        Swal.fire({
          icon: "success",
          title: "Comment posted!",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        throw new Error("Failed to post comment");
      }

      setCommentText("");
      setImageFile(null);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

    } catch (error) {

      const message = error instanceof Error ? error.message : 'Something went wrong.';

      Swal.fire({
        icon: "error",
        title: "Oops!",
        text: message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {loading && <Loading />}
      <div className="col-span-2">
        {/* Comment Input */}
        <div className="mx-auto max-h-[162px] w-full rounded-2xl border border-gray-200 shadow-xs dark:border-gray-800 dark:bg-gray-800">
          <textarea
            placeholder="Type your reply here..."
            value={commentText}
            onChange={handleCommentChange}
            className="h-20 w-full resize-none border-none bg-transparent p-5 font-normal text-gray-800 outline-none placeholder:text-gray-400 focus:ring-0 dark:text-white"
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
              className="flex h-9 items-center gap-1.5 rounded-lg bg-transparent px-2 py-3 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-gray-300"
            >
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

        {/* Image Preview */}
        {imagePreview && (
          <Image
            src={imagePreview}
            width={500}
            height={500}
            alt="Selected preview"
            className="mt-2 w-[200px] rounded"
            unoptimized
          />
        )}

        {/* Character count */}
        <div className="flex justify-between mt-2 text-sm text-gray-500">
          <span>Character limit: {maxChars}</span>
          <span id="charCount">
            {commentText.length} / {maxChars}
          </span>
        </div>

        {/* Toggle Comments */}
        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={toggleComments}
            className="flex items-center space-x-2 group hover:text-indigo-600 text-gray-700"
            aria-expanded={showComments}
            aria-controls="commentsSection"
          >
            <h2 className="text-md">Comments : {comments.length}</h2>
            {!showComments ? (
              <EyeSlashIcon className="w-5 h-5" aria-hidden="true" />
            ) : (
              <EyeIcon className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Comment List */}
        {showComments && (
          <div id="commentsSection" className="mt-4 space-y-4" aria-live="polite" aria-relevant="additions">
            {comments.map(comment => (
              <div
                key={comment.id}
                className="border border-gray-300 p-3 rounded-lg bg-gray-50"
                role="article"
                aria-label={`Comment by ${comment.commenter?.name ?? "Unknown"}`}
              >
                <div className="flex justify-between items-center">
                  <div className="text-gray-600 flex space-x-2 items-center">
                    <span className="relative mr-3 overflow-hidden rounded-full h-11 w-11">
                      <span className="flex items-center justify-center w-full h-full text-2xl text-gray-100 bg-blue-500 rounded-full z-10 select-none">
                        {comment.commenter?.name?.charAt(0).toUpperCase() ?? "?"}
                      </span>
                    </span>
                    <span>
                      <h3 className="text-sm leading-5">{comment.commenter?.name ?? "Unknown"}</h3>
                      <p className="text-[10px]">{comment.commenter?.email ?? "-"}</p>
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">{moment(comment.createdAt).fromNow()}</span>
                </div>
                <p className="mt-2 text-sm text-gray-800">{comment.content}</p>
                {comment.imageUrl && (
                  <Image
                    src={comment.imageUrl}
                    alt={`Image in comment by ${comment.commenter?.name}`}
                    className="mt-2 rounded"
                    width={320}
                    height={160}
                    unoptimized
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
