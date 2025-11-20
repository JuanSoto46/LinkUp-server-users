/**
 * User management routes
 * @module UserRoutes
 */
import { Router } from 'express';
import { auth, db } from '../config/firebase';
import  verifyIdToken  from '../middleware/auth';

const router = Router();
router.use(verifyIdToken);

/**
 * Get user profile
 * @route GET /api/users/:uid
 * @param {string} uid - User ID
 * @returns {Object} User profile data
 */
router.get('/:uid', async (req, res, next) => {
  try {
    const { uid } = req.params;
    const requestUid = (req as any).uid;

    // Users can only access their own data
    if (uid !== requestUid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const doc = await db.collection('users').doc(uid).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = doc.data();
    
    // Remove sensitive data
    const { password, ...safeUserData } = userData || {};

    res.json({
      success: true,
      user: safeUserData
    });

  } catch (error: any) {
    next(error);
  }
});

/**
 * Update user profile
 * @route PUT /api/users/:uid
 * @param {string} uid - User ID
 * @param {Object} body - Updated user data
 * @returns {Object} Success message
 */
router.put('/:uid', async (req, res, next) => {
  try {
    const { uid } = req.params;
    const requestUid = (req as any).uid;

    if (uid !== requestUid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const allowedFields = ['firstName', 'lastName', 'age', 'email'];
    const updateData: any = {};

    // Filter allowed fields
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updateData.updatedAt = new Date().toISOString();

    // Update Firestore
    await db.collection('users').doc(uid).update(updateData);

    // Update Firebase Auth if email is being changed
    if (updateData.email) {
      await auth.updateUser(uid, {
        email: updateData.email,
        emailVerified: false
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      updatedFields: Object.keys(updateData)
    });

  } catch (error: any) {
    next(error);
  }
});

/**
 * Delete user account
 * @route DELETE /api/users/:uid
 * @param {string} uid - User ID
 * @returns {Object} Success message
 */
router.delete('/:uid', async (req, res, next) => {
  try {
    const { uid } = req.params;
    const requestUid = (req as any).uid;

    if (uid !== requestUid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete from Firestore
    await db.collection('users').doc(uid).delete();
    
    // Delete from Firebase Auth
    await auth.deleteUser(uid);

    res.json({
      success: true,
      message: 'User account deleted successfully'
    });

  } catch (error: any) {
    next(error);
  }
});

export default router;