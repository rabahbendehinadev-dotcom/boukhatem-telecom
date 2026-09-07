import { useState } from 'react';
import { useListCoupons, useCreateCoupon, useUpdateCoupon, useDeleteCoupon } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Search, Edit, Trash2, Ticket, Calendar, MoreHorizontal, Power, PowerOff } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { getListCouponsQueryKey } from '@workspace/api-client-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { format, isPast, isFuture } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

const couponSchema = z.object({
  code: z.string().min(3, "Le code doit contenir au moins 3 caractères").toUpperCase(),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.coerce.number().min(1, "La valeur doit être supérieure à 0"),
  minOrderAmount: z.coerce.number().optional().nullable(),
  maxUses: z.coerce.number().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

type CouponFormValues = z.infer<typeof couponSchema>;

export default function AdminCoupons() {
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  
  const queryClient = useQueryClient();
  const { data: coupons, isLoading } = useListCoupons({ query: { queryKey: getListCouponsQueryKey() } });

  const createCoupon = useCreateCoupon();
  const updateCoupon = useUpdateCoupon();
  const deleteCoupon = useDeleteCoupon();

  const form = useForm<CouponFormValues>({
    resolver: zodResolver(couponSchema),
    defaultValues: {
      code: '',
      discountType: 'percentage',
      discountValue: 0,
      minOrderAmount: null,
      maxUses: null,
      expiresAt: '',
      isActive: true,
    },
  });

  const filteredCoupons = coupons?.filter(c => 
    c.code.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const onSubmit = async (data: CouponFormValues) => {
    try {
      const payload = {
        ...data,
        minOrderAmount: data.minOrderAmount || undefined,
        maxUses: data.maxUses || undefined,
        expiresAt: data.expiresAt || undefined,
      };

      if (editingCoupon) {
        await updateCoupon.mutateAsync({ id: editingCoupon.id, data: payload as any });
        toast.success('Code promo mis à jour');
      } else {
        await createCoupon.mutateAsync({ data: payload as any });
        toast.success('Code promo créé');
      }
      setIsDialogOpen(false);
      setEditingCoupon(null);
      form.reset();
      queryClient.invalidateQueries({ queryKey: getListCouponsQueryKey() });
    } catch (err: any) {
      toast.error(editingCoupon ? 'Erreur lors de la mise à jour' : 'Erreur lors de la création (code existant?)');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteCoupon.mutateAsync({ id: deleteConfirmId });
      toast.success('Code promo supprimé');
      queryClient.invalidateQueries({ queryKey: getListCouponsQueryKey() });
    } catch (err: any) {
      toast.error('Erreur lors de la suppression.');
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const toggleStatus = async (coupon: any) => {
    try {
      await updateCoupon.mutateAsync({ 
        id: coupon.id, 
        data: { isActive: !coupon.isActive } 
      });
      toast.success(coupon.isActive ? 'Coupon désactivé' : 'Coupon activé');
      queryClient.invalidateQueries({ queryKey: getListCouponsQueryKey() });
    } catch(err) {
      toast.error('Erreur lors de la modification du statut');
    }
  };

  const openCreate = () => {
    setEditingCoupon(null);
    form.reset({
      code: '',
      discountType: 'percentage',
      discountValue: 0,
      minOrderAmount: null,
      maxUses: null,
      expiresAt: '',
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const openEdit = (coupon: any) => {
    setEditingCoupon(coupon);
    form.reset({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minOrderAmount: coupon.minOrderAmount,
      maxUses: coupon.maxUses,
      expiresAt: coupon.expiresAt ? format(new Date(coupon.expiresAt), "yyyy-MM-dd'T'HH:mm") : '',
      isActive: coupon.isActive,
    });
    setIsDialogOpen(true);
  };

  const getStatusBadge = (coupon: any) => {
    if (!coupon.isActive) {
      return <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 font-medium">Inactif</Badge>;
    }
    if (coupon.expiresAt && isPast(new Date(coupon.expiresAt))) {
      return <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-400 dark:border-red-700 font-medium">Expiré</Badge>;
    }
    if (coupon.maxUses && coupon.usageCount >= coupon.maxUses) {
      return <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-700 font-medium">Épuisé</Badge>;
    }
    return <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-700 font-medium">Actif</Badge>;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Codes Promo</h2>
          <p className="text-muted-foreground text-sm">Générez des coupons de réduction pour vos clients.</p>
        </div>
        <Button onClick={openCreate} className="shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> Nouveau code
        </Button>
      </div>

      <Card className="border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher un code (ex: SUMMER2024)..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background shadow-sm border-border h-9 uppercase"
            />
          </div>
          <div className="text-sm text-muted-foreground font-medium whitespace-nowrap">
            {filteredCoupons?.length || 0} codes
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/40 border-b border-border">
              <tr>
                <th className="px-4 py-3 font-semibold">Code</th>
                <th className="px-4 py-3 font-semibold">Réduction</th>
                <th className="px-4 py-3 font-semibold text-center">Utilisations</th>
                <th className="px-4 py-3 font-semibold">Limites</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-4"><Skeleton className="h-6 w-24 rounded" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-4 py-4 text-center"><Skeleton className="h-4 w-12 mx-auto" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-24 mt-1" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
                    <td className="px-4 py-4 text-right"><Skeleton className="h-8 w-8 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredCoupons?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Ticket className="h-12 w-12 mb-4 text-muted-foreground/30" />
                      <p className="text-lg font-medium text-foreground">Aucun code promo</p>
                    </div>
                  </td>
                </tr>
              ) : filteredCoupons?.map((coupon) => (
                <tr key={coupon.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-secondary/10 border border-secondary/20">
                      <Ticket className="h-3.5 w-3.5 text-secondary" />
                      <span className="font-bold font-mono text-secondary tracking-wider text-sm">{coupon.code}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-bold text-foreground">
                    {coupon.discountType === 'percentage' 
                      ? `${coupon.discountValue}%` 
                      : `${coupon.discountValue.toLocaleString('fr-DZ')} DA`}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-medium text-foreground">{coupon.usageCount}</span>
                    {coupon.maxUses && <span className="text-muted-foreground text-xs"> / {coupon.maxUses}</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    <div className="flex flex-col gap-1">
                      {coupon.minOrderAmount ? <span>Min: {coupon.minOrderAmount.toLocaleString('fr-DZ')} DA</span> : <span>Sans minimum</span>}
                      {coupon.expiresAt ? (
                        <span className={`flex items-center gap-1 ${isPast(new Date(coupon.expiresAt)) ? 'text-destructive' : ''}`}>
                          <Calendar className="h-3 w-3" />
                          Jusqu'au {format(new Date(coupon.expiresAt), 'dd/MM/yyyy HH:mm')}
                        </span>
                      ) : <span>Pas d'expiration</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(coupon)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[180px]">
                        <DropdownMenuItem onClick={() => openEdit(coupon)}>
                          <Edit className="mr-2 h-4 w-4" /> Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleStatus(coupon)}>
                          {coupon.isActive ? (
                            <><PowerOff className="mr-2 h-4 w-4" /> Désactiver</>
                          ) : (
                            <><Power className="mr-2 h-4 w-4" /> Activer</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setDeleteConfirmId(coupon.id)} className="text-destructive focus:bg-destructive/10">
                          <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if(!open) setTimeout(() => form.reset(), 300); }}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-muted/10 shrink-0">
            <DialogHeader>
              <DialogTitle className="text-xl">{editingCoupon ? 'Modifier le code promo' : 'Créer un code promo'}</DialogTitle>
              <DialogDescription>Définissez les règles de réduction applicables au panier.</DialogDescription>
            </DialogHeader>
          </div>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code Promo *</FormLabel>
                      <FormControl>
                        <Input placeholder="SUMMER20" className="uppercase font-mono font-bold" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="discountType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type de réduction *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                            <SelectItem value="fixed">Montant fixe (DA)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="discountValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valeur *</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="minOrderAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum d'achat (DA)</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" value={field.value || ''} onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)} placeholder="Aucun" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="maxUses"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Limites d'utilisation</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" value={field.value || ''} onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)} placeholder="Illimité" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="expiresAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date d'expiration</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" value={field.value || ''} onChange={field.onChange} />
                      </FormControl>
                      <FormDescription className="text-xs">Laissez vide si le code n'expire jamais.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-3 shadow-sm bg-card mt-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm font-medium">Coupon Actif</FormLabel>
                        <FormDescription className="text-xs">Permet aux clients de l'utiliser.</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="px-6 py-4 border-t border-border bg-background flex justify-end gap-3 shrink-0">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={createCoupon.isPending || updateCoupon.isPending}>
                  {(createCoupon.isPending || updateCoupon.isPending) ? 'Enregistrement...' : 'Enregistrer'}
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
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce code promo ? Cette action ne peut pas être annulée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteCoupon.isPending ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
