import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Search, Edit, Trash2, Shield, User, Key, Mail, CheckCircle2, XCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from '@/components/ui/switch';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAdminAuth } from '@/hooks/use-admin-auth';

const ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Administrateur' },
  { value: 'stock_manager', label: 'Gestionnaire Stock' },
  { value: 'order_manager', label: 'Gestionnaire Commandes' },
  { value: 'employee', label: 'Employé' },
];

const userSchema = z.object({
  fullName: z.string().min(2, "Le nom est requis"),
  username: z.string().min(3, "Le nom d'utilisateur est requis"),
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères").optional().or(z.literal('')),
  role: z.enum(['super_admin', 'admin', 'stock_manager', 'order_manager', 'employee']),
  isActive: z.boolean().default(true),
});

type UserFormValues = z.infer<typeof userSchema>;

export default function AdminUsers() {
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  
  const queryClient = useQueryClient();
  const { adminUser: currentUser } = useAdminAuth();

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const res = await fetch('/api/admin/admin-users', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    }
  });

  const createUser = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/admin/admin-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('Utilisateur créé avec succès');
      setIsDialogOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erreur lors de la création');
    }
  });

  const updateUser = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const res = await fetch(`/api/admin/admin-users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('Utilisateur mis à jour avec succès');
      setIsDialogOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erreur lors de la mise à jour');
    }
  });

  const deleteUser = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/admin-users/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('Utilisateur supprimé avec succès');
      setDeleteConfirmId(null);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erreur lors de la suppression');
      setDeleteConfirmId(null);
    }
  });

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      fullName: '',
      username: '',
      email: '',
      password: '',
      role: 'employee',
      isActive: true,
    },
  });

  const filteredUsers = usersData?.users?.filter((u: any) => 
    u.fullName.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  const onSubmit = (data: UserFormValues) => {
    if (editingUser) {
      const payload = { ...data };
      if (!payload.password) delete payload.password; // Don't send empty password
      updateUser.mutate({ id: editingUser.id, data: payload });
    } else {
      if (!data.password) {
        form.setError('password', { message: 'Le mot de passe est requis pour un nouvel utilisateur' });
        return;
      }
      createUser.mutate(data);
    }
  };

  const openCreate = () => {
    setEditingUser(null);
    form.reset({
      fullName: '',
      username: '',
      email: '',
      password: '',
      role: 'employee',
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const openEdit = (user: any) => {
    setEditingUser(user);
    form.reset({
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      password: '', // Leave empty unless changing
      role: user.role,
      isActive: user.isActive,
    });
    setIsDialogOpen(true);
  };

  const toggleStatus = (user: any) => {
    if (user.id === currentUser?.id) {
      toast.error('Vous ne pouvez pas désactiver votre propre compte');
      return;
    }
    updateUser.mutate({ id: user.id, data: { isActive: !user.isActive } });
  };

  const handleDelete = () => {
    if (deleteConfirmId) {
      deleteUser.mutate(deleteConfirmId);
    }
  };

  const getRoleLabel = (role: string) => {
    return ROLES.find(r => r.value === role)?.label || role;
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-500/10 text-purple-600 border-purple-200';
      case 'admin': return 'bg-primary/10 text-primary border-primary/20';
      case 'stock_manager': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'order_manager': return 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  // Only super_admin can access this page properly
  if (currentUser?.role !== 'super_admin' && currentUser?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
        <Shield className="h-16 w-16 text-destructive/50 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Accès restreint</h2>
        <p className="text-muted-foreground max-w-md">
          Vous n'avez pas les permissions nécessaires pour gérer les administrateurs. 
          Veuillez contacter le Super Administrateur.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Équipe Admin</h2>
          <p className="text-muted-foreground text-sm">Gérez les accès et rôles de votre équipe.</p>
        </div>
        <Button onClick={openCreate} className="shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> Ajouter un membre
        </Button>
      </div>

      <Card className="border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher par nom, email..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background shadow-sm border-border h-9"
            />
          </div>
          <div className="text-sm text-muted-foreground font-medium whitespace-nowrap">
            {filteredUsers?.length || 0} membres
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/40 border-b border-border">
              <tr>
                <th className="px-4 py-3 font-semibold">Utilisateur</th>
                <th className="px-4 py-3 font-semibold">Rôle</th>
                <th className="px-4 py-3 font-semibold text-center">Statut</th>
                <th className="px-4 py-3 font-semibold">Dernière connexion</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {isLoading ? (
                Array(4).fill(0).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-24" /></div>
                      </div>
                    </td>
                    <td className="px-4 py-4"><Skeleton className="h-6 w-24 rounded-full" /></td>
                    <td className="px-4 py-4 text-center"><Skeleton className="h-6 w-16 mx-auto rounded-full" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-4 py-4 text-right"><Skeleton className="h-8 w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredUsers?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Shield className="h-12 w-12 mb-4 text-muted-foreground/30" />
                      <p className="text-lg font-medium text-foreground">Aucun membre trouvé</p>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers?.map((user: any) => (
                <tr key={user.id} className={`hover:bg-muted/30 transition-colors ${!user.isActive ? 'bg-muted/10 opacity-70' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold uppercase shrink-0 border border-primary/20">
                        {user.fullName.substring(0, 2)}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground flex items-center gap-2">
                          {user.fullName} 
                          {user.id === currentUser?.id && <Badge variant="outline" className="text-[9px] py-0 px-1.5 h-4 bg-muted text-muted-foreground border-transparent">Moi</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
                          <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {user.email}</span>
                          <span className="flex items-center gap-1"><User className="h-3 w-3" /> {user.username}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`font-semibold ${getRoleBadgeColor(user.role)}`}>
                      {getRoleLabel(user.role)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button 
                      onClick={() => toggleStatus(user)} 
                      disabled={user.id === currentUser?.id}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        user.id === currentUser?.id ? 'cursor-not-allowed opacity-80 ' : 'cursor-pointer hover:opacity-80 '
                      } ${user.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-destructive/10 text-destructive'}`}
                    >
                      {user.isActive ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                      {user.isActive ? 'Actif' : 'Inactif'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {user.lastLogin ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-foreground">{format(new Date(user.lastLogin), 'dd MMM yyyy, HH:mm', { locale: fr })}</span>
                        <span>IP: {user.lastLoginIp || '-'}</span>
                      </div>
                    ) : (
                      <span className="italic">Jamais connecté</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" className="h-8 shadow-none text-xs" onClick={() => openEdit(user)}>
                        <Edit className="h-3.5 w-3.5 mr-1.5" /> Modifier
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" 
                        onClick={() => setDeleteConfirmId(user.id)}
                        disabled={user.id === currentUser?.id || user.role === 'super_admin'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
              <DialogTitle className="text-xl">{editingUser ? 'Modifier le membre' : 'Ajouter un membre'}</DialogTitle>
              <DialogDescription>Créez un compte pour un membre de l'équipe et définissez ses droits d'accès.</DialogDescription>
            </DialogHeader>
          </div>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
              <div className="p-6 space-y-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom complet *</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom d'utilisateur *</FormLabel>
                        <FormControl>
                          <Input placeholder="johndoe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mot de passe {editingUser ? '(Laisser vide pour ne pas modifier)' : '*'}</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rôle d'accès *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={editingUser && editingUser.role === 'super_admin'}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ROLES.filter(r => currentUser?.role === 'super_admin' || r.value !== 'super_admin').map(role => (
                            <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {!editingUser && (
                  <div className="bg-primary/5 p-3 rounded-md border border-primary/20 text-xs text-muted-foreground flex gap-2 items-start mt-2">
                    <Key className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <p>Le nouvel utilisateur devra changer son mot de passe lors de sa première connexion.</p>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-3 shadow-sm bg-card mt-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm font-medium">Compte Actif</FormLabel>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} disabled={editingUser && editingUser.id === currentUser?.id} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="px-6 py-4 border-t border-border bg-background flex justify-end gap-3 shrink-0">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={createUser.isPending || updateUser.isPending}>
                  {(createUser.isPending || updateUser.isPending) ? 'Enregistrement...' : 'Enregistrer'}
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
              Êtes-vous sûr de vouloir supprimer cet utilisateur ? L'accès à l'administration lui sera immédiatement révoqué.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteUser.isPending ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
