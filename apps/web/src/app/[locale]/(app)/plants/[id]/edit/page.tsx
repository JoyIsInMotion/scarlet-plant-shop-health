import { getTranslations } from 'next-intl/server';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlantEditForm } from '@/components/plants/plant-edit-form';
import { Link } from '@/i18n/navigation';
import type { Metadata } from 'next';

async function getPlant(id: string, token: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const res = await fetch(`${base}/api/plants/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const { data } = await res.json();
  return data;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('plants');
  return { title: t('editPlant') };
}

export default async function EditPlantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations();
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';
  const plant = await getPlant(id, token);

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

      <PlantEditForm plant={plant} />
    </div>
  );
}
