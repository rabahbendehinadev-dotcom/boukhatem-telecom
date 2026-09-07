import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Lock, Mail, EyeOff, Eye, ArrowRight, ShieldCheck } from 'lucide-react';
import { useLogin } from '@workspace/api-client-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const { login: authLogin } = useAuth();
  const [, setLocation] = useLocation();
  const loginMutation = useLogin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await loginMutation.mutateAsync({ data: { email, password } });
      authLogin(res.token);
      toast.success('Connexion réussie');
      setLocation('/profile');
    } catch (err: any) {
      toast.error(err.message || 'Email ou mot de passe incorrect');
    }
  };

  return (
    <div className="min-h-[calc(100vh-160px)] flex bg-background">
      {/* Split Screen - Brand side (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-navy text-white flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://placehold.co/1000x1000/1e3a5f/1e3a5f')] opacity-50 mix-blend-overlay"></div>
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary rounded-full blur-[100px] opacity-50"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-secondary rounded-full blur-[100px] opacity-50"></div>
        
        <div className="relative z-10">
          <Link href="/">
            <img
              src={`${import.meta.env.BASE_URL}boukhatem-telecom-logo.svg`}
              alt="BOUKHATEM TELECOM"
              className="h-14 w-auto max-w-[240px] rounded-lg bg-white px-3 py-2 object-contain mb-12"
            />
          </Link>
          <h2 className="text-4xl lg:text-5xl font-extrabold leading-tight mb-6">
            L'espace réservé aux professionnels.
          </h2>
          <p className="text-lg text-white/80 max-w-md">
            Accédez à votre historique de commandes, sauvegardez vos favoris et gérez vos adresses de livraison en un seul endroit.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-6 mt-20">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 bg-white/10 rounded-full flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <h4 className="font-bold mb-1">Achats Sécurisés</h4>
              <p className="text-sm text-white/60">Paiement à la livraison disponible partout en Algérie.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-20 relative">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-10 text-center">
            <Link href="/">
              <img
                src={`${import.meta.env.BASE_URL}boukhatem-telecom-logo.svg`}
                alt="BOUKHATEM TELECOM"
                className="mx-auto h-14 w-auto max-w-[240px] object-contain"
              />
            </Link>
          </div>
          
          <div className="mb-10">
            <h1 className="text-3xl font-extrabold text-foreground mb-2">Bon retour !</h1>
            <p className="text-muted-foreground">Connectez-vous à votre compte client pour continuer.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Adresse Email</Label>
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mot de passe</Label>
                <Link href="#" className="text-sm font-semibold text-primary hover:text-primary/80">
                  Mot de passe oublié ?
                </Link>
              </div>
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
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-base font-bold shadow-md bg-primary hover:bg-primary/90"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? 'Connexion...' : 'Se connecter'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          <div className="mt-8 text-center text-sm">
            <span className="text-muted-foreground">Nouveau sur BOUKHATEM TELECOM ? </span>
            <Link href="/auth/register" className="font-bold text-primary hover:text-primary/80 transition-colors">
              Créer un compte
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}