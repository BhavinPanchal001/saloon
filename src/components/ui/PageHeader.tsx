import React from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gold-600">
            {eyebrow}
          </p>
        ) : null}
        {title && <h1 className="mt-3 text-4xl text-ink">{title}</h1>}
        {description && <p className="mt-3 max-w-2xl text-sm leading-7 text-navy-700/80">{description}</p>}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
