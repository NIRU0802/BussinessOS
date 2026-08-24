"use client";

type ReportTab = "sales" | "best-sellers" | "branch-rollup" | "audit-log";

interface ReportTabsProps {
  active: ReportTab;
  onChange: (tab: ReportTab) => void;
  showBranchRollup: boolean;
}

const BASE_TABS: { id: ReportTab; label: string }[] = [
  { id: "sales", label: "Sales Summary" },
  { id: "best-sellers", label: "Best Sellers" },
  { id: "audit-log", label: "Audit Log" },
];

export function ReportTabs({ active, onChange, showBranchRollup }: ReportTabsProps) {
  const tabs = showBranchRollup
    ? [
        ...BASE_TABS.slice(0, 2),
        { id: "branch-rollup" as const, label: "Branch Rollup" },
        BASE_TABS[2],
      ]
    : BASE_TABS;

  return (
    <div className="flex gap-1 border-b border-slate-200">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`border-b-2 px-3 py-2 text-sm font-medium ${
            active === tab.id
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
