"use client";

import { useAdminLang, type TranslationKey } from "@/lib/admin-i18n";

interface AdminPageTitleProps {
  titleKey: TranslationKey;
  subtitle?: string;
}

export function AdminPageTitle({ titleKey, subtitle }: AdminPageTitleProps) {
  const { t } = useAdminLang();
  return (
    <div>
      <h1 className="text-3xl font-bold">{t(titleKey)}</h1>
      {subtitle ? (
        <p className="text-muted-foreground">{subtitle}</p>
      ) : null}
    </div>
  );
}
