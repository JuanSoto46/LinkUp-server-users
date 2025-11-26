/**
 * Meeting management routes
 * @module MeetingRoutes
 */
import { Router } from "express";
import { db } from "../config/firebase";
import { verifyIdToken } from "../middleware/auth";

const router = Router();

/**
 * Create a new meeting
 * @route POST /api/meetings
 */
router.post("/", verifyIdToken, async (req, res, next) => {
  try {
    const ownerUid = (req as any).uid as string;
    const { title, scheduledAt, description } = req.body;

    const now = new Date().toISOString();

    const meetingData = {
      title: title || "Untitled Meeting",
      scheduledAt: scheduledAt || null,
      description: description || "",
      ownerUid,
      createdAt: now,
      updatedAt: now,
      status: "scheduled",
      participants: [ownerUid],
      isPublic: true, // ✅ Permitir acceso público por defecto
    };

    const ref = await db.collection("meetings").add(meetingData);

    res.status(201).json({
      success: true,
      meeting: {
        id: ref.id,
        ...meetingData,
      },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * Get user's meetings
 * @route GET /api/meetings
 */
router.get("/", verifyIdToken, async (req, res, next) => {
  try {
    const ownerUid = (req as any).uid as string;

    const snapshot = await db
      .collection("meetings")
      .where("ownerUid", "==", ownerUid)
      .orderBy("createdAt", "desc")
      .get();

    const meetings = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({
      success: true,
      meetings,
      count: meetings.length,
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * ✅ MEJORADO: Get a specific meeting by ID
 * Permite acceso a CUALQUIER usuario autenticado (acceso público)
 * @route GET /api/meetings/:id
 */
router.get("/:id", verifyIdToken, async (req, res, next) => {
  try {
    const currentUserId = (req as any).uid as string;
    const { id } = req.params;

    const docRef = db.collection("meetings").doc(id);
    const snap = await docRef.get();

    if (!snap.exists) {
      return res.status(404).json({
        success: false,
        error: "Meeting not found",
      });
    }

    const data = snap.data() as any;

    // ✅ ACCESO PÚBLICO: Cualquier usuario autenticado puede acceder
    // Solo verificar que el usuario esté autenticado (ya verificado por verifyIdToken)
    
    // ✅ Agregar automáticamente como participante si no lo es
    const isParticipant = data.participants?.includes(currentUserId);
    
    if (!isParticipant) {
      console.log(`➕ Adding user ${currentUserId} to meeting ${id}`);
      await docRef.update({
        participants: [...(data.participants || []), currentUserId],
      });
      
      data.participants = [...(data.participants || []), currentUserId];
    }

    res.json({
      success: true,
      meeting: {
        id: snap.id,
        ...data,
      },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * Update a meeting
 * @route PUT /api/meetings/:id
 */
router.put("/:id", verifyIdToken, async (req, res, next) => {
  try {
    const ownerUid = (req as any).uid as string;
    const { id } = req.params;
    const { title, description, scheduledAt, status, isPublic } = req.body;

    const docRef = db.collection("meetings").doc(id);
    const snap = await docRef.get();

    if (!snap.exists) {
      return res.status(404).json({
        success: false,
        error: "Meeting not found",
      });
    }

    const data = snap.data() as any;

    // Solo el owner puede actualizar
    if (data.ownerUid && data.ownerUid !== ownerUid) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to update this meeting",
      });
    }

    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    if (title !== undefined) updates.title = title || "Untitled Meeting";
    if (description !== undefined) updates.description = description;
    if (scheduledAt !== undefined) updates.scheduledAt = scheduledAt || null;
    if (status !== undefined) updates.status = status;
    if (isPublic !== undefined) updates.isPublic = isPublic; // ✅ Permitir cambiar privacidad

    await docRef.update(updates);

    const updatedSnap = await docRef.get();

    res.json({
      success: true,
      meeting: {
        id: updatedSnap.id,
        ...updatedSnap.data(),
      },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * Delete / cancel a meeting
 * @route DELETE /api/meetings/:id
 */
router.delete("/:id", verifyIdToken, async (req, res, next) => {
  try {
    const ownerUid = (req as any).uid as string;
    const { id } = req.params;

    const docRef = db.collection("meetings").doc(id);
    const snap = await docRef.get();

    if (!snap.exists) {
      return res.status(404).json({
        success: false,
        error: "Meeting not found",
      });
    }

    const data = snap.data() as any;

    // Solo el owner puede eliminar
    if (data.ownerUid && data.ownerUid !== ownerUid) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to delete this meeting",
      });
    }

    await docRef.delete();

    res.json({
      success: true,
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * ✅ NUEVO: Get meeting participants in real-time
 * @route GET /api/meetings/:id/participants
 */
router.get("/:id/participants", verifyIdToken, async (req, res, next) => {
  try {
    const ownerUid = (req as any).uid as string;
    const { id } = req.params;

    const docRef = db.collection("meetings").doc(id);
    const snap = await docRef.get();

    if (!snap.exists) {
      return res.status(404).json({
        success: false,
        error: "Meeting not found",
      });
    }

    const data = snap.data() as any;

    // Verificar acceso
    const isOwner = data.ownerUid === ownerUid;
    const isParticipant = data.participants?.includes(ownerUid);
    const isPublic = data.isPublic === true;

    if (!isOwner && !isParticipant && !isPublic) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to access this meeting",
      });
    }

    res.json({
      success: true,
      participants: data.participants || [],
      count: (data.participants || []).length,
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * Get a specific meeting by ID
 * @route GET /api/meetings/:id
 * @returns {Object} Meeting data
 */
router.get('/:id', async (req, res, next) => {
  try {
    const ownerUid = (req as any).uid as string;
    const { id } = req.params;

    const doc = await db.collection('meetings').doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found'
      });
    }

    const meeting = doc.data();

    // Verificar que el usuario es el propietario o participante
    if (meeting?.ownerUid !== ownerUid && !meeting?.participants?.includes(ownerUid)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      meeting: {
        id: doc.id,
        ...meeting
      }
    });

  } catch (error: any) {
    next(error);
  }
});

/**
 * Update a meeting
 * @route PUT /api/meetings/:id
 */
router.put('/:id', async (req, res, next) => {
  try {
    const ownerUid = (req as any).uid as string;
    const { id } = req.params;
    const { title, scheduledAt, description, status } = req.body;

    const docRef = db.collection('meetings').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found'
      });
    }

    const meeting = doc.data();

    if (meeting?.ownerUid !== ownerUid) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const updateData = {
      ...(title !== undefined && { title }),
      ...(scheduledAt !== undefined && { scheduledAt }),
      ...(description !== undefined && { description }),
      ...(status !== undefined && { status }),
      updatedAt: new Date().toISOString()
    };

    await docRef.update(updateData);

    res.json({
      success: true,
      meeting: {
        id,
        ...meeting,
        ...updateData
      }
    });

  } catch (error: any) {
    next(error);
  }
});

/**
 * Delete a meeting
 * @route DELETE /api/meetings/:id
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const ownerUid = (req as any).uid as string;
    const { id } = req.params;

    const doc = await db.collection('meetings').doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found'
      });
    }

    const meeting = doc.data();

    if (meeting?.ownerUid !== ownerUid) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    await db.collection('meetings').doc(id).delete();

    res.json({
      success: true,
      message: 'Meeting deleted successfully'
    });

  } catch (error: any) {
    next(error);
  }
});

export default router;