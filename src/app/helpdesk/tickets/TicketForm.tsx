// "use client";

// import { ToastContainer } from "react-toastify";
// import { TicketFormProps } from "./ticket.types";
// import { useTicketForm } from "./useTicketForm";

// import Header from "@/components/ticket/Header";
// import TitleInput from "@/components/ticket/TitleInput";
// import PrioritySection from "@/components/ticket/PrioritySection";
// import AssignmentSection from "@/components/ticket/AssignmentSection";
// import RemarkInput from "@/components/ticket/RemarkInput";
// import DescriptionInput from "@/components/ticket/DescriptionInput";
// // import ImageInput from "../ImageInput";
// import SubmitSection from "@/components/ticket/SubmitSection";
// import AuditPanel from "@/components/ticket/AuditPanel";
// import ImageInput from "./ImageInput";
// import CommentBox from "@/components/CommentBox";

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
//     <div className="bg-gray-100">
//       <ToastContainer />

//       <section className="flex gap-5 bg-gray-100 overflow-y-auto min-h-screen  container mx-auto p-5">
//         <form
//           onSubmit={handleSubmit}
//           className="w-2/3 bg-white sticky top-5 h-fit p-8 shadow-md">
//           <Header
//             ticketId={form.ticketId ?? "NEW"}
//             mode={props.mode}
//             status={form.status!}
//             onStatusChange={(status) => setForm((p) => ({ ...p, status }))}
//           />

//           <TitleInput
//             value={form.title}
//             error={errors.title}
//             onChange={(title) => setForm((p) => ({ ...p, title }))}
//           />

//           <PrioritySection
//             value={form.priority}
//             mode={props.mode}
//             onChange={(priority) => setForm((p) => ({ ...p, priority }))}
//           />

//           {/* <AssignmentSection {...props} /> */}
//           <AssignmentSection
//             departmentId={form.departmentId}
//             categoryId={form.categoryId}
//             assignedToId={form.assignedToId ?? ""}
//             depts={props.depts}
//             cats={props.cats}
//             users={props.users}
//             errors={errors}
//             onChange={(name, value) =>
//               setForm((prev) => ({
//                 ...prev,
//                 [name]: value,
//                 ...(name === "departmentId"
//                   ? { categoryId: "", assignedToId: "" }
//                   : {}),
//               }))
//             }
//           />

//           <RemarkInput
//             value={remark}
//             error={remarkError}
//             visible={priorityChanged}
//             onChange={setRemark}
//           />

//           <DescriptionInput
//             value={form.description}
//             error={errors.description}
//             onChange={(description) => setForm((p) => ({ ...p, description }))}
//           />

//           <ImageInput
//             images={images}
//             setImages={setImages}
//             existingImages={existingImages}
//             setExistingImages={setExistingImages}
//           />

//           <SubmitSection submitting={submitting} mode={props.mode} />

//           {ticketId ? (
//             <CommentBox
//               ticketId={ticketId}
//               comments={props.comment ? props.comment : []}
//             />
//           ) : (
//             <></>
//           )}
//         </form>

//         <AuditPanel logs={auditLogs} />
//       </section>
//     </div>
//   );
// }

"use client";

import { ToastContainer } from "react-toastify";
import { TicketFormProps } from "./ticket.types";
import { useTicketForm } from "./useTicketForm";

import Header from "@/components/ticket/Header";
import TitleInput from "@/components/ticket/TitleInput";
import PrioritySection from "@/components/ticket/PrioritySection";
import AssignmentSection from "@/components/ticket/AssignmentSection";
import RemarkInput from "@/components/ticket/RemarkInput";
import DescriptionInput from "@/components/ticket/DescriptionInput";
// import ImageInput from "../ImageInput";
import SubmitSection from "@/components/ticket/SubmitSection";
import ImageInput from "./ImageInput";
import CommentSection from "@/components/CommentSection";
import AuditPanel from "@/components/ticket/AuditPanel";

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
    <div className="bg-gray-100">
      <ToastContainer />

      <section className="flex gap-5 relative bg-gray-100  min-h-screen container mx-auto p-5">
        <div className="w-3/5  sticky  top-5 h-fit">
          <form
            onSubmit={handleSubmit}
            className="w-full bg-white   h-fit p-8 shadow-md">
            <Header
              ticketId={form.ticketId ?? "NEW"}
              mode={props.mode}
              status={form.status!}
              onStatusChange={(status) => setForm((p) => ({ ...p, status }))}
            />

            <TitleInput
              value={form.title}
              error={errors.title}
              onChange={(title) => setForm((p) => ({ ...p, title }))}
            />

            <PrioritySection
              value={form.priority}
              mode={props.mode}
              onChange={(priority) => setForm((p) => ({ ...p, priority }))}
            />

            {/* <AssignmentSection {...props} /> */}
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
                setForm((p) => ({ ...p, description }))
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
          <div className="mt-5">
            <AuditPanel logs={auditLogs} />
          </div>
        </div>
        {ticketId ? (
          <div className="w-2/5 bg-white sticky top-5 h-fit p-8 shadow-md">
            <CommentSection
              ticketId={ticketId}
              comments={props.comment ? props.comment : []}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}
