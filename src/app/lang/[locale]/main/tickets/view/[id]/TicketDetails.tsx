'use client';

import ViewContext from '@/components/ViewContext';
import AssignBox from './AssignBox';
import StatusBox from './StatusBox';
import Image from 'next/image';
import CommentBox from './CommentBox';
import { useTranslations } from 'next-intl';
import { CommentWithRelations, TicketWithRelations } from './TicketView';

type TicketDetailsProps = {
    ticket: TicketWithRelations;
    users: { id: string; name: string; email: string }[];
    comments: CommentWithRelations[];
};

export enum Status {
    OPEN = "OPEN",
    IN_PROGRESS = "IN_PROGRESS",
    RESOLVED = "RESOLVED",
    CLOSED = "CLOSED",
}

export default function TicketDetails({ ticket, users, comments }: TicketDetailsProps) {
    const t = useTranslations('viewContext');

    return (
        <div className="h-fit md:sticky col-span-2 top-0 border-l-4 border-indigo-500 shadow-sm transition-shadow hover:shadow-md rounded-lg bg-white">
            <div className="gap-2 pb-4 px-6 pt-6">
                <h2 className="text-lg font-semibold text-indigo-600">{t('ticketDetails')}</h2>
            </div>

            <div className="pt-2 px-6 pb-6">
                <div className="space-y-4">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <h3 className="text-xl font-semibold leading-none">{ticket.title}</h3>
                            <p>{ticket.description}</p>
                        </div>
                    </div>

                    <div className="border-t border-gray-200" />

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
                        <ViewContext label={t('subCategory')} value={ticket.subcategory?.name || '-'} />
                        <ViewContext label={t('department')} value={ticket.department?.name || '-'} />
                        <ViewContext label={t('requester')} value={ticket.requester?.name || '-'} />

                        <AssignBox users={users} ticket={{ id: ticket.id, assignedToId: ticket.assignedToId || '', assignedTo: ticket.assignedTo }} />
                        {/* <StatusBox ticket={{ id: ticket.id, status: ticket.status as Status }} /> */}
                        <StatusBox ticket={{ id: ticket.id, status: ticket.status as Status }} />

                        <div className="col-span-2">
                            <h3 className="text-lg font-semibold mb-2">Images</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                {ticket.images.length > 0
                                    ? ticket.images.map((image) => (
                                        <div key={image.id} className="overflow-hidden rounded-lg">
                                            <Image
                                                src={image.url}
                                                alt={`Ticket image ${image.id}`}
                                                width={500}
                                                height={500}
                                                className="object-cover w-full h-auto"
                                            />
                                        </div>
                                    ))
                                    : <p>No images attached.</p>}
                            </div>
                        </div>

                        <div className="border-t col-span-2 my-[50px] border-gray-200" />

                        <CommentBox ticketId={ticket.id} comments={comments} />
                    </dl>
                </div>
            </div>
        </div>
    );
}
