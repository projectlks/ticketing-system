"use client";

import Image from "next/image";
import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
  ChatBubbleOvalLeftEllipsisIcon,
  HandThumbUpIcon as HandThumbUpOutline,
  ArrowsPointingOutIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
  XMarkIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import { HandThumbUpIcon as HandThumbUpSolid } from "@heroicons/react/24/solid";
import { useSession } from "next-auth/react";

import Avatar from "@/components/Avatar";
import { likeComment } from "@/libs/action";
import { formatMyanmarDateTime } from "@/libs/myanmar-date-time";

import CommentInput from "./CommentInput";
import { CommentWithRelations } from "./CommentSection";

interface Like {
  id?: string;
  user: { id: string; name: string | null; email: string | null };
}

interface Props {
  comment: CommentWithRelations;
  ticketId: string;
  setComments: React.Dispatch<React.SetStateAction<CommentWithRelations[]>>;
  depth?: number;
}

// URL ကိုကြည့်ပြီး ပုံလား၊ တခြားဖိုင်လား ခွဲခြားပေးမည့် function
const isImageByUrl = (url: string): boolean => {
  const safeUrl = url.split("?")[0]?.toLowerCase() ?? "";
  return [".png", ".jpg", ".jpeg", ".webp"].some((ext) =>
    safeUrl.endsWith(ext),
  );
};

// URL ထဲမှ ဖိုင်နာမည်ကို ဆွဲထုတ်ပေးမည့် function
const getFileNameFromUrl = (url: string): string => {
  const raw = url.split("?")[0]?.split("/").pop() ?? "attachment";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};

