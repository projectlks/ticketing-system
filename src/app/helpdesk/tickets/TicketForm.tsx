"use client";

import { ToastContainer } from "react-toastify";
import { useSession } from "next-auth/react";
import CommentSection from "@/components/CommentSection";
import AssignmentSection from "@/components/ticket/AssignmentSection";
import AuditPanel from "@/components/ticket/AuditPanel";
import DescriptionInput from "@/components/ticket/DescriptionInput";
import Header from "@/components/ticket/Header";
import PrioritySection from "@/components/ticket/PrioritySection";
import RemarkInput from "@/components/ticket/RemarkInput";
import SubmitSection from "@/components/ticket/SubmitSection";
import TitleInput from "@/components/ticket/TitleInput";

import ImageInput from "./ImageInput";
import { TicketFormProps } from "./ticket.types";
import { useTicketForm } from "./useTicketForm";

export default function TicketForm(props: TicketFormProps) {
  const { data: session } = useSession();
  const {
    form,
    handleFieldChange,
    handleAssignmentChange,
    errors,
    liveValidationState,
    liveValidationActive,
    submitting,
    remark,
    setRemark,
    remarkError,
    priorityChanged,
    auditLogs,
    handleSubmit,
    images,
    setImages,
    existingImages,
    setExistingImages,
    handleRemoveExistingImage,
    ticketId,
  } = useTicketForm(props);
  const isSuperAdmin = session?.user.role === "SUPER_ADMIN" && session?.user.email === process.env.SUPER_ADMIN_EMAIL;
  const isSensitiveFieldLocked = props.mode === "edit" && !isSuperAdmin;

  const ribbonStatus =
    form.status === "RESOLVED" ||
    form.status === "CLOSED" ||
    form.status === "CANCELED"
      ? form.status
      : null;

  const ribbonStyles: Record<NonNullable<typeof ribbonStatus>, string> = {
    RESOLVED: "bg-emerald-600 text-emerald-50",
    CLOSED: "bg-zinc-700 text-zinc-50",
    CANCELED: "bg-rose-600 text-rose-50",
  };

  return (
    <div className="h-[calc(100vh-71px)] overflow-auto  bg-slate-50">
      <ToastContainer />

      <section className="mx-auto w-full max-w-400 relative px-4  py-5 sm:px-6 sm:py-6">
        <div
          className={`grid items-start relative  gap-5 ${
            ticketId
              ? "xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]"
              : "max-w-5xl mx-auto"
          }`}>
          {/* LEFT COLUMN: 
            1. 'sticky' + 'top-6' makes it stay at the top.
            2. 'self-start' ensures the container doesn't stretch to the full height of the grid.
          */}
          {/* <div className="xl:sticky xl:top-24 self-start rounded-2xl overflow-hidden  border border-zinc-200 p-5 bg-white shadow-sm sm:p-7"> */}
          <div className="xl:sticky xl:top-6 self-start rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7 overflow-x-hidden overflow-y-auto xl:max-h-[calc(100vh-6rem)]">
            {" "}
            {ribbonStatus && (
              <div className="pointer-events-none absolute -right-11.5 top-6 z-10 w-44 rotate-45">
                <div
                  className={`border border-white/25 py-1.5 text-center text-[11px] font-semibold tracking-[0.2em] shadow-sm ${ribbonStyles[ribbonStatus]}`}>
                  {ribbonStatus}
                </div>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
              <Header
                ticketId={form.ticketId ?? "NEW"}
                mode={props.mode}
                resolutionDue={form.resolutionDue}
                status={form.status!}
                onStatusChange={(status) => handleFieldChange("status", status)}
              />

              <TitleInput
                value={form.title}
                error={errors.title}
                validationState={liveValidationState.title}
                showValidation={Boolean(liveValidationActive.title)}
                disabled={isSensitiveFieldLocked}
                onChange={(title) => handleFieldChange("title", title)}
              />

              <PrioritySection
                value={form.priority}
                mode={props.mode}
                onChange={(priority) => handleFieldChange("priority", priority)}
              />

              <AssignmentSection
                departmentId={form.departmentId}
                categoryId={form.categoryId}
                assignedToId={form.assignedToId ?? ""}
                depts={props.depts}
                cats={props.cats}
                users={props.users}
                errors={errors}
                onChange={(name, value) => handleAssignmentChange(name, value)}
              />

              <RemarkInput
                value={remark}
                error={remarkError}
                visible={priorityChanged}
                onChange={setRemark}
              />

              <DescriptionInput
                value={form.description}
                error={errors.description}
                validationState={liveValidationState.description}
                showValidation={Boolean(liveValidationActive.description)}
                disabled={isSensitiveFieldLocked}
                onChange={(description) =>
                  handleFieldChange("description", description)
                }
              />

              <ImageInput
                images={images}
                setImages={setImages}
                existingImages={existingImages}
                setExistingImages={setExistingImages}
                onRemoveExistingImage={handleRemoveExistingImage}
              />

              <SubmitSection submitting={submitting} mode={props.mode} />
            </form>
          </div>

          {/* RIGHT COLUMN: This side will scroll normally */}
          {ticketId && (
            <aside className="space-y-5">
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
                <CommentSection
                  ticketId={ticketId}
                  comments={props.comment ?? []}
                />
              </div>

              <AuditPanel logs={auditLogs} />
            </aside>
          )}
        </div>
      </section>
    </div>
  );
}

