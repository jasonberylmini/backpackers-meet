import Flag from '../models/Flag.js';
import { analyzeWithPerspective } from '../utils/perspectiveClient.js';
import AdminLog from '../models/AdminLog.js';

// Perspective-only evaluation (no heuristic fallback)
export async function evaluateText(text) {
  if (!text || typeof text !== 'string') {
    return { allowed: true, flagged: false, severity: 'low', reasons: [] };
  }
  const perspective = await analyzeWithPerspective(text).catch(() => null);
  // If Perspective isn't available (key missing/network), allow by default
  return perspective || { allowed: true, flagged: false, severity: 'low', reasons: [], aiDecision: 'approved' };
}

// Express middleware factory: check a text field on req.body
export function moderateBodyField(fieldName) {
  return async (req, res, next) => {
    const text = req.body?.[fieldName] || '';
    const result = await evaluateText(text);
    req.moderation = req.moderation || {};
    req.moderation[fieldName] = result;
    if (!result.allowed) {
      return res.status(400).json({
        message: 'Content violates safety policy. Please revise your text.',
        issues: result.reasons
      });
    }
    return next();
  };
}

// Helper to auto-create a flag after resource is created
export async function maybeCreateAutoFlag({
  req,
  fieldName,
  targetId,
  flagType
}) {
  try {
    const resForField = req?.moderation?.[fieldName];
    if (!resForField) return;
    if (resForField.flagged && resForField.severity !== 'low') {
      const flag = new Flag({
        flaggedBy: req.user?.userId,
        flagType,
        targetId,
        reason: `Auto moderation: ${resForField.reasons.join(', ')}`,
        severity: resForField.severity
      });
      await flag.save();
      await AdminLog.create({
        actor: 'ai',
        action: 'auto_flag_created',
        targetFlagId: flag._id,
        reason: `AI flagged ${flagType}`,
        metadata: { fieldName, reasons: resForField.reasons, severity: resForField.severity }
      });
    }
  } catch (err) {
    // Do not block user flow on flag creation error
    // eslint-disable-next-line no-console
    console.error('Auto-flag creation failed:', err);
  }
}

export default {
  evaluateText,
  moderateBodyField,
  maybeCreateAutoFlag
};


