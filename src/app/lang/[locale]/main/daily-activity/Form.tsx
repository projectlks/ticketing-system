'use client';

import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import Loading from '@/components/Loading';
import Input from '@/components/Input';
import SelectBox from '@/components/SelectBox';
import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createLog, getLogById, updateLog } from './action';

interface LogFormProps {
  setShowForm: (value: boolean) => void;
  updateId?: string | null;
}

const emptyForm = {
  host: '',
  description: '',
  status: '',
  problemSeverity: '',
  contact: '',
  remark: '',
  duration: '',
};

export default function LogForm({ setShowForm, updateId }: LogFormProps) {
  const t = useTranslations('logForm');
  const queryClient = useQueryClient();

  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string | null }>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: null }));
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!form.host.trim()) newErrors.host = t('errors.host');
    if (!form.status.trim()) newErrors.status = t('errors.status');
    if (!form.problemSeverity.trim()) newErrors.problemSeverity = t('errors.severity');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // const mutation = useMutation({
  //   mutationFn: (formData: FormData) =>
  //     updateId ? updateLog(updateId, formData) : createLog(formData),



  //   // createLog(formData),
  //   onSuccess: () => {
  //     queryClient.invalidateQueries({ queryKey: ['logs'] });
  //     queryClient.invalidateQueries({ queryKey: ['logs-counts'] });
  //     Swal.fire(t('alerts.success.title'), t('alerts.success.created'), 'success');
  //     setShowForm(false);
  //   },
  //   onError: (error) => {
  //     const message = error instanceof Error ? error.message : t('alerts.error');
  //     Swal.fire(t('alerts.error'), message, 'error');
  //   },
  // });


  const mutation = useMutation({
    mutationFn: (formData: FormData) =>
      updateId ? updateLog(updateId, formData) : createLog(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
      queryClient.invalidateQueries({ queryKey: ['logs-counts'] });
      Swal.fire(
        'Success',
        updateId ? 'Log updated successfully!' : 'Log created successfully!',
        'success'
      );
      setShowForm(false);
    },
    onError: (error) => {
      Swal.fire('Error', (error as Error).message, 'error');
    },
  });


  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      formData.append(key, value);
    });

    mutation.mutate(formData);
    setLoading(false);
  };

  // ✅ Update mode - fetch log data when updateId exists
  useEffect(() => {
    const fetchData = async () => {
      if (!updateId) return;
      setLoading(true);
      try {
        const data = await getLogById(updateId);
        if (data) {
          setForm({
            host: data.host ?? '',
            description: data.description ?? '',
            status: data.status ?? '',
            problemSeverity: data.problemSeverity ?? '',
            contact: data.contactId ?? '',
            remark: data.remark ?? '',
            duration: data.duration ?? '',
          });
        }
      } catch (error) {
        console.error('Failed to load log:', error);
        Swal.fire('Error', 'Failed to load log data', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [updateId]);

  const handleCancel = () => {
    setShowForm(false);
  };

  return (
    <>
      {loading && <Loading />}
      <section
        className="w-screen fixed top-0 left-0 flex justify-center min-h-screen overflow-auto h-screen items-center backdrop-blur-lg z-50"
        aria-modal="true"
        role="dialog"
      >
        <div className="w-full h-full fixed top-0 left-0 bg-black opacity-20" onClick={handleCancel} aria-hidden="true" />
        <form
          onSubmit={handleSubmit}
          className="w-[90%] md:w-[700px] rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 z-50"
          onClick={(e) => e.stopPropagation()}
          noValidate
        >
          <div className="px-5 py-4 sm:px-6 sm:py-5">
            <h1 className="text-2xl font-bold mb-3 mt-5 text-gray-800 dark:text-gray-100">
              {updateId ? t('headings.update') : t('headings.create')}
            </h1>
            <p className="text-gray-500 dark:text-gray-300 text-sm mb-3">
              {updateId ? t('headings.updateDesc') : t('headings.createDesc')}
            </p>
          </div>

          {/* Form Fields */}
          <section className="p-5 space-y-6 border-t max-h-[80vh] overflow-y-auto border-gray-100 dark:border-gray-700 sm:p-6">
            <Input
              id="host"
              name="host"
              placeholder={t('placeholders.host')}
              label={t('labels.host')}
              value={form.host}
              onChange={handleChange}
              error={!!errors.host}
              errorMessage={errors.host ?? ''}
              disable={loading}
              require={true}
            />

            <div>
              <label
                htmlFor="description"
                className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                {t('labels.description')}
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                placeholder={t('placeholders.description')}
                value={form.description}
                onChange={handleChange}
                className={`w-full rounded-lg border ${errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } bg-transparent dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300/50`}
              />
              {errors.description && <p className="text-red-600 text-sm mt-1">{errors.description}</p>}
            </div>

            <SelectBox
              label={t('labels.status')}
              id="status"
              name="status"
              value={form.status}
              options={[
                { id: 'PROBLEM', name: 'PROBLEM' },
                { id: 'RESOLVED', name: 'RESOLVED' },
              ]}
              onChange={handleChange}
              error={errors.status}
              placeholder={t('placeholders.status')}
            />

            <SelectBox
              label={t('labels.severity')}
              id="problemSeverity"
              name="problemSeverity"
              value={form.problemSeverity}
              options={[
                { id: 'INFORMATION', name: 'INFORMATION' },
                { id: 'WARNING', name: 'WARNING' },
                { id: 'AVERAGE', name: 'AVERAGE' },
                { id: 'HIGH', name: 'HIGH' },
                { id: 'DISASTER', name: 'DISASTER' },
              ]}
              onChange={handleChange}
              error={errors.problemSeverity}
              placeholder={t('placeholders.severity')}
            />

            <Input
              id="duration"
              name="duration"
              placeholder={t('placeholders.duration')}
              label={t('labels.duration')}
              value={form.duration}
              onChange={handleChange}
              require={true}
              errorMessage=""
              disable={loading}
            />
{/* 
            <div className="flex gap-2">
              <Input
                id="durationValue"
                name="durationValue"
                placeholder="Enter value"
                label="Duration"
                type="number"
                value={form.duration}
                onChange={handleChange}
                require={true}
                disable={loading}
                errorMessage=''
              />

              <SelectBox
                id="durationUnit"
                name="durationUnit"
                label="Unit"
                value={form.duration}
                onChange={handleChange}
                options={[
                  { id: 'Minutes', name: 'min' },
                  { id: 'Hours', name: 'hour' },
                  { id: 'Days', name: 'day' },
                ]}
              />
            </div> */}

            


            <Input
              id="remark"
              name="remark"
              placeholder={t('placeholders.remark')}
              label={t('labels.remark')}
              value={form.remark}
              onChange={handleChange}
              require={true}
              errorMessage=""
              disable={loading}
            />

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-3 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 h-[44px]"
              >
                {t('buttons.cancel')}
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`px-4 py-3 text-sm font-medium text-white rounded-lg shadow-md h-[44px] ${loading ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-600'
                  }`}
              >
                {loading
                  ? t('buttons.creating')
                  : updateId
                    ? t('buttons.update')
                    : t('buttons.create')}
              </button>
            </div>
          </section>
        </form>
      </section>
    </>
  );
}
