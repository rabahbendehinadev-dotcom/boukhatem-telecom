import { useListCategories } from '@workspace/api-client-react';
import { getImageSrc } from '@/lib/image-utils';
import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Wrench, ChevronRight } from 'lucide-react';

export default function Categories() {
  const { data: categories, isLoading } = useListCategories();

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="max-w-3xl mb-10">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-4">
          Toutes les Catégories
        </h1>
        <p className="text-lg text-muted-foreground">
          Parcourez notre catalogue complet de pièces détachées, d'outils professionnels et de consommables pour la réparation de téléphones.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {isLoading ? (
          Array(12).fill(0).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3] rounded-xl" />
          ))
        ) : (
          categories?.map((cat) => (
            <Link key={cat.id} href={`/products?categoryId=${cat.id}`}>
              <Card className="group h-full cursor-pointer overflow-hidden border-border hover:border-primary/50 hover:shadow-lg transition-all duration-300 bg-card rounded-xl">
                <CardContent className="p-6 flex flex-col items-center text-center h-full relative z-10">
                  <div className="w-20 h-20 mb-5 rounded-full bg-muted/50 flex items-center justify-center group-hover:bg-primary/5 transition-colors duration-300">
                    {cat.imageUrl ? (
                      <img src={getImageSrc(cat.imageUrl)} alt={cat.name} className="w-12 h-12 object-contain group-hover:scale-110 transition-transform duration-300" />
                    ) : (
                      <Wrench className="h-8 w-8 text-muted-foreground/50 group-hover:text-primary/50 transition-colors" />
                    )}
                  </div>
                  <h3 className="font-bold text-base md:text-lg text-foreground mb-2 group-hover:text-primary transition-colors">
                    {cat.name}
                  </h3>
                  {cat.description && (
                    <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 mb-4">
                      {cat.description}
                    </p>
                  )}
                  <div className="mt-auto pt-2 flex items-center text-sm font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                    Voir les produits <ChevronRight className="h-4 w-4 ml-1" />
                  </div>
                </CardContent>
                {/* Decorative background element */}
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors duration-500 z-0"></div>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}