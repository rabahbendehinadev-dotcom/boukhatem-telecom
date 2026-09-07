import { useRef, useState, useCallback } from 'react';
import { Plus, X, Star, GripVertical, ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface MultiImageUploadProps {
  value: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  spec?: { width: number; height: number; ratio?: string; formats?: string[]; note?: string };
  /** Destination subfolder on the server: products | categories | brands | banners | users | settings | general */
  folder?: string;
}

function getImageSrc(value?: string): string | undefined {
  if (!value) return undefined;
  // Legacy GCS object paths (old uploads)
  if (value.startsWith('/objects/')) return '/api/storage' + value;
  // Local uploads served directly by Express static
  if (value.startsWith('/uploads/')) return value;
  if (value.startsWith('http')) return value;
  return value;
}

interface ImageItem {
  objectPath: string;
  altText: string;
}

interface LoadingPlaceholder {
  id: string;
  loading: true;
}

type GridItem = ImageItem | LoadingPlaceholder;

function isLoading(item: GridItem): item is LoadingPlaceholder {
  return (item as LoadingPlaceholder).loading === true;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export function MultiImageUpload({
  value,
  onChange,
  maxImages = 10,
  spec,
  folder = 'general',
}: MultiImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [altTexts, setAltTexts] = useState<Record<string, string>>({});
  const [loadingIds, setLoadingIds] = useState<string[]>([]);
  const [dragSourceIndex, setDragSourceIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    if (!ALLOWED_TYPES.includes(file.type)) return null;

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const res = await fetch('/api/admin/uploads', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!res.ok) return null;

      const { url } = await res.json() as { url: string };
      return url;
    } catch {
      return null;
    }
  }, [folder]);

  const handleFilesSelected = async (files: FileList) => {
    const remaining = maxImages - value.length;
    if (remaining <= 0) return;

    const toUpload = Array.from(files).slice(0, remaining);
    const newLoadingIds = toUpload.map(() => `loading-${Date.now()}-${Math.random()}`);
    setLoadingIds(prev => [...prev, ...newLoadingIds]);

    const uploadedPaths: string[] = [];

    for (let i = 0; i < toUpload.length; i++) {
      const file = toUpload[i];
      const loadingId = newLoadingIds[i];

      const objectPath = await uploadFile(file);

      // Remove this loading id
      setLoadingIds(prev => prev.filter(id => id !== loadingId));

      if (objectPath) {
        uploadedPaths.push(objectPath);
      }
    }

    if (uploadedPaths.length > 0) {
      onChange([...value, ...uploadedPaths]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesSelected(e.target.files);
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    const newImages = [...value];
    newImages.splice(index, 1);
    onChange(newImages);
  };

  const setAsPrimary = (index: number) => {
    if (index === 0) return;
    const newImages = [...value];
    const [item] = newImages.splice(index, 1);
    newImages.unshift(item);
    onChange(newImages);
  };

  const handleDragStart = (index: number) => {
    setDragSourceIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (dragSourceIndex === null || dragSourceIndex === targetIndex) {
      setDragSourceIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newImages = [...value];
    const [moved] = newImages.splice(dragSourceIndex, 1);
    newImages.splice(targetIndex, 0, moved);
    onChange(newImages);
    setDragSourceIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragSourceIndex(null);
    setDragOverIndex(null);
  };

  const updateAltText = (objectPath: string, text: string) => {
    setAltTexts(prev => ({ ...prev, [objectPath]: text }));
  };

  const canAdd = value.length + loadingIds.length < maxImages;

  return (
    <div className="space-y-3">
      {/* Count indicator */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {value.length} / {maxImages} images
        </span>
        {canAdd && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            className="h-8 text-xs"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Ajouter des images
          </Button>
        )}
      </div>

      {/* Grid */}
      {(value.length > 0 || loadingIds.length > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {value.map((objectPath, index) => {
            const src = getImageSrc(objectPath);
            const isDragging = dragSourceIndex === index;
            const isOver = dragOverIndex === index && dragSourceIndex !== index;

            return (
              <div
                key={objectPath}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={cn(
                  'relative rounded-lg border border-border overflow-hidden bg-muted/20 group cursor-grab active:cursor-grabbing transition-all',
                  isDragging && 'opacity-40 ring-2 ring-primary',
                  isOver && 'ring-2 ring-primary/60'
                )}
              >
                {/* Drag handle */}
                <div className="absolute top-1 left-1 z-10 h-6 w-6 flex items-center justify-center rounded bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="h-3.5 w-3.5" />
                </div>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 z-10 h-6 w-6 flex items-center justify-center rounded bg-black/50 hover:bg-destructive text-white transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>

                {/* Star / set primary */}
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => setAsPrimary(index)}
                    title="Définir comme image principale"
                    className="absolute top-1 left-7 z-10 h-6 w-6 flex items-center justify-center rounded bg-black/40 hover:bg-yellow-500 text-white transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Star className="h-3 w-3" />
                  </button>
                )}

                {/* Primary badge */}
                {index === 0 && (
                  <div className="absolute bottom-1 left-1 z-10">
                    <Badge className="text-[10px] py-0 h-4 px-1.5 bg-yellow-500 text-black border-none">
                      Principale
                    </Badge>
                  </div>
                )}

                {/* Image */}
                <div className="aspect-square">
                  {src ? (
                    <img
                      src={src}
                      alt={altTexts[objectPath] || `Image ${index + 1}`}
                      className="w-full h-full object-contain bg-white"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                  )}
                </div>

                {/* Alt text input */}
                <div className="p-1.5 border-t border-border bg-background/80">
                  <input
                    type="text"
                    value={altTexts[objectPath] || ''}
                    onChange={(e) => updateAltText(objectPath, e.target.value)}
                    placeholder="Texte alt..."
                    className="w-full text-xs bg-transparent outline-none placeholder:text-muted-foreground/50 text-foreground"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            );
          })}

          {/* Loading placeholders */}
          {loadingIds.map((id) => (
            <div
              key={id}
              className="relative rounded-lg border border-dashed border-border overflow-hidden bg-muted/30"
            >
              <div className="aspect-square flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              </div>
              <div className="p-1.5 border-t border-border bg-background/80 h-7" />
            </div>
          ))}

          {/* Add more button (as a grid cell) */}
          {canAdd && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="relative rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-1 aspect-square cursor-pointer"
            >
              <Plus className="h-6 w-6 text-muted-foreground/60" />
              <span className="text-xs text-muted-foreground/60">Ajouter</span>
            </button>
          )}
        </div>
      )}

      {/* Empty state */}
      {value.length === 0 && loadingIds.length === 0 && (
        <div
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/30 p-8 text-center cursor-pointer transition-colors"
        >
          <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Cliquez pour{' '}
              <span className="text-primary font-medium underline underline-offset-2">
                ajouter des images
              </span>
            </p>
            <p className="text-xs text-muted-foreground/60">
              Formats acceptés : JPG, PNG, WEBP · Max {maxImages} images
            </p>
          </div>
        </div>
      )}

      {/* Spec hint */}
      {spec && (
        <div className="flex items-start gap-2 rounded-md bg-muted/40 border border-border px-3 py-2">
          <span className="text-muted-foreground shrink-0 mt-0.5 text-xs">ℹ</span>
          <div className="text-xs text-muted-foreground space-y-0.5">
            <span className="font-medium text-foreground/80">
              🖼 {spec.width} × {spec.height} px
            </span>
            {spec.ratio && <span className="mx-1.5 text-border">·</span>}
            {spec.ratio && <span>{spec.ratio}</span>}
            {spec.formats && spec.formats.length > 0 && (
              <><span className="mx-1.5 text-border">·</span><span>{spec.formats.join(' / ')}</span></>
            )}
            {spec.note && <p className="mt-0.5 text-muted-foreground/70">{spec.note}</p>}
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  );
}
