import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlantEditForm } from '@/components/plants/plant-edit-form';
import { Link } from '@/i18n/navigation';
import { getAccessToken } from '@/lib/auth/cookies';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { getPlant } from '@/services/plants.service';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('plants');
  return { title: t('editPlant') };
}

export default async function EditPlantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations();

  let plant = null;
  try {
    const token = await getAccessToken();
    if (token) {
      const { sub: userId, role } = verifyAccessToken(token);
      plant = await getPlant(id, userId, role);
    }
  } catch { /* expired or forbidden */ }

  if (!plant) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link href={`/plants/${id}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('plants.editPlant')}</h1>
          <p className="text-sm text-gray-500">{t('plants.editSubtitle')}</p>
        </div>
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <PlantEditForm plant={plant as any} />
    </div>
  );
}
