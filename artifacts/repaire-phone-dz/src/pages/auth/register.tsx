import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Lock, Mail, EyeOff, Eye, ArrowRight, User, Phone } from 'lucide-react';
import { useRegister } from '@workspace/api-client-react';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const { login: authLogin } = useAuth();
  const [, setLocation] = useLocation();
  const registerMutation = useRegister();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await registerMutation.mutateAsync({ 
        data: { name, email, password, phone: phone || undefined } 
      });
      authLogin(res.token);
      toast.success('Compte créé avec succès !');
      setLocation('/profile');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la création du compte');
    }
  };

  return (
    <div className="min-h-[calc(100vh-160px)] flex bg-background">
      {/* Split Screen - Brand side (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-navy text-white flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://placehold.co/1000x1000/1e3a5f/1e3a5f')] opacity-50 mix-blend-overlay"></div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-secondary rounded-full blur-[120px] opacity-20 translate-x-1/3 -translate-y-1/3"></div>
        
        <div className="relative z-10">
          <Link href="/">
            <span className="font-extrabold text-3xl tracking-tight text-primary cursor-pointer inline-block mb-12">
              Repair<span className="text-secondary">DZ</span>
            </span>
          </Link>
          <h2 className="text-4xl lg:text-5xl font-extrabold leading-tight mb-6">
            Rejoignez la communauté des réparateurs.
          </h2>
          <ul className="space-y-4 text-white/90 font-medium">
            <li className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs shrink-0">✓</div>
              Suivi détaillé de toutes vos commandes
            </li>
            <li className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs shrink-0">✓</div>
              Paiement à la livraison simplifié
            </li>
            <li className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs shrink-0">✓</div>
              Accès aux réductions exclusives
            </li>
          </ul>
        </div>
      </div>

      {/* Form side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-20 relative">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-10 text-center">
            <Link href="/">
              <span className="font-extrabold text-3xl tracking-tight text-primary cursor-pointer inline-block">
                Repair<span className="text-secondary">DZ</span>
              </span>
            </Link>
          </div>
          
          <div className="mb-10">
            <h1 className="text-3xl font-extrabold text-foreground mb-2">Créer un compte</h1>
            <p className="text-muted-foreground">Renseignez vos informations pour commencer.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Nom et Prénom <span className="text-destructive">*</span></Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <Input
                  id="name"
                  type="text"
                  placeholder="Votre nom complet"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="pl-10 h-12 bg-muted/30"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Adresse Email <span className="text-destructive">*</span></Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <Input
                  id="email"
                  type="email"
                  placeholder="nom@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10 h-12 bg-muted/30"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Numéro de téléphone</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                </div>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="05xx xx xx xx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10 h-12 bg-muted/30"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe <span className="text-destructive">*</span></Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pl-10 pr-10 h-12 bg-muted/30"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Doit contenir au moins 6 caractères.</p>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-base font-bold shadow-md bg-primary hover:bg-primary/90 mt-2"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? 'Création...' : 'Créer mon compte'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          <div className="mt-8 text-center text-sm">
            <span className="text-muted-foreground">Vous avez déjà un compte ? </span>
            <Link href="/auth/login" className="font-bold text-primary hover:text-primary/80 transition-colors">
              Se connecter
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}