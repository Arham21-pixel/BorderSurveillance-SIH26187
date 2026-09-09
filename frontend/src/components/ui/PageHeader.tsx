import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  actions?: ReactNode;
}

export default function PageHeader({ title, subtitle, badge, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-5 border-b border-netra-accent/12">
      <div>
        {badge && <div className="flex flex-wrap items-center gap-2 mb-2">{badge}</div>}
        <h1 className="n-page-title">{title}</h1>
        {subtitle && <p className="n-page-sub">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
