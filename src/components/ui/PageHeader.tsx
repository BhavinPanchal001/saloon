import React from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <div className="page-header mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0 flex-[1_1_18rem]">
        {eyebrow ? (
          <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-gold-600">
            {eyebrow}
          </p>
        ) : null}
        {title && <h1 className="mt-1 text-xl md:text-2xl text-ink">{title}</h1>}
        {description && <p className="mt-1 max-w-2xl text-xs leading-5 text-navy-700/85">{description}</p>}
      </div>
      {action ? <div className="page-actions flex max-w-full flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}
