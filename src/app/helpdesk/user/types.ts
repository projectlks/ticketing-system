// User listing page နဲ့ server action တို့ကြားမှာ share သုံးမယ့်
// ticket summary type ကို ဒီဖိုင်တစ်ခုတည်းမှာ ထားပြီး coupling လျော့ထားပါတယ်။
export type StatusKey = "new" | "open" | "inprogress" | "closed";

export type UserTicketStatus = Record<StatusKey, number>;

export type TicketStats = {
  id: string;
  name: string;
  email: string;
  assigned: UserTicketStatus;
  created: UserTicketStatus;
};

export const STATUS_COLUMNS: Array<{ key: StatusKey; label: string }> = [
  { key: "new", label: "NEW" },
  { key: "open", label: "OPEN" },
  { key: "inprogress", label: "IN PROGRESS" },
  { key: "closed", label: "CLOSED" },
];
