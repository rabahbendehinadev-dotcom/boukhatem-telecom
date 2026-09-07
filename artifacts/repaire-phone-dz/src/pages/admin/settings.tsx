import { useState, useEffect } from 'react';
import { useGetSettings, useUpdateSettings } from '@workspace/api-client-react';
import { ImageUpload } from '@/components/admin/image-upload';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Store, Phone, Mail, MapPin, Share2, Search, Truck, Lock, CreditCard, Wifi, CheckCircle2, XCircle, Package, Smartphone, Link2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useQueryClient } from '@tanstack/react-query';
import { getGetSettingsQueryKey } from '@workspace/api-client-react';

const optionalHttpUrl = z.string()
  .refine((value) => value === '' || /^https?:\/\//i.test(value), "L'URL doit commencer par http:// ou https://")
  .refine((value) => {
    if (value === '') return true;
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }, "URL invalide");
const optionalHttpsUrl = z.string()
  .refine((value) => value === '' || /^https:\/\//i.test(value), "L'URL de paiement doit commencer par https://")
  .refine((value) => {
    if (value === '') return true;
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }, "URL invalide");

const settingsSchema = z.object({
  storeName: z.string().min(2, "Le nom est requis"),
  logoUrl: z.string().optional(),
  faviconUrl: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email invalide").optional().or(z.literal('')),
  address: z.string().optional(),
  facebook: z.string().url("URL invalide").optional().or(z.literal('')),
  instagram: z.string().url("URL invalide").optional().or(z.literal('')),
  whatsapp: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  shippingCost: z.coerce.number().min(0).default(0),
  freeShippingThreshold: z.coerce.number().min(0).optional().nullable(),
  servicesSectionTitle: z.string().min(2, "Le titre est requis"),
  flexyTitle: z.string().min(2, "Le titre est requis"),
  flexyDescription: z.string().min(2, "La description est requise"),
  flexyButtonText: z.string().min(2, "Le texte du bouton est requis"),
  flexyUrl: optionalHttpUrl,
  flexyEnabled: z.boolean(),
  paymentTitle: z.string().min(2, "Le titre est requis"),
  paymentDescription: z.string().min(2, "La description est requise"),
  paymentButtonText: z.string().min(2, "Le texte du bouton est requis"),
  paymentUrl: optionalHttpsUrl,
  paymentEnabled: z.boolean(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState("general");
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const updateSettings = useUpdateSettings();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      storeName: '',
      logoUrl: '',
      faviconUrl: '',
      phone: '',
      email: '',
      address: '',
      facebook: '',
      instagram: '',
      whatsapp: '',
      metaTitle: '',
      metaDescription: '',
      shippingCost: 500,
      freeShippingThreshold: null,
      servicesSectionTitle: 'Nos services en ligne',
      flexyTitle: 'Application Flexy',
      flexyDescription: 'Téléchargez notre application Flexy',
      flexyButtonText: "Télécharger l'application",
      flexyUrl: '',
      flexyEnabled: false,
      paymentTitle: 'Paiement en ligne',
      paymentDescription: 'Payez rapidement et en toute sécurité',
      paymentButtonText: 'Payer maintenant',
      paymentUrl: '',
      paymentEnabled: false,
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        storeName: settings.storeName,
        logoUrl: settings.logoUrl || '',
        faviconUrl: settings.faviconUrl || '',
        phone: settings.phone || '',
        email: settings.email || '',
        address: settings.address || '',
        facebook: settings.facebook || '',
        instagram: settings.instagram || '',
        whatsapp: settings.whatsapp || '',
        metaTitle: settings.metaTitle || '',
        metaDescription: settings.metaDescription || '',
        shippingCost: settings.shippingCost || 0,
        freeShippingThreshold: settings.freeShippingThreshold,
        servicesSectionTitle: settings.servicesSectionTitle ?? 'Nos services en ligne',
        flexyTitle: settings.flexyTitle ?? 'Application Flexy',
        flexyDescription: settings.flexyDescription ?? 'Téléchargez notre application Flexy',
        flexyButtonText: settings.flexyButtonText ?? "Télécharger l'application",
        flexyUrl: settings.flexyUrl || '',
        flexyEnabled: settings.flexyEnabled ?? false,
        paymentTitle: settings.paymentTitle ?? 'Paiement en ligne',
        paymentDescription: settings.paymentDescription ?? 'Payez rapidement et en toute sécurité',
        paymentButtonText: settings.paymentButtonText ?? 'Payer maintenant',
        paymentUrl: settings.paymentUrl || '',
        paymentEnabled: settings.paymentEnabled ?? false,
      });
    }
  }, [settings, form]);

  const onSubmit = async (data: SettingsFormValues) => {
    try {
      const payload = {
        ...data,
        logoUrl: data.logoUrl || undefined,
        faviconUrl: data.faviconUrl || undefined,
        email: data.email || undefined,
        facebook: data.facebook || undefined,
        instagram: data.instagram || undefined,
        freeShippingThreshold: data.freeShippingThreshold || null,
        flexyUrl: data.flexyUrl || null,
        paymentUrl: data.paymentUrl || null,
      };
      
      await updateSettings.mutateAsync({ data: payload as any });
      toast.success('Paramètres mis à jour avec succès');
      queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
    } catch (err: any) {
      toast.error('Erreur lors de la mise à jour des paramètres');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const currentPassword = formData.get('currentPassword');
    const newPassword = formData.get('newPassword');
    const confirmPassword = formData.get('confirmPassword');

    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    try {
      const res = await fetch('/api/admin/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Mot de passe changé avec succès. Veuillez vous reconnecter.');
      setTimeout(() => {
        window.location.href = '/admin/login';
      }, 2000);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du changement de mot de passe');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[40px] w-full max-w-2xl" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Paramètres</h2>
        <p className="text-muted-foreground text-sm">Gérez les informations globales de votre boutique.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="border-b border-border overflow-x-auto pb-px">
          <TabsList className="bg-transparent h-12 w-full justify-start rounded-none p-0 flex-nowrap min-w-max">
            <TabsTrigger value="general" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none h-full px-6">
              <Store className="h-4 w-4 mr-2" /> Général
            </TabsTrigger>
            <TabsTrigger value="contact" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none h-full px-6">
              <Phone className="h-4 w-4 mr-2" /> Contact & Réseaux
            </TabsTrigger>
            <TabsTrigger value="shipping" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none h-full px-6">
              <Truck className="h-4 w-4 mr-2" /> Livraison & Paiement
            </TabsTrigger>
            <TabsTrigger value="services" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none h-full px-6">
              <Link2 className="h-4 w-4 mr-2" /> Liens & Services
            </TabsTrigger>
            <TabsTrigger value="seo" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none h-full px-6">
              <Search className="h-4 w-4 mr-2" /> SEO
            </TabsTrigger>
            <TabsTrigger value="security" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none h-full px-6">
              <Lock className="h-4 w-4 mr-2" /> Sécurité
            </TabsTrigger>
            <TabsTrigger value="noest" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none h-full px-6">
              <Truck className="h-4 w-4 mr-2" /> NOEST Express
            </TabsTrigger>
          </TabsList>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            <TabsContent value="general" className="mt-0 outline-none">
              <Card className="border-border shadow-sm">
                <CardHeader>
                  <CardTitle>Informations de la boutique</CardTitle>
                  <CardDescription>Informations de base affichées sur le site public.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="storeName"
                    render={({ field }) => (
                      <FormItem className="max-w-xl">
                        <FormLabel>Nom de la boutique *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="logoUrl"
                    render={({ field }) => (
                      <FormItem className="max-w-xl">
                        <FormLabel>Logo du magasin</FormLabel>
                        <FormControl>
                          <ImageUpload
                            folder="settings"
                            value={field.value}
                            onChange={(v) => field.onChange(v ?? '')}
                            spec={{ width: 400, height: 120, ratio: '10:3', formats: ['SVG', 'PNG', 'WebP'], note: 'Fond transparent recommandé' }}
                          />
                        </FormControl>
                        <FormDescription>Logo principal de la boutique.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="faviconUrl"
                    render={({ field }) => (
                      <FormItem className="max-w-xl">
                        <FormLabel>Favicon</FormLabel>
                        <FormControl>
                          <ImageUpload
                            folder="settings"
                            value={field.value}
                            onChange={(v) => field.onChange(v ?? '')}
                            spec={{ width: 64, height: 64, ratio: '1:1', formats: ['PNG', 'ICO'], note: 'Icône du navigateur, carré obligatoire' }}
                          />
                        </FormControl>
                        <FormDescription>Icône de l'onglet du navigateur (recommandé: 32x32px).</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="pt-4 flex justify-end max-w-xl">
                    <Button type="submit" disabled={updateSettings.isPending}>
                      {updateSettings.isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contact" className="mt-0 outline-none">
              <Card className="border-border shadow-sm">
                <CardHeader>
                  <CardTitle>Contact & Réseaux Sociaux</CardTitle>
                  <CardDescription>Comment vos clients peuvent vous contacter.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4 max-w-xl">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">Coordonnées</h3>
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2"><Mail className="h-4 w-4" /> Email de contact</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="contact@boukhatem-telecom.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2"><Phone className="h-4 w-4" /> Numéro de téléphone</FormLabel>
                          <FormControl>
                            <Input placeholder="+213..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Adresse physique</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Adresse du magasin..." className="resize-none" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="space-y-4 max-w-xl pt-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">Réseaux Sociaux</h3>
                    <FormField
                      control={form.control}
                      name="facebook"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2"><Share2 className="h-4 w-4" /> Page Facebook</FormLabel>
                          <FormControl>
                            <Input placeholder="https://facebook.com/..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="instagram"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2"><Share2 className="h-4 w-4" /> Compte Instagram</FormLabel>
                          <FormControl>
                            <Input placeholder="https://instagram.com/..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="whatsapp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2"><Share2 className="h-4 w-4" /> Numéro WhatsApp</FormLabel>
                          <FormControl>
                            <Input placeholder="+213..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="pt-4 flex justify-end max-w-xl">
                    <Button type="submit" disabled={updateSettings.isPending}>
                      {updateSettings.isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="shipping" className="mt-0 outline-none">
              <Card className="border-border shadow-sm">
                <CardHeader>
                  <CardTitle>Livraison & Paiement</CardTitle>
                  <CardDescription>Configurez les tarifs d'expédition et options bancaires.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4 max-w-xl">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-2 flex items-center gap-2"><Truck className="h-4 w-4" /> Expédition</h3>
                    <FormField
                      control={form.control}
                      name="shippingCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Frais de livraison standard (DA)</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="freeShippingThreshold"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Montant pour livraison gratuite (DA)</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" value={field.value || ''} onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)} placeholder="Laissez vide pour désactiver" />
                          </FormControl>
                          <FormDescription>Les commandes au-dessus de ce montant auront la livraison offerte.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4 max-w-xl pt-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-2 flex items-center gap-2"><CreditCard className="h-4 w-4" /> Paiement Bancaire (CCP / BaridiMob)</h3>
                    <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 space-y-4">
                      <p className="text-sm text-muted-foreground">Ces informations seront affichées aux clients lors de la sélection du paiement par virement.</p>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Nom du compte</label>
                        <Input defaultValue="BEN FLEN Foulen" />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Numéro de compte (RIP)</label>
                        <Input defaultValue="00799999000000000000" />
                      </div>
                      
                      <Button type="button" variant="outline" className="w-full">Enregistrer les infos bancaires</Button>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end max-w-xl">
                    <Button type="submit" disabled={updateSettings.isPending}>
                      {updateSettings.isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="services" className="mt-0 outline-none">
              <Card className="border-border shadow-sm">
                <CardHeader>
                  <CardTitle>Liens & Services</CardTitle>
                  <CardDescription>Gérez les services rapides affichés sur la page d'accueil.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  <FormField
                    control={form.control}
                    name="servicesSectionTitle"
                    render={({ field }) => (
                      <FormItem className="max-w-xl">
                        <FormLabel>Titre de la section</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-6 xl:grid-cols-2">
                    <Card className="border-primary/20 bg-primary/[0.03]">
                      <CardHeader>
                        <div className="flex items-center justify-between gap-4">
                          <CardTitle className="flex items-center gap-2 text-lg"><Smartphone className="h-5 w-5 text-primary" /> Application Flexy</CardTitle>
                          <FormField
                            control={form.control}
                            name="flexyEnabled"
                            render={({ field }) => (
                              <FormItem className="flex items-center gap-2 space-y-0">
                                <FormLabel>Active</FormLabel>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {(['flexyTitle', 'flexyDescription', 'flexyButtonText', 'flexyUrl'] as const).map((name) => (
                          <FormField
                            key={name}
                            control={form.control}
                            name={name}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{name === 'flexyTitle' ? 'Titre' : name === 'flexyDescription' ? 'Description' : name === 'flexyButtonText' ? 'Texte du bouton' : 'Flexy App URL'}</FormLabel>
                                <FormControl><Input type={name === 'flexyUrl' ? 'url' : 'text'} placeholder={name === 'flexyUrl' ? 'https://...' : undefined} {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ))}
                      </CardContent>
                    </Card>

                    <Card className="border-secondary/20 bg-secondary/[0.03]">
                      <CardHeader>
                        <div className="flex items-center justify-between gap-4">
                          <CardTitle className="flex items-center gap-2 text-lg"><CreditCard className="h-5 w-5 text-secondary" /> Paiement en ligne</CardTitle>
                          <FormField
                            control={form.control}
                            name="paymentEnabled"
                            render={({ field }) => (
                              <FormItem className="flex items-center gap-2 space-y-0">
                                <FormLabel>Actif</FormLabel>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {(['paymentTitle', 'paymentDescription', 'paymentButtonText', 'paymentUrl'] as const).map((name) => (
                          <FormField
                            key={name}
                            control={form.control}
                            name={name}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{name === 'paymentTitle' ? 'Titre' : name === 'paymentDescription' ? 'Description' : name === 'paymentButtonText' ? 'Texte du bouton' : 'Payment URL'}</FormLabel>
                                <FormControl><Input type={name === 'paymentUrl' ? 'url' : 'text'} placeholder={name === 'paymentUrl' ? 'https://...' : undefined} {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ))}
                      </CardContent>
                    </Card>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={updateSettings.isPending}>
                      {updateSettings.isPending ? 'Enregistrement...' : 'Enregistrer'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="seo" className="mt-0 outline-none">
              <Card className="border-border shadow-sm">
                <CardHeader>
                  <CardTitle>Référencement (SEO)</CardTitle>
                  <CardDescription>Optimisez la visibilité de votre boutique sur les moteurs de recherche.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 max-w-xl">
                  <FormField
                    control={form.control}
                    name="metaTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Titre du site (Meta Title)</FormLabel>
                        <FormControl>
                          <Input placeholder="BOUKHATEM TELECOM - Équipements de réparation" {...field} />
                        </FormControl>
                        <FormDescription>Le titre principal qui apparaît dans les résultats de recherche.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="metaDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description du site (Meta Description)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Le spécialiste des pièces détachées et équipements..." className="resize-none h-24" {...field} />
                        </FormControl>
                        <FormDescription>Un court résumé (150-160 caractères) affiché sous le titre dans les résultats.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="pt-4 flex justify-end">
                    <Button type="submit" disabled={updateSettings.isPending}>
                      {updateSettings.isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </form>
        </Form>
        
        <TabsContent value="security" className="mt-0 outline-none">
          <Card className="border-border shadow-sm">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-destructive flex items-center gap-2"><Lock className="h-5 w-5" /> Changer mon mot de passe</CardTitle>
              <CardDescription>Mettez à jour votre mot de passe administrateur actuel.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 max-w-xl">
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Mot de passe actuel</label>
                  <Input type="password" name="currentPassword" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nouveau mot de passe</label>
                  <Input type="password" name="newPassword" required minLength={6} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Confirmer le nouveau mot de passe</label>
                  <Input type="password" name="confirmPassword" required minLength={6} />
                </div>
                <div className="pt-4">
                  <Button type="submit" variant="destructive">Mettre à jour le mot de passe</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <NoestSettingsTab />
      </Tabs>
    </div>
  );
}

// ── NOEST settings tab — self-contained with its own state ────────────────────
function NoestSettingsTab() {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [defaultDeliveryType, setDefaultDeliveryType] = useState<'home_delivery' | 'stop_desk'>('home_delivery');
  const [defaultWeight, setDefaultWeight] = useState('1');
  const [defaultDescription, setDefaultDescription] = useState('Pièces détachées smartphones');

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/admin/noest/test-connection', { credentials: 'include' });
      const data = await res.json();
      setTestResult({ ok: data.ok ?? res.ok, message: data.message ?? (res.ok ? 'Connexion réussie' : 'Échec') });
    } catch (err: any) {
      setTestResult({ ok: false, message: err.message ?? 'Erreur réseau' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <TabsContent value="noest" className="mt-0 outline-none space-y-6">
      {/* Connection test */}
      <Card className="border-border shadow-sm">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" /> NOEST Express
          </CardTitle>
          <CardDescription>
            Configurez l'intégration avec le transporteur NOEST Express. Les clés API sont gérées via les variables d'environnement du serveur.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6 max-w-2xl">
          {/* Env vars info */}
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" /> Variables d'environnement requises
            </p>
            <div className="grid grid-cols-1 gap-1 font-mono text-xs text-muted-foreground">
              <span className="bg-background px-2 py-1 rounded border border-border">NOEST_API_BASE_URL</span>
              <span className="bg-background px-2 py-1 rounded border border-border">NOEST_API_TOKEN</span>
              <span className="bg-background px-2 py-1 rounded border border-border">NOEST_USER_GUID</span>
              <span className="bg-background px-2 py-1 rounded border border-border">NOEST_WEBHOOK_SECRET <span className="text-muted-foreground/60">(optionnel)</span></span>
            </div>
            <p className="text-xs text-muted-foreground">Ces variables doivent être définies dans les Secrets du serveur. Elles ne sont jamais exposées au frontend.</p>
          </div>

          {/* Test connection */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">Test de connexion</p>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={testConnection}
                disabled={testing}
                className="gap-2"
              >
                <Wifi className={testing ? 'h-4 w-4 animate-pulse' : 'h-4 w-4'} />
                {testing ? 'Test en cours…' : 'Tester la connexion NOEST'}
              </Button>
              {testResult && (
                <span className={`flex items-center gap-1.5 text-sm font-medium ${testResult.ok ? 'text-emerald-600' : 'text-red-600'}`}>
                  {testResult.ok
                    ? <><CheckCircle2 className="h-4 w-4" /> {testResult.message}</>
                    : <><XCircle className="h-4 w-4" /> {testResult.message}</>
                  }
                </span>
              )}
            </div>
          </div>

          {/* Default settings */}
          <div className="space-y-4 pt-4 border-t border-border/50">
            <p className="text-sm font-semibold text-foreground">Valeurs par défaut pour les expéditions</p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Type de livraison par défaut</label>
              <select
                value={defaultDeliveryType}
                onChange={e => setDefaultDeliveryType(e.target.value as any)}
                className="w-full max-w-sm h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="home_delivery">Livraison à domicile</option>
                <option value="stop_desk">Stop Desk</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Poids par défaut (kg)</label>
              <Input
                type="number"
                min="0.1"
                step="0.1"
                value={defaultWeight}
                onChange={e => setDefaultWeight(e.target.value)}
                className="max-w-xs"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description du colis par défaut</label>
              <Input
                value={defaultDescription}
                onChange={e => setDefaultDescription(e.target.value)}
                placeholder="ex: Pièces détachées smartphones"
                className="max-w-lg"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Ces valeurs sont utilisées comme suggestions lors de l'envoi d'une commande à NOEST. Elles peuvent être modifiées à chaque envoi.
            </p>
          </div>

          {/* Link to NOEST page */}
          <div className="pt-4 border-t border-border/50">
            <a href="/admin/noest" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
              <Package className="h-4 w-4" />
              Voir toutes les livraisons NOEST →
            </a>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
