"use client";

import { ToastContainer } from "react-toastify";

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
  const {
    form,
    setForm,
    errors,
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
    ticketId,
  } = useTicketForm(props);

  return (
    <div className="min-h-screen bg-zinc-50">
      <ToastContainer />

      <section className="mx-auto w-full max-w-[1480px] px-4 py-5 sm:px-6 sm:py-6">
        {/* Edit mode မှာ comment + audit sidebar ထည့်ပြီး create mode မှာ form ကိုပဲ focus လုပ်ဖို့ layout ခွဲထားပါတယ်။ */}
        <div
          className={`grid items-start gap-5 ${
            ticketId ? "xl:grid-cols-[minmax(0,1fr)_420px]" : "max-w-5xl"
          }`}>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs sm:p-7">
            <form onSubmit={handleSubmit} className="space-y-6">
              <Header
                ticketId={form.ticketId ?? "NEW"}
                mode={props.mode}
                resolutionDue={form.resolutionDue}
                status={form.status!}
                onStatusChange={(status) => setForm((prev) => ({ ...prev, status }))}
              />

              <TitleInput
                value={form.title}
                error={errors.title}
                onChange={(title) => setForm((prev) => ({ ...prev, title }))}
              />

              <PrioritySection
                value={form.priority}
                mode={props.mode}
                onChange={(priority) => setForm((prev) => ({ ...prev, priority }))}
              />

              <AssignmentSection
                departmentId={form.departmentId}
                categoryId={form.categoryId}
                assignedToId={form.assignedToId ?? ""}
                depts={props.depts}
                cats={props.cats}
                users={props.users}
                errors={errors}
                onChange={(name, value) =>
                  setForm((prev) => ({
                    ...prev,
                    [name]: value,
                    ...(name === "departmentId"
                      ? { categoryId: "", assignedToId: "" }
                      : {}),
                  }))
                }
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
                onChange={(description) =>
                  setForm((prev) => ({ ...prev, description }))
                }
              />

              <ImageInput
                images={images}
                setImages={setImages}
                existingImages={existingImages}
                setExistingImages={setExistingImages}
              />

              <SubmitSection submitting={submitting} mode={props.mode} />
            </form>
          </div>

          {ticketId && (
            <aside className="space-y-5 xl:sticky xl:top-5">
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs sm:p-5">
                <CommentSection ticketId={ticketId} comments={props.comment ?? []} />
              </div>

              <AuditPanel logs={auditLogs} />
            </aside>
          )}
        </div>
      </section>
    </div>
  );
}
