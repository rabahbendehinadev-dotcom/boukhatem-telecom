import { useRef, useState, useCallback } from 'react';
import { Upload, X, CheckCircle2, AlertCircle, Loader2, ImageIcon, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export interface ImageSpec {
  width: number;
  height: number;
  ratio?: string;
  formats?: string[];
  note?: string;
}

interface ImageUploadProps {
  value?: string;
  onChange: (objectPath: string | undefined) => void;
  label?: string;
  accept?: string;
  maxSizeMb?: number;
  spec?: ImageSpec;
  className?: string;
  /** Destination subfolder on the server: products | categories | brands | banners | users | settings | general */
  folder?: string;
}

function getImageSrc(value?: string): string | undefined {
  if (!value) return undefined;
  // Legacy GCS object paths (old uploads) — served via the storage proxy
  if (value.startsWith('/objects/')) return '/api/storage' + value;
  // Local uploads served directly by Express static
  if (value.startsWith('/uploads/')) return value;
  if (value.startsWith('http')) return value;
  return value;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export function ImageUpload({
  value,
  onChange,
  label,
  accept = 'image/jpeg,image/jpg,image/png,image/webp',
  maxSizeMb = 5,
  spec,
  className,
  folder = 'general',
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [currentFileSize, setCurrentFileSize] = useState<number | null>(null);

  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Formats acceptés uniquement : JPG, PNG, WEBP';
    }
    if (file.size > maxSizeMb * 1024 * 1024) {
      return `Le fichier dépasse la taille maximale de ${maxSizeMb} MB`;
    }
    return null;
  };

  const uploadFile = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setUploadState('error');
      return;
    }

    setError(null);
    setUploadState('uploading');
    setProgress(10);
    setCurrentFileName(file.name);
    setCurrentFileSize(file.size);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      setProgress(40);
      const res = await fetch('/api/admin/uploads', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error || 'Erreur lors du téléchargement');
      }

      const { url } = await res.json() as { url: string };
      setProgress(100);
      setUploadState('success');
      onChange(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors du téléchargement');
      setUploadState('error');
    }
  }, [maxSizeMb, onChange, folder]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    // Reset input so same file can be re-selected
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleClear = () => {
    onChange(undefined);
    setUploadState('idle');
    setProgress(0);
    setError(null);
    setCurrentFileName(null);
    setCurrentFileSize(null);
  };

  const imageSrc = getImageSrc(value);

  return (
    <div className={cn('space-y-2', className)}>
      {label && <p className="text-sm font-medium">{label}</p>}

      {/* Preview or Drop Zone */}
      {imageSrc ? (
        <div className="relative group rounded-lg border border-border overflow-hidden bg-muted/20">
          <img
            src={imageSrc}
            alt="Aperçu"
            className="w-full h-48 object-contain bg-muted/10"
          />
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => inputRef.current?.click()}
              className="shadow-md"
            >
              <Upload className="mr-2 h-3.5 w-3.5" />
              Changer l'image
            </Button>
          </div>
          {/* Clear button */}
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          {/* Success indicator */}
          {uploadState === 'success' && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-emerald-500/90 text-white text-xs px-2 py-1 rounded-full">
              <CheckCircle2 className="h-3 w-3" />
              Image téléchargée avec succès
            </div>
          )}
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => uploadState !== 'uploading' && inputRef.current?.click()}
          className={cn(
            'relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-muted/30',
            uploadState === 'uploading' && 'cursor-not-allowed opacity-80',
            uploadState === 'error' && 'border-destructive/50 bg-destructive/5'
          )}
        >
          {uploadState === 'uploading' ? (
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          ) : uploadState === 'error' ? (
            <AlertCircle className="h-8 w-8 text-destructive" />
          ) : (
            <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
          )}

          <div className="space-y-1">
            {uploadState === 'uploading' ? (
              <p className="text-sm text-muted-foreground">Téléchargement en cours...</p>
            ) : uploadState === 'error' ? (
              <p className="text-sm text-destructive font-medium">{error}</p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Glissez une image ici ou{' '}
                  <span className="text-primary font-medium underline underline-offset-2">
                    Choisir une image
                  </span>
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Formats acceptés : JPG, PNG, WEBP · Max {maxSizeMb} MB
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploadState === 'uploading' && (
        <div className="space-y-1">
          <Progress value={progress} className="h-1.5" />
          <p className="text-xs text-muted-foreground text-right">{progress}%</p>
        </div>
      )}

      {/* File info below preview */}
      {imageSrc && (currentFileName || currentFileSize) && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {currentFileName && <span className="truncate max-w-[200px]">{currentFileName}</span>}
          {currentFileSize && <span>({formatFileSize(currentFileSize)})</span>}
        </div>
      )}

      {/* Error outside drop zone (when image exists) */}
      {uploadState === 'error' && imageSrc && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> {error}
        </p>
      )}

      {/* If no image and not uploading, show button */}
      {!imageSrc && uploadState !== 'uploading' && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          className="w-full"
        >
          <Upload className="mr-2 h-3.5 w-3.5" />
          Choisir une image
        </Button>
      )}

      {/* Spec hint */}
      {spec && (
        <div className="flex items-start gap-2 rounded-md bg-muted/40 border border-border px-3 py-2">
          <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground space-y-0.5">
            <span className="font-medium text-foreground/80">
              🖼 {spec.width} × {spec.height} px
            </span>
            {spec.ratio && (
              <span className="mx-1.5 text-border">·</span>
            )}
            {spec.ratio && <span>{spec.ratio}</span>}
            {spec.formats && spec.formats.length > 0 && (
              <>
                <span className="mx-1.5 text-border">·</span>
                <span>{spec.formats.join(' / ')}</span>
              </>
            )}
            {spec.note && (
              <p className="mt-0.5 text-muted-foreground/70">{spec.note}</p>
            )}
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
