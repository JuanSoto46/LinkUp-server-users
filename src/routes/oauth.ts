/**
 * OAuth authentication routes
 * @module OAuthRoutes
 */
import { Router } from 'express';
import { auth, db } from '../config/firebase';

const router = Router();

/**
 * Verify Google OAuth token and create/update user
 * @route POST /api/oauth/google
 * @param {string} token - Google OAuth token
 * @param {Object} userProfile - Google user profile
 * @returns {Object} User data and token
 */
router.post('/google', async (req, res) => {
  try {
    const { token, userProfile } = req.body;
    
    if (!userProfile?.email) {
      return res.status(400).json({ 
        success: false,
        error: 'User profile with email is required' 
      });
    }

    // Find existing user or create new one
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(userProfile.email);
      console.log('Google OAuth: Existing user found', userRecord.uid);
    } catch (error: any) {
      // User doesn't exist, create new
      if (error.code === 'auth/user-not-found') {
        userRecord = await auth.createUser({
          email: userProfile.email,
          displayName: userProfile.name,
          emailVerified: true,
        });
        console.log('Google OAuth: New user created', userRecord.uid);
      } else {
        throw error;
      }
    }

    // Update or create user in Firestore
    const userData = {
      uid: userRecord.uid,
      firstName: userProfile.given_name || userProfile.name?.split(' ')[0] || '',
      lastName: userProfile.family_name || userProfile.name?.split(' ').slice(1).join(' ') || '',
      email: userProfile.email,
      displayName: userProfile.name,
      photoURL: userProfile.picture,
      providers: ['google'],
      lastLogin: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      emailVerified: true
    };

    await db.collection('users').doc(userRecord.uid).set(userData, { merge: true });

    const customToken = await auth.createCustomToken(userRecord.uid);

    res.json({
      success: true,
      user: userData,
      token: customToken
    });

  } catch (error: any) {
    console.error('Google OAuth error:', error);
    res.status(400).json({ 
      success: false,
      error: error.message || 'Google authentication failed' 
    });
  }
});

/**
 * Verify Facebook OAuth token and create/update user
 * @route POST /api/oauth/facebook
 * @param {string} token - Facebook OAuth token  
 * @param {Object} userProfile - Facebook user profile
 * @returns {Object} User data and token
 */
router.post('/facebook', async (req, res) => {
  try {
    const { token, userProfile } = req.body;
    
    if (!userProfile?.email) {
      return res.status(400).json({ 
        success: false,
        error: 'User profile with email is required' 
      });
    }

    // Find existing user or create new one
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(userProfile.email);
      console.log('Facebook OAuth: Existing user found', userRecord.uid);
    } catch (error: any) {
      // User doesn't exist, create new
      if (error.code === 'auth/user-not-found') {
        userRecord = await auth.createUser({
          email: userProfile.email,
          displayName: userProfile.name,
          emailVerified: false, // Facebook doesn't guarantee email verification
        });
        console.log('Facebook OAuth: New user created', userRecord.uid);
      } else {
        throw error;
      }
    }

    // Update or create user in Firestore
    const userData = {
      uid: userRecord.uid,
      firstName: userProfile.first_name || userProfile.name?.split(' ')[0] || '',
      lastName: userProfile.last_name || userProfile.name?.split(' ').slice(1).join(' ') || '',
      email: userProfile.email,
      displayName: userProfile.name,
      photoURL: userProfile.picture?.data?.url,
      providers: ['facebook'],
      lastLogin: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      emailVerified: false
    };

    await db.collection('users').doc(userRecord.uid).set(userData, { merge: true });
    const customToken = await auth.createCustomToken(userRecord.uid);

    res.json({
      success: true,
      user: userData,
      token: customToken
    });

  } catch (error: any) {
    console.error('Facebook OAuth error:', error);
    res.status(400).json({ 
      success: false,
      error: error.message || 'Facebook authentication failed' 
    });
  }
});

export default router;