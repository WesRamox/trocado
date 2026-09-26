import type { LucideIcon } from "lucide-react";
import { IconBadge } from "@/components/icon-badge";
import type { Tone } from "@/lib/tones";

export function PageHeader({
  title,
  icon,
  tone = "emerald",
  description,
  actions,
}: {
  title: string;
  icon?: LucideIcon;
  tone?: Tone;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="flex items-center gap-4">
        {icon && <IconBadge icon={icon} tone={tone} size="md" className="sm:size-12 sm:[&_svg]:size-6" />}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
