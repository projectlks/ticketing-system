"use client";

import { useState, useEffect, useRef } from "react";
import CommentInput from "./CommentInput";
import CommentItem from "./CommentItem";
import type { Comment } from "../generated/prisma/client";
import { getSocket, joinTicket } from "@/libs/socket-client";
import { Player } from "@lottiefiles/react-lottie-player";

// Prisma `Comment` ကို UI မှာသုံးဖို့ relation (commenter / replies / likes) တွေနဲ့ ချဲ့ထားတဲ့ type
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

export default function CommentSection({
  ticketId,
  comments: initialComments,
}: Props) {
  // Socket ကနေ realtime update လုပ်ဖို့ comment list ကို local state ထဲမှာ ထိန်းထားပါတယ်
  const [comments, setComments] = useState<CommentWithRelations[]>([]);
  // တစ်ယောက်ယောက် typing လုပ်နေတယ်ဆိုတာ ပြသဖို့ (ticket အလိုက်) userName ကို ထိန်းထားပါတယ်
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const commentsEndRef = useRef<HTMLDivElement | null>(null);

  // Comment list update ပြီးတဲ့အခါ အောက်ဆုံးကို scroll ဆင်းစေတဲ့ helper (smooth/auto)
  const scrollToBottom = (smooth = true) => {
    commentsEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
    });
  };

  // Typing indicator ကို timeout နဲ့ ထိန်း (event မလာတော့ရင် ခဏနေရင် hide လုပ်)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    const socket = getSocket();

    // Ticket room ထဲ join လုပ်ထားမှ ဒီ ticket ရဲ့ event တွေကိုသာ ရနိုင်မယ်
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
      }, 5000); // နောက်ဆုံး typing event ပြီး 5s မလာတော့ရင် indicator ပျောက်
    };

    socket.on("user-typing", handleTyping);

    return () => {
      socket.off("user-typing", handleTyping);
    };
  }, [ticketId]);

  // Comment အသစ်တွေကို parent/reply structure အတိုင်း tree ထဲ insert လုပ်ဖို့ helper (recursive)

  const insertCommentIntoTree = (
    comments: CommentWithRelations[],
    newComment: CommentWithRelations,
  ): CommentWithRelations[] => {
    // Socket event ပွားလာနိုင်လို့ id နဲ့ duplicate ကာကွယ်
    if (comments.some((c) => c.id === newComment.id)) return comments;

    // parentId မရှိရင် top-level comment
    if (!newComment.parentId) {
      return [...comments, newComment];
    }

    return comments.map((c) => {
      if (c.id === newComment.parentId) {
        return {
          ...c,
          replies: [...(c.replies || []), newComment],
        };
      }

      if (c.replies?.length) {
        return {
          ...c,
          replies: insertCommentIntoTree(c.replies, newComment),
        };
      }

      return c;
    });
  };

  useEffect(() => {
    const socket = getSocket();

    // Server ကနေပို့တဲ့ realtime comment update ရဖို့ ticket room join
    socket.emit("join-ticket", ticketId);

    socket.on("new-comment", (comment: CommentWithRelations) => {
      if (comment.ticketId !== ticketId) return;

      // setComments((prev) => insertCommentIntoTree(prev, comment));

      setComments((prev) => {
        const updated = insertCommentIntoTree(prev, comment);

        // DOM update ပြီးမှ scroll (reply တင်တဲ့အခါ UX မပျက်အောင် top-level comment မှသာ auto-scroll)
        if (!comment.parentId) {
          setTimeout(() => scrollToBottom(true), 0);
        }

        return updated;
      });
    });

    return () => {
      socket.off("new-comment");
    };
  }, [ticketId]);

  useEffect(() => {
    setTimeout(() => {
      // Props ကနေလာတဲ့ initial comments ကို local state ထဲသွင်း (socket update နဲ့ မရောအောင်)
      setComments(initialComments || []);
      // render ပြီးမှ scroll
      setTimeout(() => {
        scrollToBottom(false);
      }, 1);
    }, 1);
  }, [initialComments]);

  return (
    <div className="h-[calc(100vh-40px)] p-5  flex flex-col">
      {/* COMMENTS – take remaining height */}
      <div
        id="commentsSection"
        className="flex-1 hiddenscrollbar overflow-y-auto space-y-1 
        ">
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

      {/* Footer / meta */}
      <div className="my-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-medium text-gray-700">
            {comments.length} {comments.length === 1 ? "comment" : "comments"}
          </h2>

          {typingUser && (
            <div className="flex items-center gap-1.5">
              <Player
                autoplay
                loop
                src="/typing.json"
                style={{ height: "20px", width: "20px" }}
              />
              <span className="text-xs text-gray-500">
                {typingUser} is typing
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Input – always at bottom */}
      <CommentInput ticketId={ticketId} />
    </div>
  );
}
