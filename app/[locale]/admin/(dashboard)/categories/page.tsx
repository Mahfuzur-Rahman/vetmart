import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/lib/i18n/config';
import { listSpecies } from '@/lib/services/species-server';
import { listCategories } from '@/lib/services/categories';
import { listDrugClassifications } from '@/lib/services/drug-classifications-server';

import { AdminCategoriesManagement } from '@/components/admin/AdminCategoriesManagement';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminCategoriesPage({ params }: Props) {
  const { locale } = await params;
  const loc = locale as Locale;
  setRequestLocale(loc);

  const [speciesList, categoryList, drugClassList] = await Promise.all([
    listSpecies(),
    listCategories(),
    listDrugClassifications(),
  ]);

  return (
    <AdminCategoriesManagement
      locale={loc}
      initialSpecies={speciesList}
      initialCategories={categoryList as any}
      initialDrugClassifications={drugClassList}
    />
  );
}

