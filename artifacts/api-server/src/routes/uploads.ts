import { Router, type IRouter, type Request, type Response } from 'express';
import { requireAdminSession } from '../lib/admin-auth';
import { randomUUID } from 'node:crypto';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';

const router: IRouter = Router();

// Memory storage — validate buffer before writing to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB hard limit
  fileFilter(_req, file, cb) {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      cb(new Error('Formats acceptés : JPG, PNG, WEBP'));
      return;
    }
    cb(null, true);
  },
});

const ALLOWED_FOLDERS = new Set([
  'products',
  'categories',
  'brands',
  'banners',
  'users',
  'settings',
  'general',
]);

/** Detect real MIME type from magic bytes — prevents extension spoofing. */
function detectMime(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)
    return 'image/jpeg';
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  )
    return 'image/png';
  // WEBP: RIFF????WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  )
    return 'image/webp';
  return null;
}

function extForMime(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    default:
      return 'jpg';
  }
}

/**
 * POST /admin/uploads
 *
 * Upload an image file to local persistent storage.
 * Admin-only. Body: multipart/form-data
 *   - file   : image file (required)
 *   - folder : destination subfolder (optional, default = 'general')
 *
 * Returns: { success: true, url: "/uploads/<folder>/<uuid>.<ext>" }
 */
router.post(
  '/admin/uploads',
  requireAdminSession,
  upload.single('file'),
  async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'Aucun fichier fourni' });
      return;
    }

    // Real MIME type check via magic bytes (prevents MIME spoofing)
    const detectedMime = detectMime(file.buffer);
    if (!detectedMime) {
      res
        .status(400)
        .json({ error: 'Type de fichier non reconnu. Formats acceptés : JPG, PNG, WEBP' });
      return;
    }

    // Sanitise folder — strip anything that isn't [a-z0-9_-]
    const rawFolder = typeof req.body.folder === 'string' ? req.body.folder : 'general';
    const folder = rawFolder.replace(/[^a-z0-9_-]/g, '');
    if (!ALLOWED_FOLDERS.has(folder)) {
      res.status(400).json({ error: 'Dossier non autorisé' });
      return;
    }

    const uploadsDir = process.env['UPLOADS_DIR'] || '/app/uploads';
    const targetDir = path.join(uploadsDir, folder);
    const filename = `${randomUUID()}.${extForMime(detectedMime)}`;
    const filePath = path.join(targetDir, filename);

    // Path-traversal guard: resolved path must stay inside UPLOADS_DIR
    const resolvedUploadsDir = path.resolve(uploadsDir);
    const resolvedFilePath = path.resolve(filePath);
    if (!resolvedFilePath.startsWith(resolvedUploadsDir + path.sep)) {
      res.status(400).json({ error: 'Chemin de fichier invalide' });
      return;
    }

    try {
      await mkdir(targetDir, { recursive: true });
      await writeFile(filePath, file.buffer);

      const url = `/uploads/${folder}/${filename}`;

      req.log.info(
        {
          folder,
          filename,
          savedPath: filePath,
          publicUrl: url,
          mimeType: detectedMime,
          sizeBytes: file.buffer.length,
        },
        'File uploaded successfully',
      );

      res.json({ success: true, url });
    } catch (err) {
      req.log.error({ err }, 'Error saving uploaded file');
      res.status(500).json({ error: 'Erreur lors de la sauvegarde du fichier' });
    }
  },
);

export default router;
