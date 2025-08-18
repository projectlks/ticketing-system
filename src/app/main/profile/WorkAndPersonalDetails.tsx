"use client";
import React from "react";
import { User } from "@prisma/client";

interface Props {
  data: User;
}

export default function WorkAndPersonalDetails({ data }: Props) {
  return (
    <div className="p-5 border border-gray-200 rounded-2xl lg:p-6">
      <h4 className="text-lg font-semibold text-gray-800 mb-6">
        Work & Personal Details
      </h4>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">

        {/* Work Fields */}
        <div>
          <p className="mb-2 text-xs text-gray-500">Employee ID</p>
          <p className="text-sm font-medium text-gray-800">{data.employee_id || "N/A"}</p>
        </div>
        <div>
          <p className="mb-2 text-xs text-gray-500">Job Position</p>
          <p className="text-sm font-medium text-gray-800">{data.job_position || "N/A"}</p>
        </div>
        <div>
          <p className="mb-2 text-xs text-gray-500">Department</p>
          <p className="text-sm font-medium text-gray-800">{data.department || "N/A"}</p>
        </div>
        <div>
          <p className="mb-2 text-xs text-gray-500">Manager</p>
          <p className="text-sm font-medium text-gray-800">{data.manager || "N/A"}</p>
        </div>
        <div>
          <p className="mb-2 text-xs text-gray-500">Status</p>
          <p className="text-sm font-medium text-gray-800">{data.status || "N/A"}</p>
        </div>
        <div>
          <p className="mb-2 text-xs text-gray-500">Work Mobile</p>
          <p className="text-sm font-medium text-gray-800">{data.work_mobile || "N/A"}</p>
        </div>
        <div>
          <p className="mb-2 text-xs text-gray-500">Personal Phone</p>
          <p className="text-sm font-medium text-gray-800">{data.personal_phone || "N/A"}</p>
        </div>
        <div>
          <p className="mb-2 text-xs text-gray-500">Work Email</p>
          <p className="text-sm font-medium text-gray-800">{data.work_email || "N/A"}</p>
        </div>
        <div>
          <p className="mb-2 text-xs text-gray-500">Personal Email</p>
          <p className="text-sm font-medium text-gray-800">{data.personal_email || "N/A"}</p>
        </div>

        {/* Personal Fields */}
        <div>
          <p className="mb-2 text-xs text-gray-500">Address</p>
          <p className="text-sm font-medium text-gray-800">{data.address || "N/A"}</p>
        </div>
        <div>
          <p className="mb-2 text-xs text-gray-500">Language</p>
          <p className="text-sm font-medium text-gray-800">{data.language || "N/A"}</p>
        </div>
        <div>
          <p className="mb-2 text-xs text-gray-500">Emergency Contact</p>
          <p className="text-sm font-medium text-gray-800">{data.emergency_contact || "N/A"}</p>
        </div>
        <div>
          <p className="mb-2 text-xs text-gray-500">Emergency Phone</p>
          <p className="text-sm font-medium text-gray-800">{data.emergency_phone || "N/A"}</p>
        </div>
        <div>
          <p className="mb-2 text-xs text-gray-500">Nationality</p>
          <p className="text-sm font-medium text-gray-800">{data.nationality || "N/A"}</p>
        </div>
        <div>
          <p className="mb-2 text-xs text-gray-500">Identification No</p>
          <p className="text-sm font-medium text-gray-800">{data.identification_no || "N/A"}</p>
        </div>
        <div>
          <p className="mb-2 text-xs text-gray-500">Passport No</p>
          <p className="text-sm font-medium text-gray-800">{data.passport_no || "N/A"}</p>
        </div>
        <div>
          <p className="mb-2 text-xs text-gray-500">Date of Birth</p>
          <p className="text-sm font-medium text-gray-800">
            {data.date_of_birth ? new Date(data.date_of_birth).toLocaleDateString() : "N/A"}
          </p>
        </div>
        <div>
          <p className="mb-2 text-xs text-gray-500">Marital Status</p>
          <p className="text-sm font-medium text-gray-800">{data.marital_status || "N/A"}</p>
        </div>
        <div>
          <p className="mb-2 text-xs text-gray-500">Number of Children</p>
          <p className="text-sm font-medium text-gray-800">{data.number_of_children ?? "N/A"}</p>
        </div>
      </div>
    </div>
  );
}
