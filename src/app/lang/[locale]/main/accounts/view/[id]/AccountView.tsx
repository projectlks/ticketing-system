'use client'

import AuditLogList from "@/components/AuditLogList";
import ViewContext from "@/components/ViewContext";
import { Audit } from "@prisma/client";
import { UserWithRelations } from "../../page";
import { useTranslations } from "next-intl";

export type AccountViewProps = {
  account: UserWithRelations;
  auditLog?: Audit[];
  title?: string;
};

export function AccountView({ account, auditLog, title = "View Account" }: AccountViewProps) {


  const hrFields: { label: string; key: keyof UserWithRelations; type?: 'text' | 'date' | 'number' }[] = [
    { label: "employeeId", key: "employeeId" },
    { label: "status", key: "status" },
    { label: "address", key: "address" },
    { label: "language", key: "language" },
    { label: "emergencyContact", key: "emergencyContact" },
    { label: "emergencyPhone", key: "emergencyPhone" },
    { label: "nationality", key: "nationality" },
    { label: "identificationNo", key: "identificationNo" },
    { label: "passportNo", key: "passportNo" },
    { label: "dateOfBirth", key: "dateOfBirth", type: "date" },
    { label: "maritalStatus", key: "maritalStatus" },
    { label: "numberOfChildren", key: "numberOfChildren", type: "number" },
  ];


  // Fully type-safe value renderer
  const renderValue = (value: unknown, type?: 'date' | 'number' | 'text') => {
    if (value === null || value === undefined) return "N/A";
    if (type === "date" && value instanceof Date) return value.toLocaleDateString();
    return String(value);
  };

  const t = useTranslations('viewContext'); // 🎯 single instance
  const tHistory = useTranslations("historyLog");

  return (
    <section className="grid gap-6 md:grid-cols-3" aria-label="Account details">

      {/* Main Card */}
      <div className="h-fit md:sticky col-span-2 top-0 border-l-4 border-indigo-500 shadow-sm transition-shadow hover:shadow-md rounded-lg bg-white">
        <div className="gap-2 pb-4 px-6 pt-6">
          <h2 className="text-lg font-semibold text-indigo-600">{title}</h2>
        </div>

        <div className="pt-2 px-6 pb-6 space-y-6">
          {/* Basic Info */}
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ViewContext label={t("id")} value={account.id} />
            <ViewContext label={t("name")} value={account.name} />
            <ViewContext label={t("email")} value={account.email} />
            <ViewContext label={t("role")} value={account.role} />
            <ViewContext label={t("isArchived")} value={account.isArchived ? "Yes" : "No"} />
            <ViewContext label={t("createdAt")} value={new Date(account.createdAt).toLocaleString("en-US", { timeZone: "Asia/Yangon" })} />
            <ViewContext label={t("createdBy")} value={account.creator?.name || "-"} />
            <ViewContext label={t("updatedAt")} value={new Date(account.updatedAt).toLocaleString("en-US", { timeZone: "Asia/Yangon" })} />
            <ViewContext label={t("updatedBy")} value={account.updater?.name || "-"} />
          </dl>

          {/* HR & Personal Info */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-lg font-semibold mb-2">HR & Personal Information</h3>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {hrFields.map(field => (
                <ViewContext
                  key={field.key}
                  label={t(field.label)}  // 🔹 ဒီလို string key ကိုပေးရုံပ
                  // Type-safe dynamic access
                  value={renderValue(account[field.key] as unknown, field.type)}
                />
              ))}
            </dl>
          </div>

          {/* Assigned Tickets */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-lg font-semibold mb-2">Assigned Tickets</h3>
            {account.assignedTickets && account.assignedTickets.length > 0 ? (
              <ul className="list-disc list-inside space-y-1">
                {account.assignedTickets.map(ticket => (
                  <li key={ticket.id} className="text-sm">
                    <strong>{ticket.title}</strong> - Status: {ticket.status}, Priority: {ticket.priority}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No tickets assigned.</p>
            )}
          </div>
        </div>
      </div>

      {/* Audit Log */}
      <div className="border-l-4 border-indigo-300 shadow-sm transition-shadow hover:shadow-md rounded-lg bg-white">
        <div className="pb-4 px-6 pt-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <span>{tHistory("title")}</span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {tHistory("description.account")}
          </p>
        </div>
        <div className="pt-2 px-6 pb-6">
          <AuditLogList items={auditLog} />
        </div>
      </div>
    </section>
  );
}

export default AccountView;
