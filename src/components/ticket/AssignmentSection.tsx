// "use client";

// type Props = {
//   departmentId: string;
//   categoryId: string;
//   assignedToId: string;
//   depts: { id: string; name: string }[];
//   cats: { id: string; name: string; departmentId: string }[];
//   users: { id: string; name: string; email: string; departmentId: string }[];
//   errors: Record<string, string | undefined>;
//   onChange: (name: string, value: string) => void;
// };

// export default function AssignmentSection({
//   departmentId,
//   categoryId,
//   assignedToId,
//   depts,
//   cats,
//   users,
//   errors,
//   onChange,
// }: Props) {
//   const filteredCategories = cats.filter((c) => c.departmentId === departmentId);
//   const filteredUsers = users.filter((u) => u.departmentId === departmentId);

//   return (
//     <div className="grid grid-cols-1 md:grid-cols-3 mb-6 gap-8">
//       {/* Department */}
//       <div>
//         <label className="block font-medium mb-1">Department</label>
//         <select
//           value={departmentId}
//           onChange={(e) => onChange("departmentId", e.target.value)}
//           className={`w-full px-1 py-2 appearance-none [&::-ms-expand]:hidden bg-no-repeat bg-right focus:outline-none ${errors.departmentId ? "border-b border-red-500" : ""}`}

//         >
//           <option value="">Select Department</option>
//           {depts.map((d) => (
//             <option key={d.id} value={d.id}>{d.name}</option>
//           ))}
//         </select>
//         {errors.departmentId && <p className="text-red-500 text-sm">{errors.departmentId}</p>}
//       </div>

//       {/* Category */}
//       <div>
//         <label className="block font-medium mb-1">Category</label>
//         <select
//           value={categoryId}
//           disabled={!departmentId}
//           onChange={(e) => onChange("categoryId", e.target.value)}
//           className={`w-full px-1 py-2 appearance-none [&::-ms-expand]:hidden bg-no-repeat bg-right focus:outline-none ${errors.categoryId ? "border-b border-red-500" : ""}`}
//         >
//           <option value="">Select Category</option>
//           {filteredCategories.map((c) => (
//             <option key={c.id} value={c.id}>{c.name}</option>
//           ))}
//         </select>
//         {errors.categoryId && <p className="text-red-500 text-sm">{errors.categoryId}</p>}

//       </div>

//       {/* Assign */}
//       <div>
//         <label className="block font-medium mb-1">Assign To</label>
//         <select
//           value={assignedToId}
//           disabled={!departmentId}
//           onChange={(e) => onChange("assignedToId", e.target.value)}
//           // className="w-full px-1 py-2"
//           className={`w-full px-1 py-2 appearance-none [&::-ms-expand]:hidden bg-no-repeat bg-right focus:outline-none ${errors.departmentId ? "border-b border-red-500" : ""}`}
//         >
//           <option value="">Assign To</option>
//           {filteredUsers.map((u) => (
//             <option key={u.id} value={u.id}>
//               {u.name} ({u.email})
//             </option>
//           ))}
//         </select>
//       </div>
//     </div>
//   );
// }
"use client";

type Props = {
  departmentId: string;
  categoryId: string;
  assignedToId: string;
  depts: { id: string; name: string }[];
  cats: { id: string; name: string; departmentId: string }[];
  users: { id: string; name: string; email: string; departmentId: string }[];
  errors: Record<string, string | undefined>;
  onChange: (name: string, value: string) => void;
};

export default function AssignmentSection({
  departmentId,
  categoryId,
  assignedToId,
  depts,
  cats,
  users,
  errors,
  onChange,
}: Props) {
  const filteredCategories = cats.filter(
    (c) => c.departmentId === departmentId
  );
  const filteredUsers = users.filter(
    (u) => u.departmentId === departmentId
  );

  const base =
    "w-full bg-transparent px-1 py-2 text-sm outline-none border-b transition-colors appearance-none [&::-ms-expand]:hidden bg-no-repeat bg-right truncate";
  const normal = "border-gray-300 focus:border-blue-600";
  const error = "border-red-500 focus:border-red-600";
  const disabled = "border-gray-200 text-gray-400 cursor-not-allowed";

  return (
    <div className="mb-8">
      {/* <h3 className="mb-4 text-sm font-semibold text-gray-700">
        Assignment
      </h3> */}

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {/* Department */}
        <div>
          <label className="mb-1 block text-sm font-medium">
            Department
          </label>
          <select
            value={departmentId}
            onChange={(e) =>
              onChange("departmentId", e.target.value)
            }
            className={`${base} ${
              errors.departmentId ? error : normal
            }`}
          >
            <option value="">Select department</option>
            {depts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          {errors.departmentId && (
            <p className="mt-1 text-xs text-red-500">
              {errors.departmentId}
            </p>
          )}
        </div>

        {/* Category */}
        <div>
          <label className="mb-1 block text-sm font-medium">
            Category
          </label>
          <select
            value={categoryId}
            disabled={!departmentId}
            onChange={(e) =>
              onChange("categoryId", e.target.value)
            }
            className={`${base} ${
              !departmentId
                ? disabled
                : errors.categoryId
                ? error
                : normal
            }`}
          >
            <option value="">Select category</option>
            {filteredCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {errors.categoryId && (
            <p className="mt-1 text-xs text-red-500">
              {errors.categoryId}
            </p>
          )}
        </div>

        {/* Assign To */}
        <div>
          <label className="mb-1 block text-sm font-medium">
            Assign to
          </label>
          <select
            value={assignedToId}
            disabled={!departmentId}
            onChange={(e) =>
              onChange("assignedToId", e.target.value)
            }
            className={`${base} ${
              !departmentId ? disabled : normal
            }`}
          >
            <option value="">Select user</option>
            {filteredUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email})
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
