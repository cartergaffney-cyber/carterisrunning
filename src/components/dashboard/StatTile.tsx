import { Card } from "@/components/ui/Card";

interface StatTileProps {
  label: string;
  value: string;
  subtitle?: string;
}

export function StatTile({ label, value, subtitle }: StatTileProps) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold tracking-tight">{value}</span>
      {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
    </Card>
  );
}
