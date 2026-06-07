'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Pencil, Trash2, PackagePlus, Flower2 } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/hooks/use-toast';

const CATEGORIES = ['bouquet', 'potted_plant', 'succulent', 'tropical', 'seasonal', 'accessories'] as const;

interface Product {
  id: string;
  nameBg: string;
  nameEn: string;
  descriptionBg: string | null;
  descriptionEn: string | null;
  price: string;
  category: string;
  imageUrl: string | null;
  stock: number;
  isActive: boolean;
}

type FormState = {
  nameBg: string; nameEn: string; descriptionBg: string; descriptionEn: string;
  price: string; category: string; imageUrl: string; stock: string; isActive: boolean;
};

const emptyForm: FormState = {
  nameBg: '', nameEn: '', descriptionBg: '', descriptionEn: '',
  price: '', category: 'bouquet', imageUrl: '', stock: '0', isActive: true,
};

export function ProductManager({ products, locale }: { products: Product[]; locale: string }) {
  const t = useTranslations();
  const router = useRouter();
  const { toast } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const formatPrice = (amount: string | number) =>
    new Intl.NumberFormat(locale === 'en' ? 'en' : 'bg', { style: 'currency', currency: 'BGN' }).format(Number(amount));

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(p: Product) {
    setEditingId(p.id);
    setForm({
      nameBg: p.nameBg, nameEn: p.nameEn,
      descriptionBg: p.descriptionBg ?? '', descriptionEn: p.descriptionEn ?? '',
      price: p.price, category: p.category, imageUrl: p.imageUrl ?? '',
      stock: String(p.stock), isActive: p.isActive,
    });
    setFormOpen(true);
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    if (!form.nameBg || !form.nameEn || !form.price) {
      toast({ title: t('errors.required'), variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const payload = {
        nameBg: form.nameBg,
        nameEn: form.nameEn,
        descriptionBg: form.descriptionBg || null,
        descriptionEn: form.descriptionEn || null,
        price: Number(form.price).toFixed(2),
        category: form.category,
        imageUrl: form.imageUrl || null,
        stock: parseInt(form.stock, 10) || 0,
        isActive: form.isActive,
      };
      const url = editingId ? `/api/products/${editingId}` : '/api/products';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: null }));
        throw new Error(error ?? t('errors.serverError'));
      }
      toast({ title: t('admin.productSaved'), variant: 'success' });
      setFormOpen(false);
      router.refresh();
    } catch (e) {
      toast({ title: t('common.error'), description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  async function restock(p: Product, amount = 10) {
    setBusy(true);
    try {
      const res = await fetch(`/api/products/${p.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: p.stock + amount }),
      });
      if (!res.ok) throw new Error();
      toast({ title: t('admin.productSaved'), variant: 'success' });
      router.refresh();
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast({ title: t('admin.productDeleted'), variant: 'success' });
      setDeleteId(null);
      router.refresh();
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={openCreate} className="gap-1.5">
          <Plus className="h-4 w-4" />
          {t('admin.newProduct')}
        </Button>
      </div>

      {products.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted">{t('admin.noProducts')}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">{t('admin.nameEn')}</th>
                <th className="px-4 py-3">{t('shop.price')}</th>
                <th className="px-4 py-3">{t('catalog.filterByCategory')}</th>
                <th className="px-4 py-3">{t('shop.stock')}</th>
                <th className="px-4 py-3">{t('admin.status')}</th>
                <th className="px-4 py-3 text-right">{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {p.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.imageUrl} alt="" className="h-8 w-8 rounded object-cover" />
                      ) : (
                        <span className="flex h-8 w-8 items-center justify-center rounded bg-cream"><Flower2 className="h-4 w-4 text-border" /></span>
                      )}
                      <div>
                        <div className="font-medium text-gray-900">{locale === 'en' ? p.nameEn : p.nameBg}</div>
                        <div className="text-xs text-gray-400">{locale === 'en' ? p.nameBg : p.nameEn}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{formatPrice(p.price)}</td>
                  <td className="px-4 py-3 text-gray-500">{t(`shop.category.${p.category as typeof CATEGORIES[number]}`)}</td>
                  <td className="px-4 py-3 text-gray-700">{p.stock}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {p.isActive ? t('admin.active') : t('admin.inactive')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => restock(p)}
                        disabled={busy}
                        title={`${t('admin.addStock')} +10`}
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-40"
                      >
                        <PackagePlus className="h-3.5 w-3.5" /> 10
                      </button>
                      <button
                        onClick={() => openEdit(p)}
                        disabled={busy}
                        title={t('common.edit')}
                        className="rounded-lg border border-border p-1.5 text-gray-500 transition-colors hover:bg-cream disabled:opacity-40"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteId(p.id)}
                        disabled={busy}
                        title={t('common.delete')}
                        className="rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-600 transition-colors hover:bg-red-100 disabled:opacity-40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / edit form */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? t('admin.editProduct') : t('admin.newProduct')}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('admin.nameBg')}><Input value={form.nameBg} onChange={(e) => set('nameBg', e.target.value)} /></Field>
            <Field label={t('admin.nameEn')}><Input value={form.nameEn} onChange={(e) => set('nameEn', e.target.value)} /></Field>
            <Field label={t('shop.price')}><Input type="number" step="0.01" value={form.price} onChange={(e) => set('price', e.target.value)} /></Field>
            <Field label={t('shop.stock')}><Input type="number" value={form.stock} onChange={(e) => set('stock', e.target.value)} /></Field>
            <Field label={t('catalog.filterByCategory')}>
              <select
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm focus:border-scarlet focus:outline-none"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{t(`shop.category.${c}`)}</option>)}
              </select>
            </Field>
            <Field label={t('admin.imageUrl')}><Input value={form.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} placeholder="https://..." /></Field>
            <Field label={t('admin.descriptionBg')} full>
              <textarea value={form.descriptionBg} onChange={(e) => set('descriptionBg', e.target.value)} rows={2}
                className="w-full resize-none rounded-xl border border-border bg-surface px-3 py-2 text-sm focus:border-scarlet focus:outline-none" />
            </Field>
            <Field label={t('admin.descriptionEn')} full>
              <textarea value={form.descriptionEn} onChange={(e) => set('descriptionEn', e.target.value)} rows={2}
                className="w-full resize-none rounded-xl border border-border bg-surface px-3 py-2 text-sm focus:border-scarlet focus:outline-none" />
            </Field>
            <label className="col-span-2 flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} className="h-4 w-4" />
              {t('admin.active')}
            </label>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={busy}>{t('common.cancel')}</Button>
            <Button onClick={save} isLoading={busy}>{editingId ? t('common.save') : t('admin.createProduct')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title={t('admin.editProduct')}
        description={t('admin.deleteProductConfirm')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        isLoading={busy}
        onConfirm={() => { if (deleteId) remove(deleteId); }}
      />
    </>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <label className="mb-1 block text-xs font-medium text-gray-500">{label}</label>
      {children}
    </div>
  );
}
