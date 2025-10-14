'use client';

import ViewContext from '@/components/ViewContext';
import AssignBox from './AssignBox';
import StatusBox from './StatusBox';
import Image from 'next/image';
import CommentBox from './CommentBox';
import { useTranslations } from 'next-intl';
import { CommentWithRelations, TicketWithRelations } from './TicketView';
import AuditLogList from '@/components/AuditLogList';
import { Audit } from '@prisma/client';
import { ArrowDownCircleIcon } from '@heroicons/react/24/outline';

type TicketDetailsProps = {
    ticket: TicketWithRelations;
    users: { id: string; name: string; email: string }[];
    comments: CommentWithRelations[];
    auditLog?: Audit[];
};

export enum Status {
    OPEN = "OPEN",
    IN_PROGRESS = "IN_PROGRESS",
    RESOLVED = "RESOLVED",
    CLOSED = "CLOSED",
}

export default function TicketDetails({ ticket, users, comments, auditLog }: TicketDetailsProps) {
    const t = useTranslations('viewContext');
    const tHistory = useTranslations("historyLog");
    return (

        <>

            {/* Left Side: Ticket Details */}
            <div className="h-fit md:sticky col-span-2 top-0 border-l-4 border-indigo-500 shadow-sm transition-shadow hover:shadow-md rounded-lg bg-white dark:bg-gray-800 dark:border-indigo-700 dark:shadow-md">
                <div className="gap-2 pb-4 px-6 pt-6">
                    <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">{t('ticketDetails')}</h2>
                </div>

                <div className="pt-2 px-6 pb-6 text-gray-900 dark:text-gray-100">
                    <div className="space-y-4">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <h3 className="text-xl font-semibold leading-none">{ticket.title}</h3>
                                <p>{ticket.description}</p>
                            </div>
                        </div>

                        <div className="border-t border-gray-200 dark:border-gray-700" />

                        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <ViewContext label={t('id')} value={ticket.ticketId} />
                            <ViewContext label={t('status')} value={ticket.status} />
                            <ViewContext label={t('priority')} value={ticket.priority} />
                            <ViewContext
                                label={t('createdAt')}
                                value={new Date(ticket.createdAt).toLocaleString('en-US', { timeZone: 'Asia/Yangon' })}
                            />
                            <ViewContext
                                label={t('updatedAt')}
                                value={new Date(ticket.updatedAt).toLocaleString('en-US', { timeZone: 'Asia/Yangon' })}
                            />
                            <ViewContext label={t('category')} value={ticket.category?.name || '-'} />
                            {/* <ViewContext label={t('subCategory')} value={ticket.subcategory?.name || '-'} /> */}
                            <ViewContext label={t('department')} value={ticket.department?.name || '-'} />
                            <ViewContext label={t('requester')} value={ticket.requester?.name || '-'} />

                            <AssignBox users={users} ticket={{ id: ticket.id, assignedToId: ticket.assignedToId || '', assignedTo: ticket.assignedTo }} />
                            <StatusBox ticket={{ id: ticket.id, status: ticket.status as Status }} />

                            <div className="col-span-2">
                                <h3 className="text-lg font-semibold mb-2">Images</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                    {ticket.images.length > 0 ? (


                                        ticket.images.map((image) => (
                                            <a
                                                href={image.url}
                                                download={`ticket-image-${image.id}.jpg`}
                                                key={image.id}
                                                className="group relative overflow-hidden rounded-lg"
                                            >
                                                {/* Overlay with Download Button */}
                                                <div
                                                    className="absolute inset-0 bg-transparent flex justify-center items-center
      group-hover:bg-[rgba(0,0,0,0.5)] transition-colors"
                                                >
                                                    <div

                                                        className="w-[50px] aspect-square group-hover:opacity-100 opacity-0 rounded-full 
        bg-gray-800/70 flex justify-center items-center"
                                                    >
                                                        <ArrowDownCircleIcon className="w-10 h-10 text-white" />

                                                    </div>
                                                </div>

                                                {/* Image */}
                                                <Image
                                                    src={image.url}
                                                    alt={`Ticket image ${image.id}`}
                                                    width={500}
                                                    height={500}
                                                    className="object-cover w-full h-auto"
                                                />
                                            </a>
                                        ))


                                    ) : (
                                        <p className="text-gray-500 dark:text-gray-400">No images attached.</p>
                                    )}
                                </div>
                            </div>

                            <div className="border-t col-span-2 my-[50px] border-gray-200 dark:border-gray-700" />

                            <CommentBox ticketId={ticket.id} comments={comments} />
                        </dl>
                    </div>
                </div>
            </div>

            {/* Right Side: Audit Log */}
            <div className="border-l-4 border-indigo-300 shadow-sm transition-shadow hover:shadow-md rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 dark:shadow-md">
                <div className="pb-4 px-6 pt-6">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                        <span>{tHistory("title")}</span>
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground dark:text-gray-400">
                        {tHistory("description.ticket")}
                    </p>
                </div>
                <div className="pt-2 px-6 pb-6">
                    <AuditLogList items={auditLog} />
                </div>
            </div>


        </>



    );
}
