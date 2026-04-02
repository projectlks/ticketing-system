// "use client";

// import { ToastContainer } from "react-toastify";

// import CommentSection from "@/components/CommentSection";
// import AssignmentSection from "@/components/ticket/AssignmentSection";
// import AuditPanel from "@/components/ticket/AuditPanel";
// import DescriptionInput from "@/components/ticket/DescriptionInput";
// import Header from "@/components/ticket/Header";
// import PrioritySection from "@/components/ticket/PrioritySection";
// import RemarkInput from "@/components/ticket/RemarkInput";
// import SubmitSection from "@/components/ticket/SubmitSection";
// import TitleInput from "@/components/ticket/TitleInput";

// import ImageInput from "./ImageInput";
// import { TicketFormProps } from "./ticket.types";
// import { useTicketForm } from "./useTicketForm";

// export default function TicketForm(props: TicketFormProps) {
//   const {
//     form,
//     setForm,
//     errors,
//     submitting,
//     remark,
//     setRemark,
//     remarkError,
//     priorityChanged,
//     auditLogs,
//     handleSubmit,
//     images,
//     setImages,
//     existingImages,
//     setExistingImages,
//     ticketId,
//   } = useTicketForm(props);

//   return (
//     <div className="min-h-screen bg-zinc-50">
//       <ToastContainer />

//       <section className="mx-auto w-full max-w-[1480px]  relative px-4 py-5 sm:px-6 sm:py-6">
//         {/* Edit mode မှာ comment + audit sidebar ထည့်ပြီး create mode မှာ form ကိုပဲ focus လုပ်ဖို့ layout ခွဲထားပါတယ်။ */}
//         <div
//           className={`grid items-start relative  bg-red-400 gap-5 ${
//             ticketId ? "xl:grid-cols-[minmax(0,1fr)_420px]" : "max-w-5xl"
//           }`}>
//           <div className="rounded-2xl border border-zinc-200  p-5 sticky top-0   bg-zinc-50 shadow-xs sm:p-7">
//             <form onSubmit={handleSubmit} className="space-y-6">
//               <Header
//                 ticketId={form.ticketId ?? "NEW"}
//                 mode={props.mode}
//                 resolutionDue={form.resolutionDue}
//                 status={form.status!}
//                 onStatusChange={(status) =>
//                   setForm((prev) => ({ ...prev, status }))
//                 }
//               />

//               <TitleInput
//                 value={form.title}
//                 error={errors.title}
//                 onChange={(title) => setForm((prev) => ({ ...prev, title }))}
//               />

//               <PrioritySection
//                 value={form.priority}
//                 mode={props.mode}
//                 onChange={(priority) =>
//                   setForm((prev) => ({ ...prev, priority }))
//                 }
//               />

//               <AssignmentSection
//                 departmentId={form.departmentId}
//                 categoryId={form.categoryId}
//                 assignedToId={form.assignedToId ?? ""}
//                 depts={props.depts}
//                 cats={props.cats}
//                 users={props.users}
//                 errors={errors}
//                 onChange={(name, value) =>
//                   setForm((prev) => ({
//                     ...prev,
//                     [name]: value,
//                     ...(name === "departmentId"
//                       ? { categoryId: "", assignedToId: "" }
//                       : {}),
//                   }))
//                 }
//               />

//               <RemarkInput
//                 value={remark}
//                 error={remarkError}
//                 visible={priorityChanged}
//                 onChange={setRemark}
//               />

//               <DescriptionInput
//                 value={form.description}
//                 error={errors.description}
//                 onChange={(description) =>
//                   setForm((prev) => ({ ...prev, description }))
//                 }
//               />

//               <ImageInput
//                 images={images}
//                 setImages={setImages}
//                 existingImages={existingImages}
//                 setExistingImages={setExistingImages}
//               />

//               <SubmitSection submitting={submitting} mode={props.mode} />
//             </form>
//           </div>

//           {ticketId && (
//             <aside className="space-y-5 ">
//               <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs sm:p-5">
//                 <CommentSection
//                   ticketId={ticketId}
//                   comments={props.comment ?? []}
//                 />
//               </div>

//               <AuditPanel logs={auditLogs} />
//             </aside>
//           )}
//         </div>
//       </section>
//     </div>
//   );
// }

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
  const isSuperAdmin = session?.user.role === "SUPER_ADMIN";
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
    <div className="min-h-screen bg-zinc-50">
      <ToastContainer />

      <section className="mx-auto w-full max-w-370 relative px-4  py-5 sm:px-6 sm:py-6">
        <div
          className={`grid items-start relative gap-5 ${
            ticketId
              ? "xl:grid-cols-[minmax(0,1fr)_420px]"
              : "max-w-5xl mx-auto"
          }`}>
          {/* LEFT COLUMN: 
            1. 'sticky' + 'top-6' makes it stay at the top.
            2. 'self-start' ensures the container doesn't stretch to the full height of the grid.
          */}
          <div className="xl:sticky xl:top-24 self-start rounded-2xl overflow-hidden  border border-zinc-200 p-5 bg-white shadow-sm sm:p-7">
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
                onStatusChange={(status) =>
                  handleFieldChange("status", status)
                }
              />
          

              <TitleInput
                value={form.title}
                error={errors.title}
                disabled={isSensitiveFieldLocked}
                onChange={(title) => handleFieldChange("title", title)}
              />

              <PrioritySection
                value={form.priority}
                mode={props.mode}
                onChange={(priority) =>
                  handleFieldChange("priority", priority)
                }
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
                  handleAssignmentChange(name, value)
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

