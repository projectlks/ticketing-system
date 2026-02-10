// "use client";

// import { useState, useEffect, useRef } from "react";
// import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
// import CommentInput from "./CommentInput";
// import CommentItem from "./CommentItem";
// import type { Comment } from "../generated/prisma/client";
// import { getSocket, joinTicket } from "@/libs/socket-client";
// import { Player } from "@lottiefiles/react-lottie-player";

// export type CommentWithRelations = Comment & {
//   commenter?: {
//     id: string | null;
//     name: string | null;
//     email: string | null;
//   } | null;
//   replies?: CommentWithRelations[];
//   likes?: { id: string; user: { id: string; name: string; email: string } }[];
// };

// interface Props {
//   ticketId: string;
//   comments: CommentWithRelations[];
// }

// export default function CommentSection({
//   ticketId,
//   comments: initialComments,
// }: Props) {
//   const [showComments, setShowComments] = useState(true);
//   const [comments, setComments] = useState<CommentWithRelations[]>([]);
//   const [typingUser, setTypingUser] = useState<string | null>(null);

//   // const [typingUsers, setTypingUsers] = useState<string[]>([]);

//   const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
//   const isTypingRef = useRef(false);

//   useEffect(() => {
//     const socket = getSocket();

//     joinTicket(ticketId);

//     const handleTyping = (data: { ticketId: string; userName: string }) => {
//       if (data.ticketId !== ticketId) return;

//       if (!isTypingRef.current) {
//         isTypingRef.current = true;
//         setTypingUser(data.userName);
//       }

//       if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

//       typingTimeoutRef.current = setTimeout(() => {
//         isTypingRef.current = false;
//         setTypingUser(null);
//       }, 5000); // 1.8s after last event
//     };

//     socket.on("user-typing", handleTyping);

//     return () => {
//       socket.off("user-typing", handleTyping);
//     };
//   }, [ticketId]);

//   // for new commnets

//   const insertCommentIntoTree = (
//     comments: CommentWithRelations[],
//     newComment: CommentWithRelations,
//   ): CommentWithRelations[] => {
//     // prevent duplicates
//     if (comments.some((c) => c.id === newComment.id)) return comments;

//     // top-level comment
//     if (!newComment.parentId) {
//       return [newComment, ...comments];
//     }

//     return comments.map((c) => {
//       if (c.id === newComment.parentId) {
//         return {
//           ...c,
//           replies: [newComment, ...(c.replies || [])],
//         };
//       }

//       if (c.replies?.length) {
//         return {
//           ...c,
//           replies: insertCommentIntoTree(c.replies, newComment),
//         };
//       }

//       return c;
//     });
//   };

//   useEffect(() => {
//     const socket = getSocket();

//     socket.emit("join-ticket", ticketId);

//     socket.on("new-comment", (comment: CommentWithRelations) => {
//       if (comment.ticketId !== ticketId) return;

//       setComments((prev) => insertCommentIntoTree(prev, comment));
//     });

//     return () => {
//       socket.off("new-comment");
//     };
//   }, [ticketId]);

//   useEffect(() => {
//     setTimeout(() => {
//       setComments(initialComments || []);
//     }, 1);
//   }, [initialComments]);

//   // const handleReply = async (
//   //   parentId: string,
//   //   replyComment: CommentWithRelations,
//   // ) => {
//   //   const updateReplies = (
//   //     comments: CommentWithRelations[],
//   //   ): CommentWithRelations[] => {
//   //     return comments.map((c) => {
//   //       if (c.id === parentId)
//   //         return { ...c, replies: [replyComment, ...(c.replies || [])] };
//   //       else if (c.replies && c.replies.length > 0)
//   //         return { ...c, replies: updateReplies(c.replies) };
//   //       return c;
//   //     });
//   //   };
//   //   setComments((prev) => updateReplies(prev));
//   // };

//   return (
//     <div className="col-span-2 mt-5">
//       <CommentInput ticketId={ticketId} />

//       <div className="mt-6 flex items-center justify-between">
//         <div className="flex items-center space-x-3">
//           <h2 className="text-md font-medium text-gray-800">
//             Comments: {comments.length}
//           </h2>

