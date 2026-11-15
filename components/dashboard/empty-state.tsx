import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { EmptyDataState } from "@/components/underwriting/empty-data-state";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return <EmptyDataState icon={icon} title={title} description={description} action={action} className={className} />;
}
