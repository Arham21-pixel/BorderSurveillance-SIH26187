import type { ReactNode, HTMLAttributes } from "react";

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padded?: boolean;
}

export default function Panel({ children, className = "", padded = true, ...rest }: PanelProps) {
  return (
    <div
      className={`n-card ${padded ? "p-5" : ""} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
