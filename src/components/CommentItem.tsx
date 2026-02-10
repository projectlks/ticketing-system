// "use client";

// import { useState } from "react";
// import Image from "next/image";
// import moment from "moment";
// // import { CommentWithRelations } from "./TicketView";
// import {
//   ChatBubbleOvalLeftEllipsisIcon,
//   HandThumbUpIcon as HandThumbUpOutline,
// } from "@heroicons/react/24/outline";
// import { HandThumbUpIcon as HandThumbUpSolid } from "@heroicons/react/24/solid";
// import { useSession } from "next-auth/react";
// // import { likeComment } from "../../action";
// import CommentInput from "./CommentInput";
// import Avatar from "@/components/Avatar";
// import { CommentWithRelations } from "./CommentBox";
// import { likeComment } from "@/libs/action";

// interface Like {
//   id?: string;
//   user: { id: string; name: string | null; email: string | null };
// }

// interface Props {
//   comment: CommentWithRelations;
//   ticketId: string;
//   setComments: React.Dispatch<React.SetStateAction<CommentWithRelations[]>>;
//   // onReply: (
//   //   parentId: string,
//   //   replyComment: CommentWithRelations,
//   // ) => Promise<void>;
// }

// export default function CommentItem({
//   comment,
//   ticketId,
//   setComments,
//   // onReply,
// }: Props) {
//   const { data: session } = useSession();
//   const currentUserId = session?.user?.id;

//   const [showReplyForm, setShowReplyForm] = useState(false);
//   const [showLikeUsers, setShowLikeUsers] = useState(false);
//   const [likes, setLikes] = useState<Like[]>(comment.likes ?? []);

//   const hasLiked = likes.some((like) => like.user.id === currentUserId);

//   const handleLikeComment = async (commentId: string) => {
//     if (!currentUserId) return;
//     const result = await likeComment({ commentId });
//     if (result.liked) {
//       setLikes((prev) => [
//         ...prev,
//         {
//           id: `${commentId}-${currentUserId}`,
//           user: {
//             id: currentUserId,
//             name: session?.user?.name ?? null,
//             email: session?.user?.email ?? null,
//           },
//         },
//       ]);
//     } else {
//       setLikes((prev) => prev.filter((like) => like.user.id !== currentUserId));
//     }
//   };

//   return (
//     <div className="  p-3 rounded-lg  mb-3 relative">
//       <div className="bg-gray-50 border border-gray-300 p-3 rounded ">
//         <div className="flex justify-between items-center">
//           <div className="text-gray-600 flex space-x-2 items-center">
//             <span className="relative mr-3 overflow-hidden rounded-full h-11 w-11">
//               <Avatar name={comment.commenter?.name} />
//             </span>
//             <span>
//               <h3 className="text-sm leading-5">
//                 {comment.commenter?.name ?? "Unknown"}
//               </h3>
//               <p className="text-[10px]">{comment.commenter?.email ?? "-"}</p>
//             </span>
//           </div>
//           <span className="text-xs text-gray-500">
//             {moment(comment.createdAt).fromNow()}
//           </span>
//         </div>

//         <p className="mt-2 ml-1 text-sm text-gray-800">{comment.content}</p>
//         {comment.imageUrl && (
//           <Image
//             src={comment.imageUrl}
//             alt={`Image by ${comment.commenter?.name}`}
//             className="mt-2 rounded border border-gray-200"
//             width={320}
//             height={160}
//             unoptimized
//           />
//         )}

