import { Card } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

export function StatCard({ label, value, icon: Icon, accent = "primary" }: { label: string; value: number | string; icon: LucideIcon; accent?: "primary" | "success" | "warning" | "destructive" }) {
  const colors = {
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
  } as const;
  return (
    <Card className="p-4 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${colors[accent]}`} />
      </div>
      <div className="mt-3 font-display text-3xl font-semibold tabular-nums">{value}</div>
    </Card>
  );
}