//           {typingUser ? (
//             <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
//               <Player
//                 autoplay
//                 loop
//                 src="/typing.json"
//                 style={{ height: "30px", width: "30px" }}
//               />
//               <span className="text-xs text-gray-600 dark:text-gray-300 italic">
//                 {typingUser} is typing
//               </span>
//             </div>
//           ) : (
//             <div className="h-[38px]"></div>
//           )}
//         </div>

//         <button
//           type="button"
//           onClick={() => setShowComments((prev) => !prev)}
//           className="flex items-center space-x-2 rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
//           {!showComments ? (
//             <EyeSlashIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
//           ) : (
//             <EyeIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
//           )}
//         </button>
//       </div>

//       {showComments && (
//         <div id="commentsSection" className="mt-4 space-y-4">
//           {comments.map((comment) => (
//             <CommentItem
//               key={comment.id}
//               comment={comment}
//               ticketId={ticketId}
//               setComments={setComments}
//             />
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

"use client";

import { useState, useEffect, useRef } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import CommentInput from "./CommentInput";
import CommentItem from "./CommentItem";
import type { Comment } from "../generated/prisma/client";
import { getSocket, joinTicket } from "@/libs/socket-client";
import { Player } from "@lottiefiles/react-lottie-player";

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
  const [showComments, setShowComments] = useState(true);
  const [comments, setComments] = useState<CommentWithRelations[]>([]);
  const [typingUser, setTypingUser] = useState<string | null>(null);

  // const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

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
      }, 5000); // 1.8s after last event
    };

    socket.on("user-typing", handleTyping);

    return () => {
      socket.off("user-typing", handleTyping);
    };
  }, [ticketId]);

  // for new commnets

  const insertCommentIntoTree = (
    comments: CommentWithRelations[],
    newComment: CommentWithRelations,
  ): CommentWithRelations[] => {
    // prevent duplicates
    if (comments.some((c) => c.id === newComment.id)) return comments;

    // top-level comment
    if (!newComment.parentId) {
      return [newComment, ...comments];
    }

    return comments.map((c) => {
      if (c.id === newComment.parentId) {
        return {
          ...c,
          replies: [newComment, ...(c.replies || [])],
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

    socket.emit("join-ticket", ticketId);

    socket.on("new-comment", (comment: CommentWithRelations) => {
      if (comment.ticketId !== ticketId) return;

      setComments((prev) => insertCommentIntoTree(prev, comment));
    });

    return () => {
      socket.off("new-comment");
    };
  }, [ticketId]);

  useEffect(() => {
    setTimeout(() => {
      setComments(initialComments || []);
    }, 1);
  }, [initialComments]);

  // const handleReply = async (
  //   parentId: string,
  //   replyComment: CommentWithRelations,
  // ) => {
  //   const updateReplies = (
  //     comments: CommentWithRelations[],
  //   ): CommentWithRelations[] => {
  //     return comments.map((c) => {
  //       if (c.id === parentId)
  //         return { ...c, replies: [replyComment, ...(c.replies || [])] };
  //       else if (c.replies && c.replies.length > 0)
  //         return { ...c, replies: updateReplies(c.replies) };
  //       return c;
  //     });
  //   };
  //   setComments((prev) => updateReplies(prev));
  // };

  return (
    <div className="col-span-2 mt-8">
      <CommentInput ticketId={ticketId} />

      <div className="mt-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-medium text-gray-700">
            {comments.length} {comments.length === 1 ? "comment" : "comments"}
          </h2>

          {typingUser ? (
            <div className="flex items-center  gap-1.5">
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
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setShowComments((prev) => !prev)}
          className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
          aria-label={showComments ? "Hide comments" : "Show comments"}>
          {!showComments ? (
            <EyeSlashIcon className="w-4 h-4" />
          ) : (
            <EyeIcon className="w-4 h-4" />
          )}
        </button>
      </div>

      {showComments && (
        <div id="commentsSection" className="mt-6 space-y-1">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              ticketId={ticketId}
              setComments={setComments}
            />
          ))}
        </div>
      )}
    </div>
  );
}
