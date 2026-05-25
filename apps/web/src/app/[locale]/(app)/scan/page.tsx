import { getTranslations } from 'next-intl/server';
import { QuickScanUploader } from '@/components/plants/quick-scan-uploader';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('nav');
  return { title: t('scan') };
}

export default async function ScanPage() {
  const t = await getTranslations();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('ai.quickScan')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('ai.uploadImage')}</p>
      </div>
      <QuickScanUploader />
    </div>
  );
}
