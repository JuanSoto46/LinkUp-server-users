/**
 * OAuth authentication routes
 * @module OAuthRoutes
 */
import { Router } from "express";
import { auth, db } from "../config/firebase";
import { userDAO } from "../dao/userDAO";

const router = Router();

/**
 * Helper to merge incoming user data with existing data.
 * - Does not overwrite existing values with empty strings or null.
 */
function mergeUserData(existing: any | undefined, incoming: any) {
  const base = existing ? { ...existing } : {};
  const result: any = { ...base };

  for (const [key, value] of Object.entries(incoming)) {
    if (value === undefined) continue;

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed !== "") {
        result[key] = trimmed;
      }
    } else if (value !== null) {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Helper to merge providers arrays without duplicates.
 */
function mergeProviders(
  existingProviders: string[] | undefined,
  newProvider: string
): string[] {
  const all = new Set<string>([...(existingProviders || []), newProvider]);
  return Array.from(all);
}

/**
 * Verify Google OAuth token and create/update user
 * @route POST /api/oauth/google
 * @param {string} token - Google OAuth token
 * @param {Object} userProfile - Google user profile
 * @returns {Object} User data and token
 */
router.post("/google", async (req, res) => {
  try {
    const { token, userProfile } = req.body;
    console.log("Google OAuth: Received user profile", userProfile);

    if (!userProfile?.email) {
      return res.status(400).json({
        success: false,
        error: "User profile with email is required",
      });
    }

    // Split displayName into parts
    const parts = (userProfile.displayName || userProfile.name || "")
      .trim()
      .split(/\s+/);

    const [name, secondName, firstLastName, secondLastName] = [
      parts[0] ?? null,
      parts[1] ?? null,
      parts[2] ?? null,
      parts[3] ?? null,
    ];

    const firstName = name
      ? name + (secondName ? ` ${secondName}` : "")
      : "";
    const lastName = firstLastName
      ? firstLastName + (secondLastName ? ` ${secondLastName}` : "")
      : parts.slice(1).join(" ");

    // Find existing user or create new one in Firebase Auth
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(userProfile.email);
      console.log("Google OAuth: Existing user found", userRecord.uid);
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        userRecord = await auth.createUser({
          email: userProfile.email,
          displayName: userProfile.name || userProfile.displayName,
          emailVerified: true,
        });
        console.log("Google OAuth: New user created", userRecord.uid);
      } else {
        throw error;
      }
    }

    const uid = userRecord.uid;
    const now = new Date().toISOString();

    // Load existing Firestore user doc (if any)
    const userRef = db.collection("users").doc(uid);
    const existingSnap = await userRef.get();
    const existingData = existingSnap.exists ? existingSnap.data() : undefined;

    const providers = mergeProviders(
      (existingData?.providers as string[]) || [],
      "google"
    );

    const incomingData = {
      uid,
      firstName,
      lastName,
      email: userProfile.email,
      displayName: userProfile.name || userProfile.displayName,
      photoURL: userProfile.picture,
      providers,
      lastLogin: now,
      updatedAt: now,
      emailVerified: true,
    };

    const mergedData = mergeUserData(existingData, incomingData);

    let user;
    if (existingSnap.exists) {
      user = await userDAO.update(uid, mergedData);
    } else {
      user = await userDAO.create({
        ...mergedData,
        createdAt: now,
      });
    }

    const customToken = await auth.createCustomToken(uid);

    res.json({
      success: true,
      user,
      token: customToken,
    });
  } catch (error: any) {
    console.error("Google OAuth error:", error);
    res.status(400).json({
      success: false,
      error: error.message || "Google authentication failed",
    });
  }
});

/**
 * Verify Github OAuth token and create/update user
 * @route POST /api/oauth/github
 * @param {string} token - Github OAuth token
 * @param {Object} userProfile - Github user profile
 * @returns {Object} User data and token
 */
