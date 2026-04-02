"use client";

import { useEffect, useRef, useState } from "react";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";

import { TicketSchema, TicketFormData } from "./ticket.schema";
import { TicketData, TicketImage } from "./ticket.types";
import { createTicket, getTicketAuditLogs, updateTicket } from "./action";
import { Audit } from "@/generated/prisma/client";
import { getSocket } from "@/libs/socket-client";

type UseTicketFormArgs = {
  mode: "create" | "edit";
  ticket?: TicketData | null;
  auditLog?: Audit[];
};

type FormErrors = Partial<Record<keyof TicketFormData, string>>;
type LiveValidateField = "title" | "description";
type LiveValidationState = "valid" | "invalid";
const LIVE_VALIDATE_FIELDS: Set<LiveValidateField> = new Set([
  "title",
  "description",
]);
const LIVE_FIELD_SCHEMAS = {
  title: TicketSchema.shape.title,
  description: TicketSchema.shape.description,
} as const;
const LIVE_VALIDATION_IDLE_MS = 700;

export function useTicketForm({ mode, ticket, auditLog = [] }: UseTicketFormArgs) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [form, setForm] = useState<TicketFormData>({
    title: ticket?.title ?? "",
    description: ticket?.description ?? "",
    departmentId: ticket?.departmentId ?? "",
    categoryId: ticket?.categoryId ?? "",
    priority: ticket?.priority ?? "REQUEST",
    ticketId: ticket?.ticketId ?? "NEW",
    resolutionDue: ticket?.resolutionDue,
    status: ticket?.status ?? "NEW",
    assignedToId: ticket?.assignedToId ?? "",
  });

  const [images, setImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<TicketImage[]>(
    ticket?.images ?? [],
  );
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);

  const [errors, setErrors] = useState<FormErrors>({});
  const [liveValidationState, setLiveValidationState] = useState<
    Partial<Record<LiveValidateField, LiveValidationState>>
  >({});
  const [liveValidationActive, setLiveValidationActive] = useState<
    Partial<Record<LiveValidateField, boolean>>
  >({});
  const liveValidationTimersRef = useRef<
    Partial<Record<LiveValidateField, number>>
  >({});

  const [submitting, setSubmitting] = useState(false);
  const [remark, setRemark] = useState("");
  const [remarkError, setRemarkError] = useState("");
  const [auditLogs, setAuditLogs] = useState<Audit[]>(auditLog);

  const originalPriority = ticket?.priority ?? "REQUEST";
  const priorityChanged = mode === "edit" && form.priority !== originalPriority;

  const toSchemaInput = (value: TicketFormData) => ({
    ...value,
    resolutionDue: value.resolutionDue ? new Date(value.resolutionDue) : undefined,
  });

  const clearLiveValidationTimer = (field: LiveValidateField) => {
    const timeoutId = liveValidationTimersRef.current[field];
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      delete liveValidationTimersRef.current[field];
    }
  };

  const showLiveValidation = (
    field: LiveValidateField,
    state: LiveValidationState,
  ) => {
    clearLiveValidationTimer(field);

    setLiveValidationState((previous) => ({
      ...previous,
      [field]: state,
    }));
    setLiveValidationActive((previous) => ({
      ...previous,
      [field]: true,
    }));

    if (state === "valid") {
      liveValidationTimersRef.current[field] = window.setTimeout(() => {
        setLiveValidationActive((previous) => ({
          ...previous,
          [field]: false,
        }));
        delete liveValidationTimersRef.current[field];
      }, LIVE_VALIDATION_IDLE_MS) as number;
    }
  };

  const handleFieldChange = <K extends keyof TicketFormData>(
    field: K,
    value: TicketFormData[K],
  ) => {
    const nextForm = {
      ...form,
      [field]: value,
    } as TicketFormData;
    setForm(nextForm);

    if (LIVE_VALIDATE_FIELDS.has(field as LiveValidateField)) {
      const liveField = field as LiveValidateField;
      const textValue = String(value ?? "");
      const liveSchema = LIVE_FIELD_SCHEMAS[liveField];
      const parsed = liveSchema.safeParse(textValue);

      if (textValue.length === 0) {
        clearLiveValidationTimer(liveField);
        setLiveValidationActive((previous) => ({
          ...previous,
          [liveField]: false,
        }));
        setLiveValidationState((previous) => ({
          ...previous,
          [liveField]: undefined,
        }));
        setErrors((previous) => {
          const nextErrors = { ...previous };
          delete nextErrors[liveField];
          return nextErrors;
        });
        return;
      }

      showLiveValidation(liveField, parsed.success ? "valid" : "invalid");
      setErrors((previous) => {
        const nextErrors = { ...previous };
        if (parsed.success) {
          delete nextErrors[liveField];
        } else {
          nextErrors[liveField] = parsed.error.issues[0]?.message ?? "Invalid value.";
        }
        return nextErrors;
      });
      return;
    }

    setErrors((previous) => {
      const nextErrors = { ...previous };
      delete nextErrors[field];
      return nextErrors;
    });
  };

  const handleAssignmentChange = (name: string, value: string) => {
    if (
      name !== "departmentId" &&
      name !== "categoryId" &&
      name !== "assignedToId"
    ) {
      return;
    }

    const nextForm = {
      ...form,
      [name]: value,
    } as TicketFormData;
    if (name === "departmentId") {
      nextForm.categoryId = "";
      nextForm.assignedToId = "";
    }
    setForm(nextForm);
    setErrors((previous) => {
      const nextErrors = { ...previous };
      delete nextErrors[name];
      if (name === "departmentId") {
        delete nextErrors.categoryId;
      }
      return nextErrors;
    });
  };

  useEffect(() => {
    const filter = searchParams.get("filter");
    if (filter) {
      setForm((previous) => ({ ...previous, departmentId: filter }));
    }
  }, [searchParams]);

  useEffect(() => {
    if (priorityChanged) {
      setRemark("");
    }
  }, [priorityChanged]);

  useEffect(() => {
    if (!priorityChanged) {
      setRemarkError("");
      return;
    }

    if (!remark.trim()) {
      setRemarkError("Remark is required when changing priority");
      return;
    }

    setRemarkError("");
  }, [priorityChanged, remark]);

  useEffect(() => {
    if (!ticket?.id) return;

    const socket = getSocket();
    socket.emit("join-ticket", ticket.id);

    const listener = (audit: Audit, updatedTicket: TicketFormData) => {
      if (audit.entityId !== ticket.id) return;

      setAuditLogs((previous) => [audit, ...previous]);
      setForm((previous) => ({
        ...previous,
        ...updatedTicket,
      }));

      toast.success("Ticket updated");
    };

    socket.on("ticket-updated", listener);

    return () => {
      socket.off("ticket-updated", listener);
    };
  }, [ticket?.id]);

  useEffect(() => {
    return () => {
      const timers = liveValidationTimersRef.current;
      Object.values(timers).forEach((timeoutId) => {
        if (timeoutId) {
          window.clearTimeout(timeoutId);
        }
      });
      liveValidationTimersRef.current = {};
    };
  }, []);

  const uploadImages = async (files: File[]) => {
    if (!files.length) return [];

    const fd = new FormData();
    files.forEach((file) => fd.append("file", file));

    const response = await fetch("/api/uploads", {
      method: "POST",
      body: fd,
    });

    const payload = (await response.json()) as {
      success?: boolean;
      urls?: string[];
      message?: string;
    };

    if (!response.ok || !payload.success || !Array.isArray(payload.urls)) {
      throw new Error(payload.message ?? "Failed to upload images.");
    }

    return payload.urls;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});
    setRemarkError("");

    const parsed = TicketSchema.safeParse(toSchemaInput(form));
    if (!parsed.success) {
      const nextErrors: FormErrors = {};
      parsed.error.issues.forEach((issue) => {
        const key = issue.path[0] as keyof TicketFormData;
        nextErrors[key] = issue.message;
      });
      setErrors(nextErrors);
      toast.error("Please fix the errors in the form");
      return;
    }

    if (priorityChanged && !remark.trim()) {
      setRemarkError("Remark is required when changing priority");
      toast.error("Please add a remark for priority change");
      return;
    }

    try {
      const uploaded = await uploadImages(images);
      setSubmitting(true);

      const fd = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        const normalized = String(value ?? "").trim();
        if (key === "assignedToId" && !normalized) {
          return;
        }
        fd.append(key, String(value ?? ""));
      });

      if (mode === "edit" && ticket?.id) {
        fd.append("id", ticket.id);
        fd.append("remark", remark);
      }

      if (mode === "create") {
        fd.append("images", JSON.stringify(uploaded));
        const createResult = await createTicket(fd);
        if (createResult.error || !createResult.data) {
          toast.error(createResult.error ?? "Failed to create ticket");
          return;
        }

        toast.success("Ticket created successfully");
        router.push(`/helpdesk/tickets/${createResult.data.id}` as Route);
        return;
      }

      if (!ticket?.id) return;

      fd.append("newImages", JSON.stringify(uploaded));
      fd.append("existingImageIds", JSON.stringify(existingImages.map((image) => image.id)));
      if (deletedImageIds.length) {
        fd.append("deletedImageIds", JSON.stringify(deletedImageIds));
      }

      const updateResult = await updateTicket(ticket.id, fd);
      if (updateResult.error || !updateResult.data) {
        toast.error(updateResult.error ?? "Failed to update ticket");
        return;
      }

      const { urlsToDelete } = updateResult.data;
      await Promise.all(
        urlsToDelete.map((url) => fetch(url, { method: "DELETE" })),
      );

      const audits = await getTicketAuditLogs(ticket.id);
      const socket = getSocket();
      socket.emit("update-ticket", {
        id: ticket.id,
        audit: audits[0],
        ticket: form,
      });

      toast.success("Ticket updated successfully");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveExistingImage = (id: string) => {
    setDeletedImageIds((previous) =>
      previous.includes(id) ? previous : [...previous, id],
    );
  };

  return {
    ticketId: ticket?.id,
    form,
    setForm,
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
    images,
    setImages,
    existingImages,
    setExistingImages,
    deletedImageIds,
    handleRemoveExistingImage,
    handleSubmit,
  };
}

