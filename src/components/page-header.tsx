
'use client';

import type { PropsWithChildren } from "react";
import { useTranslation } from "@/hooks/use-translation";

type PageHeaderProps = PropsWithChildren<{
  title: string;
  description: string;
}>;

export function PageHeader({ title, description, children }: PageHeaderProps) {
  const { t } = useTranslation();
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-2xl font-bold tracking-tight font-headline">
          <span className="lang-en">{title}</span>
          <span className="lang-th">{t(title)}</span> 
        </h2>
        <p className="text-muted-foreground">
           <span className="lang-en">{description}</span>
           <span className="lang-th">{description}</span>
        </p>
      </div>
      {children && <div className="flex shrink-0 gap-2">{children}</div>}
    </div>
  );
}
