'use client'

import Loading from '@/components/Loading';
import React, { JSX, ReactNode, useEffect, useState } from 'react';
import { UserFullData } from './page';
import { PencilSquareIcon } from '@heroicons/react/24/outline';
import Input from '@/components/Input';
import { changeHRInfo } from './action';
import { useTranslations } from 'next-intl';

interface Props {
  data: UserFullData;
  Modal({
    title,
    children,
    onClose,
    onSubmit,
  }: {
    title: string;
    children?: ReactNode;
    onClose: () => void;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  }): JSX.Element;
}

type EditableField = keyof UserFullData;

export default function WorkAndPersonalDetails({ data, Modal }: Props) {
  const t = useTranslations("workAndPersonal");

  const [loading, setLoading] = useState<boolean>(false);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editData, setEditData] = useState<Partial<UserFullData>>({});

  useEffect(() => { setEditData({ ...data }); }, [data]);

  const fields: { label: string; key: EditableField; type?: 'text' | 'number' | 'date' }[] = [
    { label: t("employeeId"), key: 'employeeId' },
    { label: t("status"), key: 'status' },
    { label: t("address"), key: 'address' },
    { label: t("language"), key: 'language' },
    { label: t("emergencyContact"), key: 'emergencyContact' },
    { label: t("emergencyPhone"), key: 'emergencyPhone' },
    { label: t("nationality"), key: 'nationality' },
    { label: t("identificationNo"), key: 'identificationNo' },
    { label: t("passportNo"), key: 'passportNo' },
    { label: t("dateOfBirth"), key: 'dateOfBirth', type: 'date' },
    { label: t("maritalStatus"), key: 'maritalStatus' },
    { label: t("numberOfChildren"), key: 'numberOfChildren', type: 'number' },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setEditData(prev => {
      if (type === 'number') return { ...prev, [name]: value === '' ? undefined : Number(value) } as Partial<UserFullData>;
      if (type === 'date') return { ...prev, [name]: value === '' ? undefined : new Date(value) } as Partial<UserFullData>;
      return { ...prev, [name]: value } as Partial<UserFullData>;
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("userId", data.id);
      fields.forEach(field => {
        const value = editData[field.key];
        if (value !== undefined && value !== null) {
          if (field.type === "date" && value instanceof Date) formData.append(field.key, value.toISOString().split("T")[0]);
          else formData.append(field.key, String(value));
        } else formData.append(field.key, "");
      });
      const updatedUser = await changeHRInfo(formData);
      setEditData({ ...updatedUser });
      setShowForm(false);
    } catch (err) {
      console.error("Failed to update personal info:", err);
    } finally { setLoading(false); }
  };

  const renderValue = (value: UserFullData[EditableField]) => {
    if (value === null || value === undefined) return 'N/A';
    if (value instanceof Date) return value.toLocaleDateString();
    return String(value);
  };

  return (
    <>
      {loading && <Loading />}
      <div className="p-5 mb-6 border border-gray-200 rounded-2xl lg:p-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex justify-between items-center">
          <h4 className="text-lg font-semibold text-gray-800 lg:mb-6 dark:text-gray-100">{t("hrPersonalInfo")}</h4>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
            disabled={loading}
          >
            <PencilSquareIcon className="w-5 h-5" />
            {loading ? 'Loading...' : t("edit")}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 w-full lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
          {fields.map(field => (
            <div key={field.key}>
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">{field.label}</p>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                {renderValue(editData[field.key] as UserFullData[EditableField])}
              </p>
            </div>
          ))}
        </div>
      </div>


      {showForm && (
        <Modal title={t("hrPersonalInfo")} onSubmit={handleSubmit} onClose={() => setShowForm(false)}>
          <div className="space-y-4">
            {fields.map(field => (
              <Input key={field.key}
                label={field.label}
                id={`edit-${field.key}`}
                name={field.key}
                placeholder={t("enterField", { field: field.label })}
                value={editData[field.key] !== undefined && editData[field.key] !== null
                  ? field.type === 'date' && editData[field.key] instanceof Date
                    ? (editData[field.key] as Date).toISOString().split('T')[0]
                    : String(editData[field.key])
                  : ''
                }
                type={field.type || 'text'}
                require={false}
                error={false}
                errorMessage=""
                disable={false}
                onChange={handleChange}
              />
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}
