"use client";

import Image from "next/image";
import moment from "moment";
import React, { useState } from "react";
import {
  ChatBubbleOvalLeftEllipsisIcon,
  HandThumbUpIcon as HandThumbUpOutline,
} from "@heroicons/react/24/outline";
import { HandThumbUpIcon as HandThumbUpSolid } from "@heroicons/react/24/solid";
import { useSession } from "next-auth/react";

import Avatar from "@/components/Avatar";
import { likeComment } from "@/libs/action";

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
}

export default function CommentItem({
  comment,
  ticketId,
  setComments: _setComments,
}: Props) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showLikeUsers, setShowLikeUsers] = useState(false);
  const [likes, setLikes] = useState<Like[]>(comment.likes ?? []);

  const hasLiked = likes.some((like) => like.user.id === currentUserId);

  const handleLikeComment = async (commentId: string) => {
    if (!currentUserId) return;

    const result = await likeComment({ commentId });

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
    <article className="mb-3 rounded-xl border border-zinc-200 bg-white p-3">
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
              {moment(comment.createdAt).fromNow()}
            </p>
          </div>
          <p className="truncate text-[11px] text-zinc-500">
            {comment.commenter?.email ?? "-"}
          </p>

          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
            {comment.content}
          </p>

          {comment.imageUrl && (
            <Image
              src={comment.imageUrl}
              alt={`Attachment by ${comment.commenter?.name ?? "unknown user"}`}
              width={420}
              height={260}
              className="mt-2 max-h-56 w-auto rounded-lg border border-zinc-200 object-cover"
              unoptimized
            />
          )}

          <div className="mt-2 flex items-center gap-4 text-xs text-zinc-500">
            <div className="relative flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleLikeComment(comment.id)}
                className="inline-flex items-center justify-center rounded-md p-1 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                aria-label={hasLiked ? "Unlike comment" : "Like comment"}>
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
                    <li key={like.user.id} className="px-3 py-1 text-xs text-zinc-600">
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

          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 space-y-2 border-l border-zinc-200 pl-3">
              {/* Reply thread ကို recursive component နဲ့ပြထားလို့ nested reply depth တိုးလာလည်း UI logic တစ်မျိုးတည်းနဲ့ run ဖြစ်ပါတယ်။ */}
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  ticketId={ticketId}
                  setComments={_setComments}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
