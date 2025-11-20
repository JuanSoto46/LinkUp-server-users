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

    // Create user in Firebase Auth
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
    res.status(400).json({ 
      success: false,
      error: error.message || 'Failed to register user'
    });
  }
});

/**
 * Manual login endpoint
 * @route POST /api/auth/login
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

    // In a real implementation, you would verify credentials
    // For Firebase, this is typically handled client-side
    // This endpoint would verify custom tokens or use Firebase Admin
    const userRecord = await auth.getUserByEmail(email);
    
    // Generate custom token for the user
    const customToken = await auth.createCustomToken(userRecord.uid);
    
    // Get user data from Firestore
    const userDoc = await db.collection('users').doc(userRecord.uid).get();
    const userData = userDoc.data();

    res.json({
      success: true,
      user: userData,
      token: customToken
    });

  } catch (error: any) {
    console.error('Login error:', error);
    res.status(401).json({ 
      success: false,
      error: 'Invalid credentials' 
    });
  }
});

export default router;