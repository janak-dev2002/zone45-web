import { Router, Request, Response, NextFunction } from 'express';
import { uploadSignBodySchema } from '../../lib/schemas';
import { sendError } from '../../middleware/errorHandler';
import { signUploadUrl } from '../../services/r2';

const router = Router();

// POST /admin/uploads/sign
router.post('/sign', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = uploadSignBodySchema.safeParse(req.body);
    if (!parsed.success) {
      const details = parsed.error.errors.reduce<Record<string, string>>((acc, e) => {
        acc[e.path.join('.')] = e.message;
        return acc;
      }, {});
      sendError(res, 422, 'VALIDATION_FAILED', 'Validation failed', details);
      return;
    }

    const { contentType, sizeBytes } = parsed.data;
    const result = await signUploadUrl(contentType, sizeBytes);

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