//         <div className="mt-2 flex items-center space-x-3">
//           <div className="relative flex items-center space-x-2">
//             <button onClick={() => handleLikeComment(comment.id)}>
//               {hasLiked ? (
//                 <HandThumbUpSolid className="w-5 h-5 text-blue-500" />
//               ) : (
//                 <HandThumbUpOutline className="w-5 h-5 text-gray-400" />
//               )}
//             </button>
//             <span
//               className="text-xs cursor-pointer hover:underline"
//               onClick={() => setShowLikeUsers((prev) => !prev)}>
//               {likes.length} Likes
//             </span>
//             {showLikeUsers && likes.length > 0 && (
//               <ul className="absolute left-0 top-full mt-1 py-1 max-h-60 overflow-auto border border-gray-300 bg-white shadow-lg rounded z-50">
//                 {likes.map((like) => (
//                   <li
//                     key={like.user.id}
//                     className="px-3 text-[10px] whitespace-nowrap text-gray-700">
//                     {like.user.name ?? "Unknown"}
//                   </li>
//                 ))}
//               </ul>
//             )}
//           </div>

//           <button
//             onClick={() => setShowReplyForm((prev) => !prev)}
//             className="flex items-center space-x-2 text-xs cursor-pointer hover:underline">
//             <ChatBubbleOvalLeftEllipsisIcon className="h-5 w-5 text-gray-600" />
//             <span>{showReplyForm ? "Cancel" : "Reply"}</span>
//           </button>
//         </div>
//       </div>
//       {showReplyForm && (
//         <div className="mt-2 ml-8">
//           <CommentInput
//             ticketId={ticketId}
//             parentId={comment.id}
//           />
//         </div>
//       )}

//       {comment.replies && comment.replies.length > 0 && (
//         <div className=" relative  pl-4">
//           {comment.replies.length > 1 && (
//             <span className="absolute left-5 h-[calc(100%-70px)] bg-indigo-500 w-px "></span>
//           )}

//           {comment.replies.map((reply, ind) => (
//             <div key={reply.id} className="   pl-5  relative">
//               {/* <span className="absolute left-1 h-1/2 bg-red-500 w-px "></span> */}

//               <span className="absolute left-1 h-[74px] bg-indigo-500 w-px "></span>
//               <span className="absolute left-1 top-[74px]  h-px bg-indigo-500 w-10 "></span>

//               {comment.replies &&
//                 comment.replies.length > 0 &&
//                 comment.replies.length === ind + 1 && (
//                   <span className="absolute left-1 top-[82px]  h-[calc(100%-82px)] bg-white w-1 "></span>
//                 )}

//               <span
//                 aria-hidden="true"
//                 className="absolute left-0 top-[70px] inline-flex h-2 w-2 items-center justify-center bg-white rounded-full bg-foreground ring-4 ring-indigo-500 ring-background"
//               />
//               <CommentItem
//                 key={reply.id}
//                 comment={reply}
//                 ticketId={ticketId}
//                 setComments={setComments}
//               />
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

"use client";

import React from "react";

import { useState } from "react";
import Image from "next/image";
import moment from "moment";
// import { CommentWithRelations } from "./TicketView";
import {
  ChatBubbleOvalLeftEllipsisIcon,
  HandThumbUpIcon as HandThumbUpOutline,
} from "@heroicons/react/24/outline";
import { HandThumbUpIcon as HandThumbUpSolid } from "@heroicons/react/24/solid";
import { useSession } from "next-auth/react";
// import { likeComment } from "../../action";
import CommentInput from "./CommentInput";
import Avatar from "@/components/Avatar";
import { CommentWithRelations } from "./CommentSection";
import { likeComment } from "@/libs/action";

interface Like {
  id?: string;
  user: { id: string; name: string | null; email: string | null };
}

interface Props {
  comment: CommentWithRelations;
  ticketId: string;
  setComments: React.Dispatch<React.SetStateAction<CommentWithRelations[]>>;
  // onReply: (
  //   parentId: string,
  //   replyComment: CommentWithRelations,
  // ) => Promise<void>;
}

