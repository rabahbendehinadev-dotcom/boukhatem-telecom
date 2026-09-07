import { useState } from 'react';
import { useListBrands, useCreateBrand, useUpdateBrand, useDeleteBrand } from '@workspace/api-client-react';
import { ImageUpload } from '@/components/admin/image-upload';
import { getImageSrc } from '@/lib/image-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Search, Edit, Trash2, Tag, Hash, Box, MoreHorizontal } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { getListBrandsQueryKey } from '@workspace/api-client-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';

const brandSchema = z.object({
  name: z.string().min(2, "Le nom est requis"),
  description: z.string().optional(),
  logoUrl: z.string().optional(),
  sortOrder: z.coerce.number().min(0).default(0),
});

type BrandFormValues = z.infer<typeof brandSchema>;

export default function AdminBrands() {
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  
  const queryClient = useQueryClient();
  const { data: brands, isLoading } = useListBrands({ query: { queryKey: getListBrandsQueryKey() } });

  const createBrand = useCreateBrand();
  const updateBrand = useUpdateBrand();
  const deleteBrand = useDeleteBrand();

  const form = useForm<BrandFormValues>({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      name: '',
      description: '',
      logoUrl: '',
      sortOrder: 0,
    },
  });

  const filteredBrands = brands?.filter(b => 
    b.name.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => a.sortOrder - b.sortOrder);

  const onSubmit = async (data: BrandFormValues) => {
    try {
      const payload = {
        ...data,
        logoUrl: data.logoUrl || undefined,
      };

      if (editingBrand) {
        await updateBrand.mutateAsync({ id: editingBrand.id, data: payload as any });
        toast.success('Marque mise à jour');
      } else {
        await createBrand.mutateAsync({ data: payload as any });
        toast.success('Marque créée');
      }
      setIsDialogOpen(false);
      setEditingBrand(null);
      form.reset();
      queryClient.invalidateQueries({ queryKey: getListBrandsQueryKey() });
    } catch (err: any) {
      toast.error(editingBrand ? 'Erreur lors de la mise à jour' : 'Erreur lors de la création');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteBrand.mutateAsync({ id: deleteConfirmId });
      toast.success('Marque supprimée');
      queryClient.invalidateQueries({ queryKey: getListBrandsQueryKey() });
    } catch (err: any) {
      toast.error('Erreur lors de la suppression. Des produits y sont peut-être liés.');
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const openCreate = () => {
    setEditingBrand(null);
    form.reset({
      name: '',
      description: '',
      logoUrl: '',
      sortOrder: 0,
    });
    setIsDialogOpen(true);
  };

  const openEdit = (brand: any) => {
    setEditingBrand(brand);
    form.reset({
      name: brand.name,
      description: brand.description || '',
      logoUrl: brand.logoUrl || '',
      sortOrder: brand.sortOrder || 0,
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Marques</h2>
          <p className="text-muted-foreground text-sm">Gérez les marques des équipements et pièces (Apple, Samsung...).</p>
        </div>
        <Button onClick={openCreate} className="shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> Nouvelle marque
        </Button>
      </div>

      <Card className="border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher une marque..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background shadow-sm border-border h-9"
            />
          </div>
          <div className="text-sm text-muted-foreground font-medium whitespace-nowrap">
            {filteredBrands?.length || 0} marques
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/40 border-b border-border">
              <tr>
                <th className="px-4 py-3 font-semibold w-16">Ordre</th>
                <th className="px-4 py-3 font-semibold w-16">Logo</th>
                <th className="px-4 py-3 font-semibold">Nom & Slug</th>
                <th className="px-4 py-3 font-semibold text-center w-24">Produits</th>
                <th className="px-4 py-3 font-semibold text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-4" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-10 w-10 rounded" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-24 mt-1" /></td>
                    <td className="px-4 py-4 text-center"><Skeleton className="h-4 w-8 mx-auto" /></td>
                    <td className="px-4 py-4 text-right"><Skeleton className="h-8 w-8 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredBrands?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Box className="h-12 w-12 mb-4 text-muted-foreground/30" />
                      <p className="text-lg font-medium text-foreground">Aucune marque trouvée</p>
                    </div>
                  </td>
                </tr>
              ) : filteredBrands?.map((brand) => (
                <tr key={brand.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground font-mono">{brand.sortOrder}</td>
                  <td className="px-4 py-3">
                    <div className="w-10 h-10 rounded-md bg-white p-1 flex items-center justify-center border border-border overflow-hidden">
                      {brand.logoUrl ? (
                        <img src={getImageSrc(brand.logoUrl)} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <Tag className="h-4 w-4 text-muted-foreground/50" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-foreground">{brand.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Hash className="h-3 w-3" /> {brand.slug}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-secondary/10 text-secondary font-medium text-xs">
                      {brand.productCount || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[160px]">
                        <DropdownMenuItem onClick={() => openEdit(brand)}>
                          <Edit className="mr-2 h-4 w-4" /> Modifier
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setDeleteConfirmId(brand.id)} className="text-destructive focus:bg-destructive/10">
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
              <DialogTitle className="text-xl">{editingBrand ? 'Modifier la marque' : 'Créer une marque'}</DialogTitle>
            </DialogHeader>
          </div>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
              <div className="p-6 space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom de la marque *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Apple" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Courte description..." className="resize-none" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="logoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Logo de la marque</FormLabel>
                      <FormControl>
                        <ImageUpload
                          folder="brands"
                          value={field.value}
                          onChange={(v) => field.onChange(v ?? '')}
                          spec={{ width: 400, height: 200, ratio: '2:1', formats: ['PNG', 'WebP', 'SVG'], note: 'Fond transparent recommandé' }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="sortOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ordre d'affichage</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" className="max-w-[150px]" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">0 = premier</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="px-6 py-4 border-t border-border bg-background flex justify-end gap-3 shrink-0">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={createBrand.isPending || updateBrand.isPending}>
                  {(createBrand.isPending || updateBrand.isPending) ? 'Enregistrement...' : 'Enregistrer'}
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
              Êtes-vous sûr de vouloir supprimer cette marque ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteBrand.isPending ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
