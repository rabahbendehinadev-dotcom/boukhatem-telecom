import { Link } from 'wouter';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center text-center px-4">
      <div className="text-[150px] font-extrabold text-primary/10 leading-none select-none tracking-tighter">
        404
      </div>
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-4 mb-4">
        Page introuvable
      </h1>
      <p className="text-muted-foreground text-lg mb-8 max-w-md">
        L'adresse demandée n'existe pas ou la page a été déplacée.
      </p>
      <div className="flex gap-4">
        <Button variant="outline" onClick={() => window.history.back()}>
          Retour en arrière
        </Button>
        <Button asChild className="bg-primary px-8">
          <Link href="/">Accueil</Link>
        </Button>
      </div>
    </div>
  );
}