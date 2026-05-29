import type { ReactNode } from "react";

export function SectionHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between border-b border-border pb-2">
      <div>
        <h2 className="font-serif text-xl font-bold leading-tight">{title}</h2>
        {subtitle && (
          <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>
      {right}
    </div>
  );
}
