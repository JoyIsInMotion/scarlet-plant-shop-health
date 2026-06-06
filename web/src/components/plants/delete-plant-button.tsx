'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Trash2, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface DeletePlantButtonProps {
  plantId: string;
}

export function DeletePlantButton({ plantId }: DeletePlantButtonProps) {
  const t = useTranslations();
  const router = useRouter();
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/plants/${plantId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error(t('errors.serverError'));
      }

      toast({ title: t('common.success'), description: t('plants.plantDeleted'), variant: 'success' });
      router.push('/plants');
    } catch (error: unknown) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('errors.serverError'),
        variant: 'destructive',
      });
      setIsDeleting(false);
    }
  }

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setShowDialog(true)}
        className="rounded-full gap-1"
      >
        <Trash2 className="h-4 w-4" />
        {t('common.delete')}
      </Button>

      {showDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm border-red-200 bg-red-50 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <CardTitle className="text-red-900">{t('plants.dangerZone')}</CardTitle>
              </div>
              <button
                onClick={() => setShowDialog(false)}
                disabled={isDeleting}
                className="p-1 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="h-4 w-4 text-red-600" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-red-900 mb-2">{t('plants.deletePlant')}</p>
                <p className="text-sm text-red-800">{t('plants.deleteConfirm')}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 rounded-full"
                  onClick={() => setShowDialog(false)}
                  disabled={isDeleting}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 rounded-full"
                  onClick={handleDelete}
                  isLoading={isDeleting}
                >
                  {t('common.delete')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
