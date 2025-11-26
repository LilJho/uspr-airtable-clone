"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  LayoutDashboard,
  Share2,
  Rocket,
  ChevronRight,
  Filter,
  Search,
  Loader2
} from "lucide-react";
import type {
  BaseRow,
  TableRow,
  FieldRow,
  RecordRow
} from "@/lib/types/base-detail";

type InterfaceViewConfig = {
  id: string;
  label: string;
  description: string;
  filters: string[];
  insights: {
    label: string;
    value: string;
    trend?: string;
  }[];
};

type InterfaceSection = {
  id: string;
  name: string;
  status: "draft" | "unpublished" | "published";
  updatedAt: string;
  tableId?: string;
  views: InterfaceViewConfig[];
};

type InterfacesViewProps = {
  base: BaseRow | null;
  tables: TableRow[];
  fields: FieldRow[];
  records: RecordRow[];
  selectedTableId: string | null;
  onSelectTable: (tableId: string) => void;
  loading?: boolean;
  loadingRecords?: boolean;
};

export const InterfacesView = ({
  base,
  tables,
  fields,
  records,
  selectedTableId,
  onSelectTable,
  loading,
  loadingRecords
}: InterfacesViewProps) => {
  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric"
    }).format(new Date());
  }, []);

  const interfaceSections = useMemo<InterfaceSection[]>(() => {
    if (tables.length === 0) {
      return [
        {
          id: "sample-campaigns",
          name: "Campaigns",
          status: "draft",
          updatedAt: formattedDate,
          views: [
            {
              id: "overview",
              label: "Overview",
              description: "Track campaign goals and owners",
              filters: ["Reach Metrics", "Responsible team member", "Status"],
              insights: [
                { label: "Active campaigns", value: "8", trend: "+2 this week" },
                { label: "Avg. reach", value: "82K", trend: "+12%" },
                { label: "Owned by you", value: "3", trend: "2 due soon" }
              ]
            }
          ]
        }
      ];
    }

    return tables.map((table, index) => {
      const viewName = table.name;
      return {
        id: table.id,
        name: table.name,
        status: table.is_master_list
          ? "published"
          : index % 2 === 0
            ? "unpublished"
            : "draft",
        updatedAt: formattedDate,
        tableId: table.id,
        views: [
          {
            id: `${table.id}-overview`,
            label: "Overview",
            description: `Monitor ${viewName.toLowerCase()} metrics and assignments`,
            filters: [
              "Reach Metrics",
              "Responsible team member",
              "Status"
            ],
            insights: [
              {
                label: "Active records",
                value: records.length.toString(),
                trend: "Live snapshot"
              },
              {
                label: "Tracked fields",
                value: fields.length.toString(),
                trend: "Visible in view"
              },
              {
                label: "Last update",
                value: formattedDate,
                trend: "Auto-refresh"
              }
            ]
          },
          {
            id: `${table.id}-gallery`,
            label: `${viewName} gallery`,
            description: "Visual pipeline of highlighted work",
            filters: ["Priority", "Channel", "Owner"],
            insights: [
              { label: "Gallery cards", value: "12", trend: "Curated set" },
              { label: "Pinned items", value: "4", trend: "Team favorites" },
              { label: "New this week", value: "3", trend: "+1 vs last" }
            ]
          },
          {
            id: `${table.id}-timeline`,
            label: `${viewName} timeline`,
            description: "Schedule milestones and sprints",
            filters: ["Quarter", "Owner", "Status"],
            insights: [
              { label: "In progress", value: "6", trend: "On track" },
              { label: "Blocked", value: "1", trend: "Needs review" },
              { label: "Upcoming", value: "5", trend: "Next 30 days" }
            ]
          }
        ]
      };
    });
  }, [tables, fields.length, records.length, formattedDate]);

  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    interfaceSections[0]?.id ?? null
  );
  const [selectedViewId, setSelectedViewId] = useState<string | null>(
    interfaceSections[0]?.views[0]?.id ?? null
  );

  const selectedSection = interfaceSections.find(
    section => section.id === selectedSectionId
  );
  const selectedView = selectedSection?.views.find(
    view => view.id === selectedViewId
  );

  useEffect(() => {
    if (interfaceSections.length === 0) return;
    if (!selectedSectionId) {
      setSelectedSectionId(interfaceSections[0].id);
      setSelectedViewId(interfaceSections[0].views[0]?.id ?? null);
      return;
    }

    const stillExists = interfaceSections.some(
      section => section.id === selectedSectionId
    );
    if (!stillExists) {
      setSelectedSectionId(interfaceSections[0].id);
      setSelectedViewId(interfaceSections[0].views[0]?.id ?? null);
    }
  }, [interfaceSections, selectedSectionId]);

  useEffect(() => {
    if (!selectedSection) return;
    if (!selectedViewId) {
      setSelectedViewId(selectedSection.views[0]?.id ?? null);
    }
    if (
      selectedSection.tableId &&
      selectedSection.tableId !== selectedTableId
    ) {
      onSelectTable(selectedSection.tableId);
    }
  }, [selectedSection, selectedViewId, selectedTableId, onSelectTable]);

  const displayedFields = fields.slice(0, 4);

  return (
    <div className="flex h-full bg-gray-100 rounded-xl border border-gray-200 overflow-hidden">
      <aside className="w-80 border-r border-gray-200 bg-white flex flex-col">
        <div className="px-4 py-3 border-b border-gray-200">
          <button className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:border-blue-500 hover:text-blue-600 transition-colors">
            <Plus size={14} />
            New interface
          </button>
        </div>

        <div className="px-4 py-3 border-b border-gray-200">
          <p className="text-xs font-semibold uppercase text-gray-500">
            {base?.name || "Workspace"}
          </p>
          <p className="text-sm text-gray-500">
            {interfaceSections.length} interfaces
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-3 flex items-center justify-between text-xs text-gray-500 uppercase">
            <span>Interfaces</span>
            <button className="text-blue-600 font-medium">+ Add</button>
          </div>

          <div className="space-y-2 px-2 pb-4">
            {interfaceSections.map(section => {
              const isActive = section.id === selectedSectionId;
              return (
                <div
                  key={section.id}
                  className={`rounded-xl border p-3 cursor-pointer transition-colors ${
                    isActive
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-blue-300"
                  }`}
                  onClick={() => {
                    setSelectedSectionId(section.id);
                    setSelectedViewId(section.views[0]?.id ?? null);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <LayoutDashboard
                        size={18}
                        className="text-gray-400 flex-shrink-0"
                      />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {section.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          Updated {section.updatedAt}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[11px] uppercase font-semibold rounded-full px-2 py-0.5 ${
                        section.status === "published"
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : section.status === "unpublished"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-gray-100 text-gray-600 border border-gray-200"
                      }`}
                    >
                      {section.status === "published"
                        ? "Published"
                        : "Unpublished"}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1">
                    {section.views.map(view => {
                      const isSelectedView = view.id === selectedViewId;
                      return (
                        <button
                          key={view.id}
                          className={`w-full flex items-center justify-between rounded-lg px-2 py-1.5 text-xs ${
                            isSelectedView
                              ? "bg-white text-blue-700 shadow-sm"
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedSectionId(section.id);
                            setSelectedViewId(view.id);
                          }}
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isSelectedView ? "bg-blue-500" : "bg-gray-300"
                              }`}
                            />
                            {view.label}
                          </span>
                          <span className="text-gray-400">•</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      <section className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>Previewing as</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-600">
                  Yourself
                </span>
                <span className="text-gray-300">•</span>
                <span className="text-amber-600">
                  Interface has unpublished changes
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                <span className="text-gray-900 font-semibold">
                  {selectedSection?.name}
                </span>
                <ChevronRight size={16} className="text-gray-400" />
                <span>{selectedView?.label}</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {selectedView?.description}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                <Share2 size={16} />
                Share interface
              </button>
              <button className="inline-flex items-center gap-1 rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                <Rocket size={16} />
                Publish
              </button>
            </div>
          </div>
        </div>

        <div className="border-b border-gray-200 bg-gray-50 px-6 py-3 flex items-center gap-3 flex-wrap">
          {selectedView?.filters?.map(filter => (
            <button
              key={filter}
              className="inline-flex items-center gap-2 rounded-full bg-white border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 shadow-sm"
            >
              <Filter size={14} className="text-gray-400" />
              {filter}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <button className="text-sm text-gray-600 hover:text-gray-900">
              Group
            </button>
            <button className="text-sm text-gray-600 hover:text-gray-900">
              Filter
            </button>
            <button className="text-sm text-gray-600 hover:text-gray-900">
              Sort
            </button>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Search"
                className="pl-8 pr-3 py-1.5 rounded-full border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>
        </div>

        <div className="border-b border-gray-200 bg-white px-6 py-5">
          <div className="grid gap-4 md:grid-cols-3">
            {selectedView?.insights?.map(insight => (
              <div
                key={insight.label}
                className="rounded-xl border border-gray-200 px-4 py-3 bg-gray-50"
              >
                <p className="text-xs uppercase text-gray-500">
                  {insight.label}
                </p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  {insight.value}
                </p>
                {insight.trend && (
                  <p className="text-xs text-gray-500 mt-1">{insight.trend}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto px-6 py-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedView?.label}
                </h3>
                <p className="text-sm text-gray-500">
                  Showing {records.length}{" "}
                  {records.length === 1 ? "record" : "records"} from{" "}
                  {selectedSection?.name}
                </p>
              </div>
              <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700">
                <Plus size={16} />
                Add record
              </button>
            </div>

            {loading || loadingRecords ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="animate-spin" size={20} />
                  Loading view...
                </div>
              </div>
            ) : tables.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  Start building interfaces
                </h4>
                <p className="text-sm text-gray-500 mb-4">
                  Create a table to unlock curated layouts that feel like
                  Airtable Interfaces.
                </p>
                <button className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <Plus size={16} />
                  Create table
                </button>
              </div>
            ) : (
              <div className="flex-1 overflow-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {displayedFields.map(field => (
                        <th
                          key={field.id}
                          className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                        >
                          {field.name}
                        </th>
                      ))}
                      {displayedFields.length === 0 && (
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          No fields configured
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {records.slice(0, 10).map(record => (
                      <tr key={record.id} className="hover:bg-blue-50/30">
                        {displayedFields.length === 0 ? (
                          <td className="px-6 py-4 text-sm text-gray-500">
                            Add fields to see values here.
                          </td>
                        ) : (
                          displayedFields.map(field => {
                            const rawValue = record.values?.[field.id];
                            const label =
                              rawValue === undefined ||
                              rawValue === null ||
                              rawValue === ""
                                ? "—"
                                : String(rawValue);
                            return (
                              <td
                                key={`${record.id}-${field.id}`}
                                className="px-6 py-3 text-sm text-gray-900"
                              >
                                {label}
                              </td>
                            );
                          })
                        )}
                      </tr>
                    ))}
                    {records.length === 0 && (
                      <tr>
                        <td
                          colSpan={
                            displayedFields.length === 0
                              ? 1
                              : displayedFields.length
                          }
                          className="px-6 py-10 text-center text-sm text-gray-500"
                        >
                          No records yet. Interfaces will mirror the first ten
                          rows of the selected table.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {records.length > 10 && (
                  <div className="px-6 py-2 text-right text-xs text-gray-500 border-t border-gray-100">
                    Showing 10 of {records.length} records
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
