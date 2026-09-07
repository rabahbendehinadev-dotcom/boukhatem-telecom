import { useState } from 'react';
import { useListProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useListCategories, useListBrands } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetDescription } from '@/components/ui/sheet';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Search, Edit, Trash2, Image as ImageIcon, CheckCircle2, AlertCircle, Package, MoreHorizontal, FileDown, Eye, CheckSquare, Square } from 'lucide-react';
import { StockBadge, FeaturedBadge, NewBadge, isCriticalStock } from '@/components/admin/admin-badges';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { getListProductsQueryKey } from '@workspace/api-client-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { MultiImageUpload } from '@/components/admin/multi-image-upload';

const productSchema = z.object({
  name: z.string().min(2, "Le nom est requis"),
  description: z.string().optional(),
  price: z.coerce.number().min(1, "Le prix doit être supérieur à 0"),
  comparePrice: z.coerce.number().optional().nullable(),
  stock: z.coerce.number().min(0, "Le stock ne peut pas être négatif"),
  categoryId: z.coerce.number().nullable().optional(),
  brandId: z.coerce.number().nullable().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  isNew: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  hasDiscount: z.boolean().default(false),
  images: z.array(z.string()).optional(),
  specifications: z.string().optional(),
  shippingInfo: z.string().optional(),
  warrantyInfo: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function AdminProducts() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  
  const queryClient = useQueryClient();
  
  const queryParams = { 
    page, 
    limit,
    search: search || undefined,
    categoryId: categoryFilter !== 'all' ? Number(categoryFilter) : undefined
  };
  
  const { data: productsData, isLoading } = useListProducts(queryParams, { query: { queryKey: getListProductsQueryKey(queryParams) } });
  const { data: categories } = useListCategories();
  const { data: brands } = useListBrands();

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      stock: 0,
      sku: '',
      barcode: '',
      isNew: false,
      isFeatured: false,
      hasDiscount: false,
      images: [],
      specifications: '',
      shippingInfo: '',
      warrantyInfo: '',
      metaTitle: '',
      metaDescription: '',
    },
  });

  const onSubmit = async (data: ProductFormValues) => {
    try {
      if (editingProduct) {
        await updateProduct.mutateAsync({ id: editingProduct.id, data: data as any });
        toast.success('Produit mis à jour avec succès');
      } else {
        await createProduct.mutateAsync({ data: data as any });
        toast.success('Produit créé avec succès');
      }
      setIsSheetOpen(false);
      setEditingProduct(null);
      form.reset();
      queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
      queryClient.invalidateQueries({ queryKey: ['products'] }); // invalidate storefront cache
    } catch (err: any) {
      toast.error(editingProduct ? 'Erreur lors de la mise à jour' : 'Erreur lors de la création');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteProduct.mutateAsync({ id: deleteConfirmId });
      toast.success('Produit supprimé avec succès');
      queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
      queryClient.invalidateQueries({ queryKey: ['products'] }); // invalidate storefront cache
    } catch (err: any) {
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const openCreate = () => {
    setEditingProduct(null);
    form.reset({
      name: '',
      description: '',
      price: 0,
      stock: 0,
      sku: '',
      barcode: '',
      isNew: false,
      isFeatured: false,
      hasDiscount: false,
      images: [],
      specifications: '',
      shippingInfo: '',
      warrantyInfo: '',
      metaTitle: '',
      metaDescription: '',
    });
    setIsSheetOpen(true);
  };

  const openEdit = (product: any) => {
    setEditingProduct(product);
    form.reset({
      name: product.name,
      description: product.description || '',
      price: product.price,
      comparePrice: product.comparePrice,
      stock: product.stock,
      sku: product.sku || '',
      barcode: product.barcode || '',
      categoryId: product.categoryId,
      brandId: product.brandId,
      isNew: product.isNew,
      isFeatured: product.isFeatured,
      hasDiscount: product.hasDiscount,
      images: product.images || [],
      specifications: product.specifications || '',
      shippingInfo: product.shippingInfo || '',
      warrantyInfo: product.warrantyInfo || '',
      metaTitle: product.metaTitle || '',
      metaDescription: product.metaDescription || '',
    });
    setIsSheetOpen(true);
  };

  const toggleRowSelection = (id: number) => {
    const newSet = new Set(selectedRowIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedRowIds(newSet);
  };

  const toggleAllSelection = () => {
    if (selectedRowIds.size === productsData?.products?.length) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(productsData?.products?.map(p => p.id) || []));
    }
  };

  const exportCSV = () => {
    if (!productsData?.products?.length) return;
    const headers = ['ID', 'Nom', 'SKU', 'Prix', 'Stock', 'Catégorie', 'Marque'];
    const rows = productsData.products.map(p => [
      p.id,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.sku || ''}"`,
      p.price,
      p.stock,
      `"${p.categoryName || ''}"`,
      `"${p.brandName || ''}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'produits.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Catalogue Produits</h2>
          <p className="text-muted-foreground text-sm">Gérez vos produits, prix et inventaire.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="shadow-sm bg-background" onClick={exportCSV} disabled={!productsData?.products?.length}>
            <FileDown className="mr-2 h-4 w-4" /> Exporter
          </Button>
          <Button onClick={openCreate} className="shadow-sm">
            <Plus className="mr-2 h-4 w-4" /> Ajouter un produit
          </Button>
        </div>
      </div>

      <Card className="border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher un produit (Nom, SKU)..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background shadow-sm border-border h-9"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[200px] h-9 bg-background shadow-sm">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {categories?.map(c => (
                  <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedRowIds.size > 0 && (
          <div className="bg-primary/5 border-b border-border px-4 py-2 flex items-center justify-between animate-in slide-in-from-top-2">
            <span className="text-sm font-medium text-primary">{selectedRowIds.size} sélectionné(s)</span>
            <div className="flex gap-2">
              <Button variant="destructive" size="sm" className="h-8 text-xs shadow-sm">
                <Trash2 className="mr-2 h-3.5 w-3.5" /> Supprimer
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs text-muted-foreground" onClick={() => setSelectedRowIds(new Set())}>
                Annuler
              </Button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/40 border-b border-border sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 w-[40px]">
                  <button onClick={toggleAllSelection} className="text-muted-foreground hover:text-foreground focus:outline-none">
                    {selectedRowIds.size === productsData?.products?.length && productsData?.products?.length > 0 ? (
                      <CheckSquare className="h-4 w-4 text-primary" />
                    ) : selectedRowIds.size > 0 ? (
                      <div className="relative h-4 w-4 border rounded bg-primary border-primary flex items-center justify-center">
                        <div className="h-0.5 w-2 bg-primary-foreground rounded-full"></div>
                      </div>
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 font-semibold w-12">Img</th>
                <th className="px-4 py-3 font-semibold">Produit</th>
                <th className="px-4 py-3 font-semibold">Catégorie</th>
                <th className="px-4 py-3 font-semibold">Prix</th>
                <th className="px-4 py-3 font-semibold">Stock</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {isLoading ? (
                Array(10).fill(0).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-4" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-10 w-10 rounded" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-24 mt-1" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-4 py-4 text-right"><Skeleton className="h-8 w-8 ml-auto" /></td>
                  </tr>
                ))
              ) : productsData?.products?.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Package className="h-12 w-12 mb-4 text-muted-foreground/30" />
                      <p className="text-lg font-medium text-foreground">Aucun produit trouvé</p>
                      <p className="text-sm mt-1">Commencez par ajouter un nouveau produit.</p>
                      <Button variant="outline" className="mt-4" onClick={openCreate}>Ajouter un produit</Button>
                    </div>
                  </td>
                </tr>
              ) : productsData?.products.map((product) => (
                <tr key={product.id} className={cn(
                  'hover:bg-muted/30 transition-colors',
                  selectedRowIds.has(product.id) ? 'bg-primary/5' : '',
                  isCriticalStock(product.stock) && !selectedRowIds.has(product.id) ? 'bg-red-50/50 dark:bg-red-950/10' : ''
                )}>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleRowSelection(product.id)} className="text-muted-foreground hover:text-foreground focus:outline-none">
                      {selectedRowIds.has(product.id) ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-10 h-10 rounded-md bg-muted p-1 flex items-center justify-center border border-border overflow-hidden">
                      {product.images?.[0] ? (
                        <img src={product.images[0]} alt="" className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
                      ) : (
                        <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-foreground line-clamp-1">{product.name}</div>
                    <div className="text-xs text-muted-foreground/70 mt-0.5 font-mono">{product.sku || 'Sans SKU'}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-sm">
                    {product.categoryName || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-foreground">{product.price.toLocaleString('fr-DZ')} DA</div>
                    {product.comparePrice && product.comparePrice > product.price && (
                      <div className="text-xs text-muted-foreground/60 line-through">{product.comparePrice.toLocaleString('fr-DZ')} DA</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StockBadge stock={product.stock} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {product.isFeatured && <FeaturedBadge />}
                      {product.isNew && <NewBadge />}
                      {(!product.isFeatured && !product.isNew) && <span className="text-muted-foreground/50 text-xs">—</span>}
                    </div>
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
                        <DropdownMenuItem onClick={() => openEdit(product)}>
                          <Edit className="mr-2 h-4 w-4" /> Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a href={`/products/${product.slug}`} target="_blank" rel="noopener noreferrer" className="w-full flex items-center cursor-pointer">
                            <Eye className="mr-2 h-4 w-4" /> Voir sur le site
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setDeleteConfirmId(product.id)} className="text-destructive focus:bg-destructive/10">
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

        {productsData && productsData.totalPages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between bg-muted/5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Afficher</span>
              <Select value={limit.toString()} onValueChange={(v) => { setLimit(Number(v)); setPage(1); }}>
                <SelectTrigger className="h-8 w-[70px] bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-muted-foreground">
                Page {page} sur {productsData.totalPages} ({productsData.total} produits)
              </span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-8">Précédent</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(productsData.totalPages, p + 1))} disabled={page === productsData.totalPages} className="h-8">Suivant</Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Create / Edit Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={(open) => { setIsSheetOpen(open); if (!open) setTimeout(() => form.reset(), 300); }}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto sm:w-[540px] flex flex-col p-0">
          <div className="p-6 border-b border-border bg-muted/10 shrink-0">
            <SheetHeader>
              <SheetTitle className="text-xl">{editingProduct ? 'Modifier le produit' : 'Ajouter un produit'}</SheetTitle>
              <SheetDescription>
                Remplissez les détails du produit. Les champs marqués d'un astérisque (*) sont obligatoires.
              </SheetDescription>
            </SheetHeader>
          </div>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
              <Tabs defaultValue="informations" className="flex flex-col flex-1 min-h-0">
                {/* Tab navigation */}
                <div className="border-b border-border shrink-0 overflow-x-auto">
                  <TabsList className="bg-transparent h-10 rounded-none p-0 flex-nowrap min-w-max w-full justify-start">
                    <TabsTrigger value="informations" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none h-full px-4 text-sm whitespace-nowrap">Informations</TabsTrigger>
                    <TabsTrigger value="prix" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none h-full px-4 text-sm whitespace-nowrap">Prix & Stock</TabsTrigger>
                    <TabsTrigger value="images" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none h-full px-4 text-sm whitespace-nowrap">Images</TabsTrigger>
                    <TabsTrigger value="categorie" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none h-full px-4 text-sm whitespace-nowrap">Catégorie</TabsTrigger>
                    <TabsTrigger value="caracteristiques" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none h-full px-4 text-sm whitespace-nowrap">Caractéristiques</TabsTrigger>
                    <TabsTrigger value="promotion" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none h-full px-4 text-sm whitespace-nowrap">Promotion</TabsTrigger>
                    <TabsTrigger value="seo" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none h-full px-4 text-sm whitespace-nowrap">SEO</TabsTrigger>
                    <TabsTrigger value="publication" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none h-full px-4 text-sm whitespace-nowrap">Publication</TabsTrigger>
                  </TabsList>
                </div>

                {/* Tab contents */}
                <div className="flex-1 overflow-y-auto min-h-0">
                  {/* Tab: Informations */}
                  <TabsContent value="informations" className="mt-0 p-6 space-y-4 outline-none">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom du produit *</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Écran iPhone 13 Pro Max" {...field} />
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
                            <Textarea placeholder="Description détaillée du produit..." className="min-h-[100px] resize-none" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="sku"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SKU (Référence)</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: IP13-SCR-ORG" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="barcode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Code-barres</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: 123456789" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>

                  {/* Tab: Prix & Stock */}
                  <TabsContent value="prix" className="mt-0 p-6 space-y-4 outline-none">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prix de vente (DA) *</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="comparePrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prix comparé (DA)</FormLabel>
                            <FormControl>
                              <Input type="number" value={field.value || ''} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)} placeholder="Ancien prix" />
                            </FormControl>
                            <FormDescription className="text-[10px]">Affiché barré si supérieur au prix de vente.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="stock"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stock actuel *</FormLabel>
                          <FormControl>
                            <Input type="number" className="max-w-[180px]" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex flex-col gap-3 pt-2">
                      <FormField
                        control={form.control}
                        name="isNew"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-3 shadow-sm bg-card">
                            <div className="space-y-0.5">
                              <FormLabel className="text-sm font-medium">Nouveauté</FormLabel>
                              <FormDescription className="text-xs">Afficher le badge "Nouveau".</FormDescription>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="isFeatured"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-3 shadow-sm bg-card">
                            <div className="space-y-0.5">
                              <FormLabel className="text-sm font-medium">Mettre en avant</FormLabel>
                              <FormDescription className="text-xs">Afficher sur la page d'accueil.</FormDescription>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>

                  {/* Tab: Images */}
                  <TabsContent value="images" className="mt-0 p-6 outline-none">
                    <FormField
                      control={form.control}
                      name="images"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Galerie d'images</FormLabel>
                          <FormControl>
                            <MultiImageUpload
                              folder="products"
                              value={field.value || []}
                              onChange={field.onChange}
                              spec={{ width: 800, height: 800, ratio: '1:1', formats: ['WebP', 'JPG', 'PNG'], note: 'Carré, fond blanc ou transparent' }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  {/* Tab: Catégorie */}
                  <TabsContent value="categorie" className="mt-0 p-6 space-y-4 outline-none">
                    <FormField
                      control={form.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Catégorie</FormLabel>
                          <Select onValueChange={(val) => field.onChange(val === "null" ? null : Number(val))} value={field.value?.toString() || "null"}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner une catégorie" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="null">Aucune</SelectItem>
                              {categories?.map(c => (
                                <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="brandId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Marque</FormLabel>
                          <Select onValueChange={(val) => field.onChange(val === "null" ? null : Number(val))} value={field.value?.toString() || "null"}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner une marque" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="null">Aucune</SelectItem>
                              {brands?.map(b => (
                                <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  {/* Tab: Caractéristiques */}
                  <TabsContent value="caracteristiques" className="mt-0 p-6 space-y-4 outline-none">
                    <FormField
                      control={form.control}
                      name="specifications"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Spécifications techniques</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Compatibilité, dimensions, caractéristiques techniques..." className="min-h-[100px] resize-none" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="shippingInfo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Informations de livraison</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Délais, conditions d'expédition..." className="min-h-[80px] resize-none" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="warrantyInfo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Garantie</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Durée et conditions de garantie..." className="min-h-[80px] resize-none" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  {/* Tab: Promotion */}
                  <TabsContent value="promotion" className="mt-0 p-6 space-y-4 outline-none">
                    <FormField
                      control={form.control}
                      name="hasDiscount"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-3 shadow-sm bg-card">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm font-medium">En promotion</FormLabel>
                            <FormDescription className="text-xs">Met en évidence la réduction sur ce produit.</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="comparePrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prix comparé (DA)</FormLabel>
                          <FormControl>
                            <Input type="number" value={field.value || ''} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)} placeholder="Prix avant réduction" />
                          </FormControl>
                          <FormDescription className="text-xs">L'ancien prix affiché barré à côté du prix actuel.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  {/* Tab: SEO */}
                  <TabsContent value="seo" className="mt-0 p-6 space-y-4 outline-none">
                    <FormField
                      control={form.control}
                      name="metaTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Titre SEO (Meta Title)</FormLabel>
                          <FormControl>
                            <Input placeholder="Titre pour les moteurs de recherche..." {...field} />
                          </FormControl>
                          <FormDescription className="text-xs">Laissez vide pour utiliser le nom du produit.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="metaDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description SEO (Meta Description)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Description courte pour les résultats de recherche (150-160 caractères)..." className="min-h-[80px] resize-none" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  {/* Tab: Publication */}
                  <TabsContent value="publication" className="mt-0 p-6 space-y-4 outline-none">
                    <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                      <p className="text-sm font-medium text-foreground">Récapitulatif</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Nom</span>
                          <span className="font-medium truncate max-w-[200px]">{form.watch('name') || <span className="text-destructive italic">Non renseigné</span>}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Prix</span>
                          <span className="font-medium">{form.watch('price') ? `${form.watch('price').toLocaleString('fr-DZ')} DA` : <span className="text-destructive italic">Non renseigné</span>}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Stock</span>
                          <span className="font-medium">{form.watch('stock') ?? 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Images</span>
                          <span className="font-medium">{(form.watch('images') || []).length} image(s)</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                      ⚠️ Vérifiez les informations avant de publier. Les champs obligatoires (nom, prix, stock) doivent être renseignés.
                    </p>
                    <div className="flex flex-col gap-3">
                      <FormField
                        control={form.control}
                        name="isNew"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-3 shadow-sm bg-card">
                            <div className="space-y-0.5">
                              <FormLabel className="text-sm font-medium">Nouveauté</FormLabel>
                              <FormDescription className="text-xs">Afficher le badge "Nouveau".</FormDescription>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="isFeatured"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-3 shadow-sm bg-card">
                            <div className="space-y-0.5">
                              <FormLabel className="text-sm font-medium">Mettre en avant</FormLabel>
                              <FormDescription className="text-xs">Afficher sur la page d'accueil.</FormDescription>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
              
              <div className="p-6 border-t border-border bg-background shrink-0 flex items-center justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsSheetOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={createProduct.isPending || updateProduct.isPending}>
                  {(createProduct.isPending || updateProduct.isPending) ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Cela supprimera définitivement le produit et toutes ses données associées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteProduct.isPending ? 'Suppression...' : 'Supprimer le produit'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
