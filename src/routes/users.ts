/**
 * User management routes
 * @module UserRoutes
 */
import { Router } from 'express';
import { auth, db } from '../config/firebase';
import { verifyIdToken } from '../middleware/auth';
import { userDAO } from '../dao/userDAO';

const router = Router();
router.use(verifyIdToken);

/**
 * Get user profile
 * @route GET /api/users/:uid
 * @param {string} uid - User ID
 * @returns {Object} User profile data
 */
router.get('/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const requestUid = (req as any).uid;

    console.log('GET User Profile - Request UID:', requestUid, 'Target UID:', uid);

    // Users can only access their own data
    if (uid !== requestUid) {
      return res.status(403).json({ 
        success: false,
        error: 'Access denied. You can only access your own profile.' 
      });
    }

    const doc = await db.collection('users').doc(uid).get();
    
    if (!doc.exists) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    const userData = doc.data();
    console.log('User data from Firestore:', userData);

    res.json({
      success: true,
      user: userData
    });

  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get user data' 
    });
  }
});

/**
 * Update user profile
 * @route PUT /api/users/:uid
 * @param {string} uid - User ID
 * @param {Object} body - Updated user data
 * @returns {Object} Success message
 */
router.put('/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const requestUid = (req as any).uid;

    if (uid !== requestUid) {
      return res.status(403).json({ 
        success: false,
        error: 'Access denied' 
      });
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
      return res.status(400).json({ 
        success: false,
        error: 'No valid fields to update' 
      });
    }

    updateData.updatedAt = new Date().toISOString();

    // Update Firestore
    const doc =  await userDAO.update(uid, updateData);

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
    console.error('Update user error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update user' 
    });
  }
});

/**
 * Delete user account
 * @route DELETE /api/users/:uid
 * @param {string} uid - User ID
 * @returns {Object} Success message
 */
router.delete('/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const requestUid = (req as any).uid;

    if (uid !== requestUid) {
      return res.status(403).json({ 
        success: false,
        error: 'Access denied' 
      });
    }

    // Delete from Firestore
    await userDAO.delete(uid);
    
    // Delete from Firebase Auth
    await auth.deleteUser(uid);

    res.json({
      success: true,
      message: 'User account deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete user error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete user' 
    });
  }
});

export default router;