import { useAuth } from '@/hooks/use-auth';
import { useUpdateMe } from '@workspace/api-client-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { UserCircle, Mail, Phone, LogOut, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const profileSchema = z.object({
  name: z.string().min(2, "Nom complet requis"),
  phone: z.string().optional(),
  email: z.string().email("Email invalide").optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function Profile() {
  const { user, isLoading, logout } = useAuth();
  const updateMe = useUpdateMe();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      phone: user?.phone || '',
      email: user?.email || '',
    },
  });

  if (isLoading) return <div className="p-20 text-center">Chargement...</div>;
  if (!user) return <div className="p-20 text-center">Non autorisé</div>;

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      await updateMe.mutateAsync({ data });
      toast.success('Profil mis à jour avec succès');
    } catch (err: any) {
      toast.error('Erreur lors de la mise à jour du profil');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
      <div className="flex flex-col md:flex-row items-center gap-6 mb-10 pb-8 border-b border-border">
        <div className="h-24 w-24 bg-primary/10 rounded-full flex items-center justify-center border-4 border-background shadow-md">
          <span className="text-3xl font-extrabold text-primary">
            {user.name.substring(0, 2).toUpperCase()}
          </span>
        </div>
        <div className="text-center md:text-left">
          <h1 className="text-3xl font-extrabold tracking-tight mb-1">{user.name}</h1>
          <p className="text-muted-foreground">Client depuis le {format(new Date(user.createdAt), 'dd MMMM yyyy', { locale: fr })}</p>
        </div>
        <div className="md:ml-auto">
          <Button variant="outline" className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" /> Déconnexion
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <Card className="border-border shadow-sm bg-card">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-sm text-foreground/80">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{user.email}</span>
              </div>
              {user.phone && (
                <div className="flex items-center gap-3 text-sm text-foreground/80">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{user.phone}</span>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="border-border shadow-sm bg-primary/5 border-primary/20">
            <CardContent className="p-6 text-center">
              <h3 className="font-bold text-primary mb-2">Statut Client</h3>
              <p className="text-sm text-muted-foreground mb-4">Vous êtes un client professionnel.</p>
              <div className="grid grid-cols-2 gap-4 divide-x divide-border border-t border-border pt-4">
                <div>
                  <div className="text-2xl font-extrabold text-foreground">{user.totalOrders || 0}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Commandes</div>
                </div>
                <div>
                  <div className="text-xl font-extrabold text-foreground truncate px-2">{(user.totalSpent || 0).toLocaleString('fr-DZ')}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">DA dépensés</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card className="border-border shadow-sm">
            <CardHeader className="bg-muted/30 border-b border-border pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="h-5 w-5 text-primary" /> Paramètres du profil
              </CardTitle>
              <CardDescription>Mettez à jour vos informations personnelles.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom complet</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-muted/30" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email (Lecture seule)</FormLabel>
                          <FormControl>
                            <Input {...field} disabled className="bg-muted/50 text-muted-foreground" />
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
                          <FormLabel>Téléphone</FormLabel>
                          <FormControl>
                            <Input {...field} className="bg-muted/30" placeholder="Ex: 0555 123 456" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={updateMe.isPending} className="bg-primary px-8 font-bold">
                      {updateMe.isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}