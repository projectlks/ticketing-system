import { z } from "zod";

// Form validation rule ကို client/server နှစ်ဖက်လုံးက share သုံးနိုင်အောင်
// type + schema ကို centralize လုပ်ထားပါတယ်။
export const CategoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(80, "Name is too long"),
  departmentId: z.string().min(1, "Department is required"),
});

export type CategoryFormValues = z.infer<typeof CategoryFormSchema>;

export type CategoryFormErrors = Partial<Record<keyof CategoryFormValues, string>>;

export type CategoryEntity = {
  id: string;
  name: string;
  departmentId: string;
  departmentName: string;
};

export type DepartmentOption = {
  id: string;
  name: string;
};
