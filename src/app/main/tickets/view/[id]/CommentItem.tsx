"use client";

import { useState } from "react";
import Image from "next/image";
import moment from "moment";
import { CommentWithRelations } from "./TicketView";
import { ChatBubbleOvalLeftEllipsisIcon, HandThumbUpIcon as HandThumbUpOutline } from "@heroicons/react/24/outline";
import { HandThumbUpIcon as HandThumbUpSolid } from "@heroicons/react/24/solid";
import { useSession } from "next-auth/react";
import { likeComment } from "../../action";
import CommentInput from "./CommentInput";
import Avatar from "@/components/Avatar";

interface Like {
    id?: string;
    user: { id: string; name: string | null; email: string | null };
}

interface Props {
    comment: CommentWithRelations;
    ticketId: string;
    setComments: React.Dispatch<React.SetStateAction<CommentWithRelations[]>>;
    onReply: (parentId: string, replyComment: CommentWithRelations) => Promise<void>;
}

export default function CommentItem({ comment, ticketId, setComments, onReply }: Props) {
    const { data: session } = useSession();
    const currentUserId = session?.user?.id;

    const [showReplyForm, setShowReplyForm] = useState(false);
    const [showLikeUsers, setShowLikeUsers] = useState(false);
    const [likes, setLikes] = useState<Like[]>(comment.likes ?? []);

    const hasLiked = likes.some(like => like.user.id === currentUserId);

    const handleLikeComment = async (commentId: string) => {
        if (!currentUserId) return;
        const result = await likeComment({ commentId });
        if (result.liked) {
            setLikes(prev => [...prev, { id: `${commentId}-${currentUserId}`, user: { id: currentUserId, name: session?.user?.name ?? null, email: session?.user?.email ?? null } }]);
        } else {
            setLikes(prev => prev.filter(like => like.user.id !== currentUserId));
        }
    };

    return (
        <div className="  p-3 rounded-lg  mb-3 relative">

            <div className="bg-gray-50 border border-gray-300 p-3 rounded ">


                <div className="flex justify-between items-center">
                    <div className="text-gray-600 flex space-x-2 items-center">
                        <span className="relative mr-3 overflow-hidden rounded-full h-11 w-11">

                            <Avatar name={comment.commenter?.name} />
                        </span>
                        <span>
                            <h3 className="text-sm leading-5">{comment.commenter?.name ?? "Unknown"}</h3>
                            <p className="text-[10px]">{comment.commenter?.email ?? "-"}</p>
                        </span>
                    </div>
                    <span className="text-xs text-gray-500">{moment(comment.createdAt).fromNow()}</span>
                </div>

                <p className="mt-2 ml-1 text-sm text-gray-800">{comment.content}</p>
                {comment.imageUrl && <Image src={comment.imageUrl} alt={`Image by ${comment.commenter?.name}`} className="mt-2 rounded" width={320} height={160} unoptimized />}

                <div className="mt-2 flex items-center space-x-3">
                    <div className="relative flex items-center space-x-2">
                        <button onClick={() => handleLikeComment(comment.id)}>
                            {hasLiked ? <HandThumbUpSolid className="w-5 h-5 text-blue-500" /> : <HandThumbUpOutline className="w-5 h-5 text-gray-400" />}
                        </button>
                        <span className="text-xs cursor-pointer hover:underline" onClick={() => setShowLikeUsers(prev => !prev)}>{likes.length} Likes</span>
                        {showLikeUsers && likes.length > 0 && (
                            <ul className="absolute left-0 top-full mt-1 py-1 max-h-60 overflow-auto border border-gray-300 bg-white shadow-lg rounded z-50">
                                {likes.map(like => <li key={like.user.id} className="px-3 text-[10px] whitespace-nowrap text-gray-700">{like.user.name ?? "Unknown"}</li>)}
                            </ul>
                        )}
                    </div>

                    <button onClick={() => setShowReplyForm(prev => !prev)} className="flex items-center space-x-2 text-xs cursor-pointer hover:underline">
                        <ChatBubbleOvalLeftEllipsisIcon className="h-5 w-5 text-gray-600" />
                        <span>{showReplyForm ? "Cancel" : "Reply"}</span>
                    </button>
                </div>
            </div>
            {showReplyForm && (
                <div className="mt-2 ml-8">
                    <CommentInput ticketId={ticketId} parentId={comment.id} setComments={setComments} onReply={onReply} />
                </div>
            )}

            {comment.replies && comment.replies.length > 0 && (
                <div className=" relative  pl-4">

                    {comment.replies.length > 1 && (<span className="absolute left-[20px] h-[calc(100%-70px)] bg-indigo-500 w-px "></span>)}

                    {comment.replies.map((reply, ind) => (


                        <>
                            <div className="   pl-5  relative">
                                {/* <span className="absolute left-1 h-1/2 bg-red-500 w-px "></span> */}


                                <span className="absolute left-1 h-[74px] bg-indigo-500 w-px "></span>
                                <span className="absolute left-1 top-[74px]  h-px bg-indigo-500 w-[40px] "></span>


                                {
                                    (comment.replies && comment.replies.length > 0 && comment.replies.length === ind +1) && (
                                    <span className="absolute left-1 top-[82px]  h-[calc(100%-82px)] bg-white w-[4px] "></span>
                                
                                )
                                }



                                <span
                                    aria-hidden="true"
                                    className="absolute left-0 top-[70px] inline-flex h-2 w-2 items-center justify-center bg-white rounded-full bg-foreground ring-4 ring-indigo-500 ring-background"
                                />
                                <CommentItem key={reply.id} comment={reply} ticketId={ticketId} setComments={setComments} onReply={onReply} />
                            </div>
                        </>
                    ))}
                </div>
            )}
        </div>
    );
}
