import { Badge } from "@/components/ui/badge";

interface SeverityBadgeProps {
  severity: "low" | "medium" | "high";
}

const severityCopy: Record<SeverityBadgeProps["severity"], string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const variant: "destructive" | "warning" | "success" =
    severity === "high" ? "destructive" : severity === "medium" ? "warning" : "success";

  return <Badge variant={variant}>Severity: {severityCopy[severity]}</Badge>;
}
