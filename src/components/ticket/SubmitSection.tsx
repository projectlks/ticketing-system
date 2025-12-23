"use client";

import Button from "@/components/Button";

type Props = {
  submitting: boolean;
  mode: "create" | "edit";
};

export default function SubmitSection({ submitting, mode }: Props) {
  return (
    <div className="mt-6">
      <Button
        type="submit"
        disabled={submitting}
        buttonLabel={
          submitting
            ? mode === "create" ? "Creating..." : "Updating..."
            : mode === "create" ? "Create" : "Update"
        }
      />
    </div>
  );
}
