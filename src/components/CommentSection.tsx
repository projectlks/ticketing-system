"use client";

import { useEffect, useRef, useState } from "react";
import type { Comment } from "../generated/prisma/client";

import CommentInput from "./CommentInput";
import CommentItem from "./CommentItem";
import { getSocket, joinTicket } from "@/libs/socket-client";

export type CommentWithRelations = Comment & {
  commenter?: {
    id: string | null;
    name: string | null;
    email: string | null;
  } | null;
  replies?: CommentWithRelations[];
  likes?: { id: string; user: { id: string; name: string; email: string } }[];
};

interface Props {
  ticketId: string;
  comments: CommentWithRelations[];
}

function insertCommentIntoTree(
  nodes: CommentWithRelations[],
  incoming: CommentWithRelations,
): CommentWithRelations[] {
  if (nodes.some((node) => node.id === incoming.id)) return nodes;

  if (!incoming.parentId) {
    return [...nodes, incoming];
  }

  return nodes.map((node) => {
    if (node.id === incoming.parentId) {
      return {
        ...node,
        replies: [...(node.replies || []), incoming],
      };
    }

    if (node.replies?.length) {
      return {
        ...node,
        replies: insertCommentIntoTree(node.replies, incoming),
      };
    }

    return node;
  });
}

export default function CommentSection({
  ticketId,
  comments: initialComments,
}: Props) {
  // Initial server comments ကို state initializer ထဲမှာတစ်ခါတည်းထည့်ထားပြီး
  // realtime event တွေကိုပဲ state update လုပ်သွားတဲ့ pattern နဲ့ lint rule ကိုလည်းလိုက်နာထားပါတယ်။
  const [comments, setComments] = useState<CommentWithRelations[]>(
    () => initialComments || [],
  );
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const commentsEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  const scrollToBottom = (smooth = true) => {
    commentsEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
    });
  };

  useEffect(() => {
    const socket = getSocket();
    joinTicket(ticketId);

    const handleTyping = (data: { ticketId: string; userName: string }) => {
      if (data.ticketId !== ticketId) return;

      if (!isTypingRef.current) {
        isTypingRef.current = true;
        setTypingUser(data.userName);
      }

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      typingTimeoutRef.current = setTimeout(() => {
        isTypingRef.current = false;
        setTypingUser(null);
      }, 5000);
    };

    socket.on("user-typing", handleTyping);

    return () => {
      socket.off("user-typing", handleTyping);
    };
  }, [ticketId]);

  useEffect(() => {
    const socket = getSocket();
    socket.emit("join-ticket", ticketId);

    const handleNewComment = (comment: CommentWithRelations) => {
      if (comment.ticketId !== ticketId) return;

      setComments((previous) => {
        const updated = insertCommentIntoTree(previous, comment);

        if (!comment.parentId) {
          setTimeout(() => scrollToBottom(true), 0);
        }

        return updated;
      });
    };

    socket.on("new-comment", handleNewComment);

    return () => {
      socket.off("new-comment", handleNewComment);
    };
  }, [ticketId]);

  useEffect(() => {
    setTimeout(() => {
      scrollToBottom(false);
    }, 0);
  }, []);

  return (
    <section className="flex h-full min-h-[440px] flex-col">
      <header className="mb-3 flex items-center justify-between border-b border-zinc-100 pb-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-zinc-900">
            Comments
          </h2>
          <p className="text-xs text-zinc-500">
            {comments.length} {comments.length === 1 ? "message" : "messages"}
          </p>
        </div>

        {typingUser && (
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs text-zinc-600">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-500" />
            {typingUser} is typing
          </div>
        )}
      </header>

      <div id="commentsSection" className="h-[42vh] overflow-y-auto pr-1 sm:h-[48vh]">
        {comments.length === 0 && (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-5 text-center text-sm text-zinc-500">
            No comments yet. Start the conversation.
          </div>
        )}

        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            ticketId={ticketId}
            setComments={setComments}
          />
        ))}

        <div ref={commentsEndRef} />
      </div>

      <div className="mt-3 border-t border-zinc-100 pt-3">
        <CommentInput ticketId={ticketId} />
      </div>
    </section>
  );
}
