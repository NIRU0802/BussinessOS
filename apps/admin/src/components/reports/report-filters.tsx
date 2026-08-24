"use client";

import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { ReportPeriod } from "@/lib/enums";

interface ReportFiltersProps {
  startDate: string;
  endDate: string;
  period?: ReportPeriod;
  onStartDateChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
  onPeriodChange?: (v: ReportPeriod) => void;
  showPeriod?: boolean;
}

export function ReportFilters({
  startDate,
  endDate,
  period,
  onStartDateChange,
  onEndDateChange,
  onPeriodChange,
  showPeriod = true,
}: ReportFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <Input
        label="From"
        type="date"
        value={startDate.slice(0, 10)}
        onChange={(e) => onStartDateChange(new Date(e.target.value).toISOString())}
        className="w-40"
      />
      <Input
        label="To"
        type="date"
        value={endDate.slice(0, 10)}
        onChange={(e) => onEndDateChange(new Date(e.target.value).toISOString())}
        className="w-40"
      />
      {showPeriod && onPeriodChange && (
        <Select
          label="Group by"
          value={period}
          onChange={(e) => onPeriodChange(e.target.value as ReportPeriod)}
          className="w-32"
        >
          <option value="day">Day</option>
          <option value="week">Week</option>
          <option value="month">Month</option>
        </Select>
      )}
    </div>
  );
}
