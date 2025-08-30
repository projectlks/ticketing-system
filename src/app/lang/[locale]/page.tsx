import { fetchYeastarExtensions, YeastarExtension } from '@/libs/action';
import React from 'react';

export default async function Page() {
  const extensions: YeastarExtension[] | null = await fetchYeastarExtensions();

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold mb-4">Yeastar Extensions</h1>
      {extensions ? (
        <ul className="list-disc list-inside">
          {extensions.map((ext) => (
            <li key={ext.id}>
              {ext.name} - {ext.status}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-red-500">Failed to load extensions.</p>
      )}
    </div>
  );
}