export default function CommentItem({
  comment,
  ticketId,
  setComments: _setComments,
  depth = 0,
}: Props) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const [showReplyForm, setShowReplyForm] = useState<boolean>(false);
  const [showLikeUsers, setShowLikeUsers] = useState<boolean>(false);
  const [likes, setLikes] = useState<Like[]>(comment.likes ?? []);

  // Fullscreen Image ပြသရန် State
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const hasLiked = likes.some((like) => like.user.id === currentUserId);

  // 🔥 Limit indentation to prevent UI break
  const indent = Math.min(depth * 16, 48); // max 48px

  // 🌟 Sync State ကို ဖတ်၍ Fail ဖြစ်မဖြစ် စစ်ဆေးခြင်း
  let parsedSyncState: Record<string, unknown> = {};
  if (comment.syncState) {
    if (typeof comment.syncState === "string") {
      try {
        parsedSyncState = JSON.parse(comment.syncState) as Record<
          string,
          unknown
        >;
      } catch {
        parsedSyncState = {};
      }
    } else if (
      typeof comment.syncState === "object" &&
      comment.syncState !== null
    ) {
      parsedSyncState = comment.syncState as Record<string, unknown>;
    }
  }
  const isOtrsSyncFailed = parsedSyncState?.otrs === "FAILED";

  const handleLikeComment = async (commentId: string) => {
    if (!currentUserId) return;

    const result = await likeComment({ commentId });

    if (result.error) {
      console.log("Like action failed:", result.error);
      return;
    }

    if (result.liked) {
      setLikes((previous) => [
        ...previous,
        {
          id: `${commentId}-${currentUserId}`,
          user: {
            id: currentUserId,
            name: session?.user?.name ?? null,
            email: session?.user?.email ?? null,
          },
        },
      ]);
      return;
    }

    setLikes((previous) =>
      previous.filter((like) => like.user.id !== currentUserId),
    );
  };

  return (
    <div className="" style={{ marginLeft: `${indent}px` }}>
      <article
        className={`mb-5 w-full rounded-xl border ${isOtrsSyncFailed ? "border-red-300 bg-red-50/30" : "border-indigo-100 bg-white"} p-3 transition-colors`}>
        <div className="flex items-start gap-3">
          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-zinc-100">
            <Avatar name={comment.commenter?.name} size={32} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <p className="truncate text-sm font-medium text-zinc-900">
                {comment.commenter?.name ?? "Unknown"}
              </p>
              <p className="text-xs text-zinc-500">
                {formatMyanmarDateTime(comment.createdAt) || "-"}
              </p>
            </div>

            <p className="truncate text-[11px] text-zinc-500">
              {comment.commenter?.email ?? "-"}
            </p>

            <p className="mt-2 whitespace-pre-wrap break-all text-sm leading-relaxed text-zinc-700">
              {comment.content}
            </p>

            {/* 📎 Attachment ပြသသည့် အပိုင်း */}
            {comment.imageUrl && (
              <div className="mt-2">
                {isImageByUrl(comment.imageUrl) ? (
                  // 🖼 ပုံဖြစ်ခဲ့လျှင်
                  <div className="group relative w-fit overflow-hidden rounded-lg border border-zinc-200">
                    <Image
                      src={comment.imageUrl}
                      alt="Comment attachment"
                      width={260}
                      height={160}
                      className="h-36 w-auto object-cover"
                      unoptimized
                    />
                    <div className="absolute inset-0 hidden items-center justify-center gap-3 bg-black/40 group-hover:flex">
                      <button
                        type="button"
                        onClick={() => setFullscreenImage(comment.imageUrl!)}
                        className="rounded-full bg-white p-2 transition hover:bg-zinc-200">
                        <ArrowsPointingOutIcon className="h-4 w-4 text-zinc-700" />
                      </button>
                      <a
                        href={comment.imageUrl}
                        download={getFileNameFromUrl(comment.imageUrl)}
                        className="rounded-full bg-white p-2 transition hover:bg-zinc-200">
                        <ArrowDownTrayIcon className="h-4 w-4 text-zinc-700" />
                      </a>
                    </div>
                  </div>
                ) : (
                  // 📄 အခြား Document ဖိုင်ဖြစ်ခဲ့လျှင်
                  <div className="flex  items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <DocumentTextIcon className="h-8 w-8 text-zinc-500" />
                      <div className="flex max-w-[100px] flex-col">
                        <span
                          className="truncate text-sm font-medium text-zinc-700"
                          title={getFileNameFromUrl(comment.imageUrl)}>
                          {getFileNameFromUrl(comment.imageUrl)}
                        </span>
                      </div>
                    </div>

                    <a
                      href={comment.imageUrl}
                      download={getFileNameFromUrl(comment.imageUrl)}
                      className="ml-2 rounded-full bg-zinc-200 p-2 transition hover:bg-zinc-300">
                      <ArrowDownTrayIcon className="h-4 w-4 text-zinc-700" />
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* 🌟 NATIVE ACCORDION: OTRS Sync Failed Banner */}
            {isOtrsSyncFailed && (
              <details className="mt-3 group/error">
                <summary className="flex w-max cursor-pointer items-center gap-1 rounded-full border border-red-100 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600 transition-colors hover:bg-red-100 list-none [&::-webkit-details-marker]:hidden">
                  <ExclamationCircleIcon className="h-3 w-3" />
                  Sync Failed
                </summary>

                <div className="mt-2 flex items-start gap-2 rounded-md border border-red-100 bg-red-50 p-2.5 text-xs text-red-600">
                  <p>
                    <strong className="font-semibold text-red-700">
                      API Sync Failed:{" "}
                    </strong>
                    Failed to sync this comment to OTRS. (The system is retrying
                    in the background.)
                  </p>
                </div>
              </details>
            )}

            <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
              <div className="relative flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleLikeComment(comment.id)}
                  className="inline-flex items-center justify-center rounded-md p-1 transition-colors hover:bg-zinc-100 hover:text-zinc-700">
                  {hasLiked ? (
                    <HandThumbUpSolid className="h-4 w-4 text-zinc-700" />
                  ) : (
                    <HandThumbUpOutline className="h-4 w-4" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowLikeUsers((previous) => !previous)}
                  className="rounded-md px-1 py-0.5 transition-colors hover:bg-zinc-100 hover:text-zinc-700">
                  {likes.length} like{likes.length === 1 ? "" : "s"}
                </button>

                {showLikeUsers && likes.length > 0 && (
                  <ul className="absolute left-0 top-full z-20 mt-1 min-w-max rounded-lg border border-zinc-200 bg-white py-1 shadow-sm">
                    {likes.map((like) => (
                      <li
                        key={like.user.id}
                        className="px-3 py-1 text-xs text-zinc-600">
                        {like.user.name ?? "Unknown"}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowReplyForm((previous) => !previous)}
                className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 transition-colors hover:bg-zinc-100 hover:text-zinc-700">
                <ChatBubbleOvalLeftEllipsisIcon className="h-4 w-4" />
                {showReplyForm ? "Cancel" : "Reply"}
              </button>
            </div>

            <div className="mt-2">
              <CommentInput
                ticketId={ticketId}
                parentId={comment.id}
                isReply
                showReplyForm={showReplyForm}
                setShowReplyForm={setShowReplyForm}
              />
            </div>
          </div>
        </div>
      </article>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-2">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              ticketId={ticketId}
              setComments={_setComments}
              depth={depth + 1}
            />
          ))}
        </div>
      )}

      {/* 🔍 Fullscreen Modal */}
      {fullscreenImage &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={() => setFullscreenImage(null)}>
            <div className="relative max-h-full max-w-full">
              <button
                onClick={() => setFullscreenImage(null)}
                className="absolute -right-12 top-0 rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white">
                <XMarkIcon className="h-8 w-8" />
              </button>

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fullscreenImage}
                alt="Fullscreen View"
                className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}