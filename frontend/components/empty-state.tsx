import type { LucideIcon } from "lucide-react";
import { IconBadge } from "@/components/icon-badge";
import type { Tone } from "@/lib/tones";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  tone = "emerald",
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  tone?: Tone;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-xl border border-dashed px-6 py-12 text-center",
        className,
      )}
    >
      {icon && <IconBadge icon={icon} tone={tone} size="lg" className="mb-4" />}
      <p className="font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
