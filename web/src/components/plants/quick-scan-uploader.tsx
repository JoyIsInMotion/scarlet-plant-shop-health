'use client';
import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Upload, Image as ImageIcon, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { AIAnalysisCard } from './ai-analysis-card';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { apiFetch } from '@/lib/api/client';
import type { AIAnalysis } from '@scarlet/shared';

interface QuickScanUploaderProps {
  isAuthed?: boolean;
}

export function QuickScanUploader({ isAuthed = false }: QuickScanUploaderProps) {
  const t = useTranslations();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [limitReached, setLimitReached] = useState(false);

  function handleFile(f: File) {
    if (!f.type.startsWith('image/')) {
      toast({ title: t('errors.invalidFileType'), variant: 'destructive' });
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast({ title: t('errors.fileTooLarge'), variant: 'destructive' });
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setAnalysis(null);
  }

  async function handleScan() {
    if (!file) return;
    setLoading(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await apiFetch('/api/ai/quick-scan', { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok) {
        // Anonymous visitor has used their one free scan
        if (json.code === 'ANON_LIMIT') {
          setLimitReached(true);
          return;
        }
        throw new Error(json.error ?? t('errors.serverError'));
      }
      const { analysis, advice, careBasics } = json.data;
      setAnalysis({ ...analysis, adviceEn: advice?.en ?? null, adviceBg: advice?.bg ?? null, careBasics });
      // After a logged-out visitor's free scan, nudge them to sign up
      if (!isAuthed) setLimitReached(true);
      toast({ title: t('ai.analysisComplete'), variant: 'success' });
    } catch (err: unknown) {
      toast({
        title: t('common.error'),
        description: err instanceof Error ? err.message : t('errors.serverError'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Free-scan hint for logged-out visitors */}
      {!isAuthed && !limitReached && !analysis && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
          <Sparkles className="h-4 w-4 shrink-0 text-emerald-600" />
          {t('ai.freeScanHint')}
        </div>
      )}

      {/* Drop zone */}
      <div
        className={`relative rounded-xl border-2 border-dashed transition-colors ${
          dragOver ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-gray-50'
        } ${preview ? 'p-2' : 'p-10'}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files[0];
          if (f) handleFile(f);
        }}
      >
        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt="preview"
              className="mx-auto max-h-64 rounded-lg object-contain"
            />
            <button
              onClick={() => { setPreview(null); setFile(null); setAnalysis(null); }}
              className="absolute top-2 right-2 rounded-full bg-white p-1 shadow hover:bg-gray-100"
            >
              <X className="h-4 w-4 text-gray-600" />
            </button>
          </div>
        ) : (
          <div className="text-center">
            <ImageIcon className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-700">{t('ai.dragAndDrop')}</p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP · max 5MB</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              {t('ai.uploadImage')}
            </Button>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </div>

      {file && !analysis && !limitReached && (
        <Button onClick={handleScan} isLoading={loading} className="w-full">
          {loading ? t('ai.analyzing') : t('ai.scanButton')}
        </Button>
      )}

      {loading && (
        <div className="flex justify-center">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {analysis && <AIAnalysisCard analysis={analysis} />}

      {/* Register / login CTA after the free scan (or when the limit is hit) */}
      {!isAuthed && limitReached && (
        <div className="rounded-2xl border border-scarlet/20 bg-scarlet/5 p-5 text-center">
          <p className="font-semibold text-foreground">{t('ai.registerForMoreTitle')}</p>
          <p className="mt-1 text-sm text-muted">{t('ai.registerForMoreDesc')}</p>
          <div className="mt-4 flex justify-center gap-2">
            <Button asChild className="rounded-full">
              <Link href="/register">{t('auth.register')}</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/login">{t('auth.login')}</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
