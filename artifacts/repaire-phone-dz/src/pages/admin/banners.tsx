import { useState } from 'react';
import { useListBanners, useCreateBanner, useUpdateBanner, useDeleteBanner } from '@workspace/api-client-react';
import { ImageUpload } from '@/components/admin/image-upload';
import { getImageSrc } from '@/lib/image-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Image as ImageIcon, Monitor, Smartphone, ArrowRight } from 'lucide-react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { getListBannersQueryKey } from '@workspace/api-client-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const bannerSchema = z.object({
  title: z.string().min(2, "Le titre est requis"),
  subtitle: z.string().optional(),
  imageUrl: z.string().optional(),
  mobileImageUrl: z.string().optional(),
  linkUrl: z.string().optional(),
  buttonText: z.string().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().min(0).default(0),
  desktopPosition: z.enum(['left', 'center', 'right']).default('left'),
  mobilePosition: z.enum(['left', 'center', 'right']).default('left'),
  showTitleDesktop: z.boolean().default(true),
  showButtonDesktop: z.boolean().default(true),
  showTitleMobile: z.boolean().default(true),
  showButtonMobile: z.boolean().default(true),
});

type BannerFormValues = z.infer<typeof bannerSchema>;

const DEFAULTS: BannerFormValues = {
  title: '',
  subtitle: '',
  imageUrl: '',
  mobileImageUrl: '',
  linkUrl: '',
  buttonText: '',
  isActive: true,
  sortOrder: 0,
  desktopPosition: 'left',
  mobilePosition: 'left',
  showTitleDesktop: true,
  showButtonDesktop: true,
  showTitleMobile: true,
  showButtonMobile: true,
};