router.post("/github", async (req, res) => {
  try {
    const { token, userProfile } = req.body;
    console.log("Github OAuth: Received user profile", userProfile);

    if (!userProfile?.email) {
      return res.status(400).json({
        success: false,
        error: "User profile with email is required",
      });
    }

    // Find existing user or create new one
    let userRecord;
    try {
      if (userProfile.uid) {
        userRecord = await auth.getUser(userProfile.uid);
      } else {
        userRecord = await auth.getUserByEmail(userProfile.email);
      }
      console.log("Github OAuth: Existing user found", userRecord.uid);
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        userRecord = await auth.createUser({
          email: userProfile.email,
          displayName: userProfile.name,
        });
        console.log("Github OAuth: New user created", userRecord.uid);
      } else {
        throw error;
      }
    }

    const uid = userRecord.uid;
    const now = new Date().toISOString();

    // Load existing Firestore user doc
    const userRef = db.collection("users").doc(uid);
    const existingSnap = await userRef.get();
    const existingData = existingSnap.exists ? existingSnap.data() : undefined;

    const providers = mergeProviders(
      (existingData?.providers as string[]) || [],
      "github"
    );

    const nameFromProfile =
      userProfile.name || userProfile.login || userProfile.username || "";
    const parts = nameFromProfile.trim().split(/\s+/);

    const incomingData = {
      uid,
      firstName:
        userProfile.first_name ||
        (parts[0] || "") ||
        (existingData?.firstName ?? ""),
      lastName:
        userProfile.last_name ||
        parts.slice(1).join(" ") ||
        (existingData?.lastName ?? ""),
      email: userProfile.email,
      displayName: nameFromProfile,
      photoURL:
        userProfile.avatar_url ??
        userProfile.picture?.data?.url ??
        userProfile.picture ??
        null,
      providers,
      lastLogin: now,
      updatedAt: now,
      emailVerified: false,
    };

    const mergedData = mergeUserData(existingData, incomingData);

    const user = existingSnap.exists
      ? await userDAO.update(uid, mergedData)
      : await userDAO.create({
          ...mergedData,
          createdAt: now,
        });

    const customToken = await auth.createCustomToken(uid);

    res.json({
      success: true,
      user,
      token: customToken,
    });
  } catch (error: any) {
    console.error("Github OAuth error:", error);
    res.status(400).json({
      success: false,
      error: error.message || "Github authentication failed",
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
router.post("/facebook", async (req, res) => {
  try {
    const { token, userProfile } = req.body;
    console.log("Facebook OAuth: Received user profile", userProfile);

    if (!userProfile?.email) {
      return res.status(400).json({
        success: false,
        error: "User profile with email is required",
      });
    }

    // Find existing user or create new one
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(userProfile.email);
      console.log("Facebook OAuth: Existing user found", userRecord.uid);
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        userRecord = await auth.createUser({
          email: userProfile.email,
          displayName: userProfile.name,
          emailVerified: false,
        });
        console.log("Facebook OAuth: New user created", userRecord.uid);
      } else {
        throw error;
      }
    }

    const uid = userRecord.uid;
    const now = new Date().toISOString();

    // Load existing Firestore user doc
    const userRef = db.collection("users").doc(uid);
    const existingSnap = await userRef.get();
    const existingData = existingSnap.exists ? existingSnap.data() : undefined;

    const providers = mergeProviders(
      (existingData?.providers as string[]) || [],
      "facebook"
    );

    const nameFromProfile = userProfile.name || "";
    const parts = nameFromProfile.trim().split(/\s+/);

    const incomingData = {
      uid,
      firstName:
        userProfile.first_name || (parts[0] || "") || existingData?.firstName,
      lastName:
        userProfile.last_name ||
        parts.slice(1).join(" ") ||
        existingData?.lastName,
      email: userProfile.email,
      displayName: nameFromProfile,
      photoURL: userProfile.picture?.data?.url ?? userProfile.picture ?? null,
      providers,
      lastLogin: now,
      updatedAt: now,
      emailVerified: false,
    };

    const mergedData = mergeUserData(existingData, incomingData);

    const user = existingSnap.exists
      ? await userDAO.update(uid, mergedData)
      : await userDAO.create({
          ...mergedData,
          createdAt: now,
        });

    const customToken = await auth.createCustomToken(uid);

    res.json({
      success: true,
      user,
      token: customToken,
    });
  } catch (error: any) {
    console.error("Facebook OAuth error:", error);
    res.status(400).json({
      success: false,
      error: error.message || "Facebook authentication failed",
    });
  }
});

export default router;
