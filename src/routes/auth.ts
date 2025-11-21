/**
 * Authentication routes for user registration and login
 * @module AuthRoutes
 */
import { Router } from 'express';
import { auth, db } from '../config/firebase';

const router = Router();

/**
 * Register a new user
 * @route POST /api/auth/register
 * @param {string} firstName - User's first name
 * @param {string} lastName - User's last name  
 * @param {number} age - User's age
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Object} Created user data
 */
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, age, email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Email and password are required' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false,
        error: 'Password must be at least 6 characters long' 
      });
    }

    // Check if user already exists in Firebase Auth
    try {
      const existingUser = await auth.getUserByEmail(email);
      
      // User exists, check if they have manual provider
      const userDoc = await db.collection('users').doc(existingUser.uid).get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        const providers = userData?.providers || [];
        
        if (providers.includes('manual')) {
          return res.status(400).json({ 
            success: false,
            error: 'Email already registered with manual login' 
          });
        } else {
          // User exists with OAuth, add manual provider
          await db.collection('users').doc(existingUser.uid).update({
            providers: [...providers, 'manual'],
            updatedAt: new Date().toISOString()
          });

          // Update password for existing user
          await auth.updateUser(existingUser.uid, { password });

          return res.json({
            success: true,
            user: {
              uid: existingUser.uid,
              firstName: userData?.firstName || '',
              lastName: userData?.lastName || '',
              age: userData?.age || null,
              email: existingUser.email
            }
          });
        }
      }
    } catch (error: any) {
      // User doesn't exist in Firebase Auth, proceed with creation
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
    }

    // Create new user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: `${firstName || ''} ${lastName || ''}`.trim(),
      emailVerified: false,
    });

    // Store user data in Firestore
    const userData = {
      uid: userRecord.uid,
      firstName: firstName || '',
      lastName: lastName || '',
      age: age ? Number(age) : null,
      email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      providers: ['manual']
    };

    await db.collection('users').doc(userRecord.uid).set(userData);

    res.status(201).json({
      success: true,
      user: {
        uid: userRecord.uid,
        firstName: userData.firstName,
        lastName: userData.lastName,
        age: userData.age,
        email: userData.email
      }
    });

  } catch (error: any) {
    console.error('Registration error:', error);
    
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ 
        success: false,
        error: 'Email already registered. Try logging in instead.' 
      });
    }
    
    res.status(400).json({ 
      success: false,
      error: error.message || 'Failed to register user'
    });
  }
});

/**
 * Manual login endpoint
 * @route POST /api/auth/register
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Object} User data and token
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Email and password are required' 
      });
    }

    // Get user by email
    const userRecord = await auth.getUserByEmail(email);
    
    // Verify the user has manual provider
    const userDoc = await db.collection('users').doc(userRecord.uid).get();
    
    if (!userDoc.exists) {
      return res.status(401).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    const userData = userDoc.data();
    const providers = userData?.providers || [];
    
    if (!providers.includes('manual')) {
      return res.status(401).json({ 
        success: false,
        error: 'Please use your original sign-in method' 
      });
    }

    // Generate custom token for the user
    const customToken = await auth.createCustomToken(userRecord.uid);

    res.json({
      success: true,
      user: userData,
      token: customToken
    });

  } catch (error: any) {
    console.error('Login error:', error);
    
    if (error.code === 'auth/user-not-found') {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid email or password' 
      });
    }
    
    res.status(401).json({ 
      success: false,
      error: 'Invalid credentials' 
    });
  }
});

export default router;