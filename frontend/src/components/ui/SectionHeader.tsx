import type { ReactNode } from "react";

interface SectionHeaderProps {
  icon?: ReactNode;
  title: string;
  action?: ReactNode;
}

export default function SectionHeader({ icon, title, action }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 pb-3.5 mb-4 border-b border-netra-accent/12">
      <span className="text-[13px] font-semibold text-netra-text flex items-center gap-2">
        {icon}
        {title}
      </span>
      {action}
    </div>
  );
}