// Live phone preview — reads from watched form values
function MobilePreview({ form }: { form: ReturnType<typeof useForm<BannerFormValues>> }) {
  const values = useWatch({ control: form.control });
  const desktopSrc = (values.imageUrl && getImageSrc(values.imageUrl)) || undefined;
  const mobileSrc  = (values.mobileImageUrl && getImageSrc(values.mobileImageUrl)) || desktopSrc;
  const imageSrc   = mobileSrc || `https://placehold.co/1080x1080/1e3a5f/ffffff?text=Mobile+Preview`;
  const showTitle  = values.showTitleMobile  !== false;
  const showButton = values.showButtonMobile !== false;
  const pos        = values.mobilePosition || 'left';
  const alignClass = pos === 'center' ? 'items-center text-center' : pos === 'right' ? 'items-end text-right' : 'items-start text-left';

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
        <Smartphone className="h-4 w-4" />
        Prévisualisation mobile (390px)
      </div>
      {/* Phone frame */}
      <div className="mx-auto" style={{ width: 210 }}>
        <div className="relative bg-gray-900 rounded-[28px] p-[8px] shadow-xl ring-1 ring-white/10">
          {/* notch */}
          <div className="absolute top-[10px] left-1/2 -translate-x-1/2 w-14 h-2.5 bg-gray-900 rounded-full z-10" />
          {/* screen */}
          <div className="rounded-[20px] overflow-hidden bg-black relative" style={{ aspectRatio: '1/1' }}>
            <img
              src={imageSrc}
              alt="Preview"
              className="w-full h-full object-cover object-center"
            />
            {/* gradient */}
            {(showTitle || showButton) && (
              <div className="absolute inset-0 bg-gradient-to-b from-navy/50 via-navy/20 to-transparent" />
            )}
            {/* overlay */}
            {(showTitle || showButton) && (
              <div className={`absolute inset-0 flex flex-col justify-end p-3 pb-4 ${alignClass}`}>
                {showTitle && (
                  <>
                    <p className="text-white font-extrabold leading-tight drop-shadow text-[10px]">
                      {values.title || 'Titre'}
                    </p>
                    {values.subtitle && (
                      <p className="text-white/80 text-[8px] mt-0.5 mb-1.5 drop-shadow">
                        {values.subtitle}
                      </p>
                    )}
                  </>
                )}
                {showButton && (
                  <div className="mt-1">
                    <span className="inline-flex items-center gap-0.5 bg-secondary text-white text-[8px] font-bold px-2 py-1 rounded shadow">
                      {values.buttonText || 'Découvrir'}
                      <ArrowRight className="h-2 w-2" />
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <p className="text-center text-[10px] text-muted-foreground mt-2">
          {values.mobileImageUrl ? '📱 Image Mobile' : '⚠️ Image Desktop utilisée'}
        </p>
      </div>
    </div>
  );
}

export default function AdminBanners() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data: banners, isLoading } = useQuery({
    queryKey: ['admin', 'banners'],
    queryFn: async () => {
      const res = await fetch('/api/admin/banners', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch banners');
      return res.json();
    }
  });

  const createBanner = useCreateBanner();
  const updateBanner = useUpdateBanner();
  const deleteBanner = useDeleteBanner();

  const form = useForm<BannerFormValues>({
    resolver: zodResolver(bannerSchema),
    defaultValues: DEFAULTS,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] });
    queryClient.invalidateQueries({ queryKey: getListBannersQueryKey() });
  };

  const onSubmit = async (data: BannerFormValues) => {
    try {
      const payload = {
        ...data,
        subtitle: data.subtitle || undefined,
        imageUrl: data.imageUrl || undefined,
        mobileImageUrl: data.mobileImageUrl || undefined,
        linkUrl: data.linkUrl || undefined,
        buttonText: data.buttonText || undefined,
      };
      if (editingBanner) {
        await updateBanner.mutateAsync({ id: editingBanner.id, data: payload as any });
        toast.success('Bannière mise à jour');
      } else {
        await createBanner.mutateAsync({ data: payload as any });
        toast.success('Bannière créée');
      }
      setIsDialogOpen(false);
      setEditingBanner(null);
      form.reset(DEFAULTS);
      invalidate();
    } catch {
      toast.error(editingBanner ? 'Erreur lors de la mise à jour' : 'Erreur lors de la création');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteBanner.mutateAsync({ id: deleteConfirmId });
      toast.success('Bannière supprimée');
      invalidate();
    } catch {
      toast.error('Erreur lors de la suppression.');
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const toggleStatus = async (banner: any) => {
    try {
      await updateBanner.mutateAsync({ id: banner.id, data: { isActive: !banner.isActive } });
      toast.success(banner.isActive ? 'Bannière désactivée' : 'Bannière activée');
      invalidate();
    } catch {
      toast.error('Erreur lors de la modification du statut');
    }
  };

  const openCreate = () => {
    setEditingBanner(null);
    form.reset(DEFAULTS);
    setIsDialogOpen(true);
  };

  const openEdit = (banner: any) => {
    setEditingBanner(banner);
    form.reset({
      title: banner.title,
      subtitle: banner.subtitle || '',
      imageUrl: banner.imageUrl || '',
      mobileImageUrl: banner.mobileImageUrl || '',
      linkUrl: banner.linkUrl || '',
      buttonText: banner.buttonText || '',
      isActive: banner.isActive,
      sortOrder: banner.sortOrder || 0,
      desktopPosition: banner.desktopPosition || 'left',
      mobilePosition: banner.mobilePosition || 'left',
      showTitleDesktop: banner.showTitleDesktop !== false,
      showButtonDesktop: banner.showButtonDesktop !== false,
      showTitleMobile: banner.showTitleMobile !== false,
      showButtonMobile: banner.showButtonMobile !== false,
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Bannières</h2>
          <p className="text-muted-foreground text-sm">Gérez le carrousel de la page d'accueil.</p>
        </div>
        <Button onClick={openCreate} className="shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> Nouvelle bannière
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
            <Card key={i} className="border-border shadow-sm overflow-hidden">
              <Skeleton className="h-40 w-full rounded-none" />
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex justify-between pt-2">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : banners?.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-card rounded-xl border border-dashed border-border flex flex-col items-center">
            <ImageIcon className="h-12 w-12 mb-4 text-muted-foreground/30" />
            <p className="text-lg font-medium text-foreground">Aucune bannière</p>
            <p className="text-sm text-muted-foreground mt-1">Créez votre première bannière pour la page d'accueil.</p>
            <Button variant="outline" className="mt-4" onClick={openCreate}>Créer une bannière</Button>
          </div>
        ) : banners?.sort((a: any, b: any) => a.sortOrder - b.sortOrder).map((banner: any) => (
          <Card key={banner.id} className={`border-border shadow-sm overflow-hidden transition-all hover:border-primary/50 ${!banner.isActive ? 'opacity-70 grayscale-[30%]' : ''}`}>
            <div className="h-40 w-full bg-muted flex items-center justify-center relative overflow-hidden group">
              {banner.imageUrl ? (
                <img src={getImageSrc(banner.imageUrl)} alt={banner.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              ) : (
                <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
              )}
              <div className="absolute top-2 right-2 flex gap-1 flex-wrap justify-end">
                <Badge className="font-mono bg-black/50 backdrop-blur-sm text-white hover:bg-black/50 border-none shadow-sm">Ordre: {banner.sortOrder}</Badge>
                {banner.mobileImageUrl && <Badge className="bg-blue-500/80 backdrop-blur-sm text-white border-none shadow-sm flex items-center gap-1"><Smartphone className="h-2.5 w-2.5" />Mobile</Badge>}
                {!banner.isActive && <Badge variant="destructive" className="border-none shadow-sm">Inactif</Badge>}
              </div>
            </div>
            <CardContent className="p-4 flex flex-col h-auto">
              <div className="flex-1 min-h-16">
                <h3 className="font-bold text-foreground line-clamp-1">{banner.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{banner.subtitle || <span className="italic opacity-50">Sans sous-titre</span>}</p>
                <div className="flex gap-1.5 flex-wrap mt-2">
                  {!banner.showTitleMobile  && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Titre mobile masqué</Badge>}
                  {!banner.showButtonMobile && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Bouton mobile masqué</Badge>}
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 mt-2 border-t border-border">
                <div className="flex items-center gap-2">
                  <Switch checked={banner.isActive} onCheckedChange={() => toggleStatus(banner)} />
                  <span className="text-xs font-medium">{banner.isActive ? 'Visible' : 'Masquée'}</span>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={() => openEdit(banner)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteConfirmId(banner.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setTimeout(() => form.reset(DEFAULTS), 300); }}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-muted/10 shrink-0">
            <DialogHeader>
              <DialogTitle className="text-xl">{editingBanner ? 'Modifier la bannière' : 'Créer une bannière'}</DialogTitle>
              <DialogDescription>Cette bannière sera affichée dans le carrousel de la page d'accueil.</DialogDescription>
            </DialogHeader>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
              {/* Two-column layout: form left, phone preview right */}
              <div className="flex gap-0 max-h-[72vh] overflow-hidden">

                {/* Left: scrollable form */}
                <div className="flex-1 p-6 space-y-5 overflow-y-auto">

                  {/* --- Texte --- */}
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titre *</FormLabel>
                      <FormControl><Input placeholder="Ex: Nouveaux arrivages iPhone" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="subtitle" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sous-titre</FormLabel>
                      <FormControl><Input placeholder="Pièces 100% originales" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* --- Images --- */}
                  <Separator />
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-semibold text-sm">Image Desktop</h4>
                    </div>
                    <FormField control={form.control} name="imageUrl" render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <ImageUpload
                            folder="banners"
                            value={field.value}
                            onChange={(v) => field.onChange(v ?? '')}
                            spec={{ width: 1920, height: 700, ratio: '2.74:1', formats: ['WebP', 'PNG'], note: 'Format paysage grande résolution' }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-semibold text-sm">Image Mobile</h4>
                      <span className="text-xs text-muted-foreground">(optionnel — utilise Desktop si absent)</span>
                    </div>
                    <FormField control={form.control} name="mobileImageUrl" render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <ImageUpload
                            folder="banners"
                            value={field.value}
                            onChange={(v) => field.onChange(v ?? '')}
                            spec={{ width: 1080, height: 1080, ratio: '1:1', formats: ['WebP', 'PNG'], note: 'Format carré pour mobile (ou 1080×1200)' }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  {/* --- Positions --- */}
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="desktopPosition" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5"><Monitor className="h-3.5 w-3.5" /> Position texte Desktop</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="left">Gauche</SelectItem>
                            <SelectItem value="center">Centre</SelectItem>
                            <SelectItem value="right">Droite</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="mobilePosition" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5" /> Position texte Mobile</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="left">Gauche</SelectItem>
                            <SelectItem value="center">Centre</SelectItem>
                            <SelectItem value="right">Droite</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  {/* --- Per-device visibility toggles --- */}
                  <Separator />
                  <div className="space-y-3">
                    <p className="text-sm font-semibold">Éléments affichés par appareil</p>
                    <p className="text-xs text-muted-foreground -mt-1">Désactivez si votre image contient déjà le texte ou le bouton intégrés.</p>

                    {/* Desktop row */}
                    <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        <Monitor className="h-3.5 w-3.5" /> Desktop
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <FormField control={form.control} name="showTitleDesktop" render={({ field }) => (
                          <FormItem className="flex items-center gap-2 space-y-0">
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            <FormLabel className="!m-0 text-sm font-normal cursor-pointer">Afficher le titre</FormLabel>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="showButtonDesktop" render={({ field }) => (
                          <FormItem className="flex items-center gap-2 space-y-0">
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            <FormLabel className="!m-0 text-sm font-normal cursor-pointer">Afficher le bouton</FormLabel>
                          </FormItem>
                        )} />
                      </div>
                    </div>

                    {/* Mobile row */}
                    <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        <Smartphone className="h-3.5 w-3.5" /> Mobile
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <FormField control={form.control} name="showTitleMobile" render={({ field }) => (
                          <FormItem className="flex items-center gap-2 space-y-0">
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            <FormLabel className="!m-0 text-sm font-normal cursor-pointer">Afficher le titre</FormLabel>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="showButtonMobile" render={({ field }) => (
                          <FormItem className="flex items-center gap-2 space-y-0">
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            <FormLabel className="!m-0 text-sm font-normal cursor-pointer">Afficher le bouton</FormLabel>
                          </FormItem>
                        )} />
                      </div>
                    </div>
                  </div>

                  {/* --- Lien & bouton --- */}
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="buttonText" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Texte du bouton</FormLabel>
                        <FormControl><Input placeholder="Acheter maintenant" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="linkUrl" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lien de destination</FormLabel>
                        <FormControl><Input placeholder="/products?categoryId=1" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  {/* --- Ordre & statut --- */}
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                    <FormField control={form.control} name="sortOrder" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ordre d'affichage</FormLabel>
                        <FormControl><Input type="number" min="0" {...field} /></FormControl>
                        <FormDescription className="text-xs">0 = premier slide</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="isActive" render={({ field }) => (
                      <FormItem className="flex flex-col justify-end pb-2">
                        <div className="flex items-center space-x-2">
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="!m-0">Bannière Active</FormLabel>
                        </div>
                      </FormItem>
                    )} />
                  </div>
                </div>

                {/* Right: sticky phone preview */}
                <div className="w-60 border-l border-border bg-muted/10 p-5 flex flex-col justify-start overflow-y-auto shrink-0">
                  <MobilePreview form={form} />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-border bg-background flex justify-end gap-3 shrink-0">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={createBanner.isPending || updateBanner.isPending}>
                  {(createBanner.isPending || updateBanner.isPending) ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>Êtes-vous sûr de vouloir supprimer cette bannière ? Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteBanner.isPending ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
