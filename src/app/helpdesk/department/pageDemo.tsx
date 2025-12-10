"use client";
import { useState } from "react";
import Button from "@/components/Button";
import Searchbox from "@/components/SearchBox/SearchBox";
import TableBody from "@/components/TableBody";
import TableHead from "@/components/TableHead";
import { ResizableBox } from "react-resizable";
import "react-resizable/css/styles.css";
import { AdjustmentsHorizontalIcon, ViewColumnsIcon, QueueListIcon } from "@heroicons/react/24/outline";

export default function DepartmentPage() {
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSearchQueryFilters, setSelectedSearchQueryFilters] = useState<Record<string, string[]>>({});
  const columns = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "contact", label: "Contact" },
  ];

  const [visibleColumns, setVisibleColumns] = useState(
    Object.fromEntries(columns.map((col) => [col.key, true]))
  );

  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    Object.fromEntries(columns.map((col) => [col.key, 180]))
  );

  const departments = [
    { id: 1, name: "Human Resources", email: "hr@company.com", contact: "+95 9 123 456 789" },
    { id: 2, name: "IT Department", email: "it@company.com", contact: "+95 9 987 654 321" },
    { id: 3, name: "Finance", email: "finance@company.com", contact: "+95 9 111 222 333" },
  ];

  // Toggle which columns are visible
  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Row selection logic
  const toggleSelectRow = (id: number) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedRows.length === departments.length) setSelectedRows([]);
    else setSelectedRows(departments.map((d) => d.id));
  };

  // Column resize
  const handleResize = (key: string, newWidth: number) => {
    setColumnWidths((prev) => ({ ...prev, [key]: newWidth }));
  };

  return (
    <div className="p-4">
      {/* Top Bar */}
      <div className="flex justify-between items-center bg-white px-4 py-4 border-b border-gray-300 rounded-t-md">
        <div className="flex items-center space-x-2">
          <Button click={() => console.log("Create Department")} buttonLabel="NEW" />
          <h1 className="text-sm text-gray-800 font-medium">Departments</h1>
        </div>

        <Searchbox
          placeholder="Search ..."
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filterGroups={[
            { title: "Ownership", options: ["My Tickets", "Followed", "Unassigned"] },
            { title: "Priority", options: ["Urgent", "High", "Medium", "Low"] },
            { title: "Status", options: ["Open", "Closed"] },
          ]}
          selectedFilters={selectedFilters}
          setSelectedFilters={setSelectedFilters}
          columns={columns}
          selectedSearchQueryFilters={selectedSearchQueryFilters}
          setSelectedSearchQueryFilters={setSelectedSearchQueryFilters}

        />

        {/* Column Selector */}
        <div className="flex items-center space-x-2 ">

          <span className="flex items-center space-x-2 bg-gray-100">

            <ViewColumnsIcon className="w-6 h-6 cursor-pointer text-gray-600" />
            <QueueListIcon className="w-6 h-6 cursor-pointer text-gray-600" />

          </span>

          <div className="relative group">
            <AdjustmentsHorizontalIcon className="w-6 h-6 cursor-pointer text-gray-600" />
            <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
              {columns
                .filter((col) => col.key !== "name") // exclude "name"
                .map((col) => (
                  <label
                    key={col.key}
                    className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns[col.key]}
                      onChange={() => toggleColumn(col.key)}
                      className="mr-2 accent-main"
                    />
                    <span className="capitalize text-xs text-gray-700">{col.label}</span>
                  </label>
                ))}
            </div>
          </div>

        </div>
      </div>

      {/* Table */}
      <table className="w-full overflow-x-auto bg-white mt-4 border border-gray-200 rounded-md">
        {/* Table Header */}
        <thead className="flex border-b border-gray-200 bg-gray-50 font-medium text-gray-700 text-sm">
          {/* Select All */}
          <div className="w-12 flex items-center justify-center border-r border-gray-200">
            <input
              type="checkbox"
              checked={selectedRows.length === departments.length && departments.length > 0}
              onChange={toggleSelectAll}
              className="accent-main"
            />
          </div>

          {columns.map(
            (col) =>
              visibleColumns[col.key] && (
                <ResizableBox
                  key={col.key}
                  width={columnWidths[col.key]}
                  height={40}
                  axis="x"
                  minConstraints={[120, 40]}
                  maxConstraints={[400, 40]}
                  onResize={(e, data) => handleResize(col.key, data.size.width)}
                  resizeHandles={["e"]}
                >
                  <TableHead data={col.label} width={columnWidths[col.key]} />
                </ResizableBox>
              )
          )}
        </thead>
        <tbody>


          {/* Table Body */}
          {departments.map((dept) => (
            <div
              key={dept.id}
              className="flex border-b border-gray-100 hover:bg-gray-50 items-center"
            >
              {/* Row Checkbox */}
              <div className="w-12 flex items-center justify-center border-r border-gray-200">
                <input
                  type="checkbox"
                  checked={selectedRows.includes(dept.id)}
                  onChange={() => toggleSelectRow(dept.id)}
                  className="accent-main"
                />
              </div>

              {columns.map((col) => {
                if (!visibleColumns[col.key]) return null;

                const value = dept[col.key as keyof typeof dept];
                return (
                  <TableBody
                    key={col.key}
                    data={value as string}
                    width={columnWidths[col.key]}
                  />
                );
              })}
            </div>
          ))}

        </tbody>
      </table>
    </div>
  );
}