export default function CommentItem({
  comment,
  ticketId,
  setComments,
  // onReply,
}: Props) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  // UI state: reply form ဖွင့်/ပိတ်, like လုပ်ထားသူတွေ list ပြ/ဖျောက်, likes ကို local မှာ update (optimistic UX)
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showLikeUsers, setShowLikeUsers] = useState(false);
  const [likes, setLikes] = useState<Like[]>(comment.likes ?? []);

  const hasLiked = likes.some((like) => like.user.id === currentUserId);

  // Like/unlike ကို server action နဲ့ toggle လုပ်ပြီး local state ကို update
  const handleLikeComment = async (commentId: string) => {
    if (!currentUserId) return;
    const result = await likeComment({ commentId });
    if (result.liked) {
      setLikes((prev) => [
        ...prev,
        {
          id: `${commentId}-${currentUserId}`,
          user: {
            id: currentUserId,
            name: session?.user?.name ?? null,
            email: session?.user?.email ?? null,
          },
        },
      ]);
    } else {
      setLikes((prev) => prev.filter((like) => like.user.id !== currentUserId));
    }
  };

  return (
    <div className="mb-6 relative">
      <div className="py-4 px-0">
        <div className="flex items-start gap-3 mb-2">
          <div className="relative overflow-hidden rounded-full h-9 w-9 shrink-0 bg-gray-100">
            <Avatar name={comment.commenter?.name} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-900">
                {comment.commenter?.name ?? "Unknown"}
              </span>
              <span className="text-xs text-gray-400">
                {moment(comment.createdAt).fromNow()}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {comment.commenter?.email ?? "-"}
            </p>
          </div>
        </div>

        <div className="ml-12">
          <p className="text-sm text-gray-700 leading-relaxed">
            {comment.content}
          </p>
          {comment.imageUrl && (
            <Image
              src={comment.imageUrl || "/placeholder.svg"}
              alt={`Image by ${comment.commenter?.name}`}
              className="mt-3 rounded object-cover"
              width={320}
              height={160}
              unoptimized
            />
          )}

          <div className="mt-3 flex items-center gap-5 text-xs text-gray-500">
            <div className="relative flex items-center gap-2">
              <button
                onClick={() => handleLikeComment(comment.id)}
                className="hover:text-gray-700 transition-colors"
                aria-label={hasLiked ? "Unlike comment" : "Like comment"}>
                {hasLiked ? (
                  <HandThumbUpSolid className="w-4 h-4 text-gray-700" />
                ) : (
                  <HandThumbUpOutline className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => setShowLikeUsers((prev) => !prev)}
                className="hover:text-gray-700 transition-colors relative">
                {likes.length > 0 && `${likes.length}`}
              </button>
              {showLikeUsers && likes.length > 0 && (
                <ul className="absolute left-0 top-full mt-2 py-1 px-0 max-h-60 overflow-auto bg-white border border-gray-200 rounded z-50 min-w-max text-xs">
                  {likes.map((like) => (
                    <li
                      key={like.user.id}
                      className="px-3 py-2 text-gray-600 hover:bg-gray-50">
                      {like.user.name ?? "Unknown"}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button
              onClick={() => setShowReplyForm((prev) => !prev)}
              className="flex items-center gap-1 hover:text-gray-700 transition-colors">
              <ChatBubbleOvalLeftEllipsisIcon className="h-4 w-4" />
              <span>{showReplyForm ? "Cancel" : "Reply"}</span>
            </button>
          </div>
        </div>
      </div>

      <CommentInput
        ticketId={ticketId}
        parentId={comment.id}
        isReply={true}
        showReplyForm={showReplyForm}
        setShowReplyForm={setShowReplyForm}
      />

      {/* Replies ရှိရင် nested comment အဖြစ် recursive ပြ (threaded view) */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="relative mt-4 ml-3 pl-5">
          <div className="absolute left-0 top-0 h-full w-px bg-gray-200"></div>

          {comment.replies.map((reply) => (
            <div key={reply.id} className="relative pt-2">
              <div className="absolute -left-3 top-4 w-3 h-px bg-gray-200"></div>

              <CommentItem
                key={reply.id}
                comment={reply}
                ticketId={ticketId}
                setComments={setComments}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
