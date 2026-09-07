import { useState } from 'react';
import { useListCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '@workspace/api-client-react';
import { ImageUpload } from '@/components/admin/image-upload';
import { getImageSrc } from '@/lib/image-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Search, Edit, Trash2, FolderTree, Tag, Hash, AlignLeft, CheckSquare, Square, MoreHorizontal } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { getListCategoriesQueryKey } from '@workspace/api-client-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';

const categorySchema = z.object({
  name: z.string().min(2, "Le nom est requis"),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  iconName: z.string().optional(),
  sortOrder: z.coerce.number().min(0).default(0),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

export default function AdminCategories() {
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  
  const queryClient = useQueryClient();
  const { data: categories, isLoading } = useListCategories({ query: { queryKey: getListCategoriesQueryKey() } });

  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      description: '',
      imageUrl: '',
      iconName: '',
      sortOrder: 0,
    },
  });

  const filteredCategories = categories?.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  ).sort((a, b) => a.sortOrder - b.sortOrder);

  const onSubmit = async (data: CategoryFormValues) => {
    try {
      const payload = {
        ...data,
        imageUrl: data.imageUrl || undefined,
        iconName: data.iconName || undefined,
      };

      if (editingCategory) {
        await updateCategory.mutateAsync({ id: editingCategory.id, data: payload as any });
        toast.success('Catégorie mise à jour');
      } else {
        await createCategory.mutateAsync({ data: payload as any });
        toast.success('Catégorie créée');
      }
      setIsDialogOpen(false);
      setEditingCategory(null);
      form.reset();
      queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
    } catch (err: any) {
      toast.error(editingCategory ? 'Erreur lors de la mise à jour' : 'Erreur lors de la création');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteCategory.mutateAsync({ id: deleteConfirmId });
      toast.success('Catégorie supprimée');
      queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
    } catch (err: any) {
      toast.error('Erreur lors de la suppression. Des produits y sont peut-être liés.');
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const openCreate = () => {
    setEditingCategory(null);
    form.reset({
      name: '',
      description: '',
      imageUrl: '',
      iconName: '',
      sortOrder: 0,
    });
    setIsDialogOpen(true);
  };

  const openEdit = (category: any) => {
    setEditingCategory(category);
    form.reset({
      name: category.name,
      description: category.description || '',
      imageUrl: category.imageUrl || '',
      iconName: category.iconName || '',
      sortOrder: category.sortOrder || 0,
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Catégories</h2>
          <p className="text-muted-foreground text-sm">Structurez votre catalogue avec des catégories.</p>
        </div>
        <Button onClick={openCreate} className="shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> Nouvelle catégorie
        </Button>
      </div>

      <Card className="border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher une catégorie..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background shadow-sm border-border h-9"
            />
          </div>
          <div className="text-sm text-muted-foreground font-medium whitespace-nowrap">
            {filteredCategories?.length || 0} catégories
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/40 border-b border-border">
              <tr>
                <th className="px-4 py-3 font-semibold w-16">Ordre</th>
                <th className="px-4 py-3 font-semibold w-16">Image</th>
                <th className="px-4 py-3 font-semibold">Nom & Slug</th>
                <th className="px-4 py-3 font-semibold">Description</th>
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
                    <td className="px-4 py-4"><Skeleton className="h-4 w-full max-w-[200px]" /></td>
                    <td className="px-4 py-4 text-center"><Skeleton className="h-4 w-8 mx-auto" /></td>
                    <td className="px-4 py-4 text-right"><Skeleton className="h-8 w-8 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredCategories?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <FolderTree className="h-12 w-12 mb-4 text-muted-foreground/30" />
                      <p className="text-lg font-medium text-foreground">Aucune catégorie</p>
                    </div>
                  </td>
                </tr>
              ) : filteredCategories?.map((category) => (
                <tr key={category.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground font-mono">{category.sortOrder}</td>
                  <td className="px-4 py-3">
                    <div className="w-10 h-10 rounded-md bg-muted p-1 flex items-center justify-center border border-border overflow-hidden">
                      {category.imageUrl ? (
                        <img src={getImageSrc(category.imageUrl)} alt="" className="w-full h-full object-cover mix-blend-multiply dark:mix-blend-normal" />
                      ) : (
                        <Tag className="h-4 w-4 text-muted-foreground/50" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-foreground">{category.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Hash className="h-3 w-3" /> {category.slug}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-sm line-clamp-2 max-w-[300px]">
                    {category.description || '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-secondary/10 text-secondary font-medium text-xs">
                      {category.productCount || 0}
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
                        <DropdownMenuItem onClick={() => openEdit(category)}>
                          <Edit className="mr-2 h-4 w-4" /> Modifier
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setDeleteConfirmId(category.id)} className="text-destructive focus:bg-destructive/10">
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
              <DialogTitle className="text-xl">{editingCategory ? 'Modifier la catégorie' : 'Créer une catégorie'}</DialogTitle>
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
                      <FormLabel>Nom de la catégorie *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Écrans originaux" {...field} />
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
                        <Textarea placeholder="Courte description de la catégorie..." className="resize-none" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image de la catégorie</FormLabel>
                      <FormControl>
                        <ImageUpload
                          folder="categories"
                          value={field.value}
                          onChange={(v) => field.onChange(v ?? '')}
                          spec={{ width: 400, height: 400, ratio: '1:1', formats: ['WebP', 'PNG', 'JPG'], note: 'Fond transparent recommandé' }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="iconName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Icône Lucide (Optionnel)</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: smartphone" {...field} />
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
                          <Input type="number" min="0" {...field} />
                        </FormControl>
                        <FormDescription className="text-xs">0 = premier</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <div className="px-6 py-4 border-t border-border bg-background flex justify-end gap-3 shrink-0">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={createCategory.isPending || updateCategory.isPending}>
                  {(createCategory.isPending || updateCategory.isPending) ? 'Enregistrement...' : 'Enregistrer'}
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
              Êtes-vous sûr de vouloir supprimer cette catégorie ? Cette action est irréversible. 
              Assurez-vous qu'aucun produit n'y est associé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteCategory.isPending ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
