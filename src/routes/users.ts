/**
 * User management routes
 * @module UserRoutes
 */
import { Router } from "express";
import { auth, db } from "../config/firebase";
import { verifyIdToken } from "../middleware/auth";

const router = Router();
router.use(verifyIdToken);

/**
 * Get user profile
 * @route GET /api/users/:uid
 */
router.get("/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const requestUid = (req as any).uid as string;

    console.log(
      "GET User Profile - Request UID:",
      requestUid,
      "Target UID:",
      uid
    );

    if (uid !== requestUid) {
      return res.status(403).json({
        success: false,
        error:
          "Acceso denegado. Solo puedes acceder a tu propio perfil.",
      });
    }

    const docRef = db.collection("users").doc(uid);
    const doc = await docRef.get();

    if (!doc.exists) {
      console.log("User document does NOT exist in Firestore:", uid);
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const userData = doc.data();
    console.log("User data from Firestore:", userData);

    return res.json({
      success: true,
      user: userData,
    });
  } catch (error: any) {
    console.error("Get user error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get user data",
    });
  }
});

/**
 * Update or create user profile (upsert)
 * @route PUT /api/users/:uid
 */
router.put("/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const requestUid = (req as any).uid as string;

    if (uid !== requestUid) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    const allowedFields = ["firstName", "lastName", "age", "email"];
    const updateData: any = {};

    // Filtrar solo campos válidos y no vacíos
    for (const field of allowedFields) {
      const value = (req.body as any)[field];

      if (value === undefined) continue;

      if (typeof value === "string") {
        const trimmed = value.trim();
        // No pisar datos existentes con cadenas vacías
        if (trimmed !== "") {
          updateData[field] = trimmed;
        }
      } else {
        updateData[field] = value;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: "No valid fields to update",
      });
    }

    const now = new Date().toISOString();
    updateData.updatedAt = now;

    const userRef = db.collection("users").doc(uid);
    const snapshot = await userRef.get();

    if (!snapshot.exists) {
      console.log("User doc does not exist, creating new one:", uid);
      await userRef.set(
        {
          ...updateData,
          createdAt: now,
        },
        { merge: true }
      );
    } else {
      await userRef.set(updateData, { merge: true });
    }

    if (updateData.email) {
      await auth.updateUser(uid, {
        email: updateData.email,
        emailVerified: false,
      });
    }

    return res.json({
      success: true,
      message: "User updated successfully",
      updatedFields: Object.keys(updateData),
    });
  } catch (error: any) {
    console.error("Update user error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update user",
    });
  }
});

/**
 * Delete user account
 * @route DELETE /api/users/:uid
 */
router.delete("/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const requestUid = (req as any).uid as string;

    if (uid !== requestUid) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    await db.collection("users").doc(uid).delete();
    await auth.deleteUser(uid);

    return res.json({
      success: true,
      message: "User account deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete user error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to delete user",
    });
  }
});

export default router;
