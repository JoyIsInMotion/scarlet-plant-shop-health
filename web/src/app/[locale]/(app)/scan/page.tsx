import { getTranslations } from 'next-intl/server';
import { QuickScanUploader } from '@/components/plants/quick-scan-uploader';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { getAccessToken } from '@/lib/auth/cookies';
import { verifyAccessToken } from '@/lib/auth/jwt';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('nav');
  return { title: t('scan') };
}

export default async function ScanPage() {
  const t = await getTranslations();

  const token = await getAccessToken();
  let isAuthed = false;
  try {
    isAuthed = token ? Boolean(verifyAccessToken(token)) : false;
  } catch {
    isAuthed = false;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="warning" className="rounded-full">Beta</Badge>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{t('ai.quickScan')}</h1>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">{t('ai.quickScanNote')}</p>
      </div>
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-6">
          <QuickScanUploader isAuthed={isAuthed} />
        </CardContent>
      </Card>
    </div>
  );
}
