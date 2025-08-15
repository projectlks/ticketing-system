"use client";

import { useState, useEffect } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { CommentWithRelations } from "./TicketView";
import CommentItem from "./CommentItem";
import CommentInput from "./CommentInput";

interface Props {
  ticketId: string;
  comments: CommentWithRelations[];
}

export default function CommentSection({ ticketId, comments: initialComments }: Props) {
  const [showComments, setShowComments] = useState(true);
  const [comments, setComments] = useState<CommentWithRelations[]>([]);

  useEffect(() => {
    setComments(initialComments || []);
  }, [initialComments]);

  // This only updates state, does NOT call uploadComment
  // const handleReply = async (parentId: string, replyComment: CommentWithRelations) => {
  //   setComments(prev =>
  //     prev.map(c =>
  //       c.id === parentId ? { ...c, replies: [replyComment, ...(c.replies || [])] } : c
  //     )
  //   );
  // };


  const handleReply = async (parentId: string, replyComment: CommentWithRelations) => {
    const updateReplies = (comments: CommentWithRelations[]): CommentWithRelations[] => {
      return comments.map(c => {
        if (c.id === parentId) {
          return { ...c, replies: [replyComment, ...(c.replies || [])] };
        } else if (c.replies && c.replies.length > 0) {
          return { ...c, replies: updateReplies(c.replies) };
        }
        return c;
      });
    };

    setComments(prev => updateReplies(prev));
  };


  return (
    <div className="col-span-2">
      <CommentInput setComments={setComments} ticketId={ticketId} />

      {/* Toggle Comments */}
      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowComments(prev => !prev)}
          className="flex items-center space-x-2 group hover:text-indigo-600 text-gray-700"
          aria-expanded={showComments}
          aria-controls="commentsSection"
        >
          <h2 className="text-md">Comments : {comments.length}</h2>
          {!showComments ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
        </button>
      </div>

      {/* Comment List */}
      {showComments && (
        <div id="commentsSection" className="mt-4 space-y-4">
          {comments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              ticketId={ticketId}
              setComments={setComments}
              onReply={handleReply}
            />
          ))}
        </div>
      )}
    </div>
  );
}
