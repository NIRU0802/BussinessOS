import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warning" | "danger";
}

const toneClasses: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "text-slate-900",
  warning: "text-amber-600",
  danger: "text-red-600",
};

export function StatCard({ label, value, hint, tone = "default" }: StatCardProps) {
  return (
    <Card>
      <CardContent className="py-5">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className={cn("mt-1 text-2xl font-semibold", toneClasses[tone])}>{value}</p>
        {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      </CardContent>
    </Card>
  );
}
