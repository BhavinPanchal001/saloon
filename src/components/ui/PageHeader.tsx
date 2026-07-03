import React from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-gold-600">
            {eyebrow}
          </p>
        ) : null}
        {title && <h1 className="mt-1 text-xl md:text-2xl text-ink">{title}</h1>}
        {description && <p className="mt-1 max-w-2xl text-xs leading-5 text-navy-700/85">{description}</p>}
      </div>
      {action ? <div className="flex-shrink-0">{action}</div> : null}
    </div>
  );
}
