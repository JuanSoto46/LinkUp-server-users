/**
 * Meeting management routes
 * @module MeetingRoutes
 */
import { Router } from 'express';
import { db } from '../config/firebase';
import { verifyIdToken } from '../middleware/auth';

const router = Router();
router.use(verifyIdToken);

/**
 * Create a new meeting
 * @route POST /api/meetings
 * @param {string} title - Meeting title
 * @param {string} scheduledAt - Meeting schedule date
 * @param {string} description - Meeting description
 * @returns {Object} Created meeting data
 */
router.post('/', async (req, res, next) => {
  try {
    const ownerUid = (req as any).uid as string;
    const { title, scheduledAt, description } = req.body;

    const meetingData = {
      title: title || 'Untitled Meeting',
      scheduledAt: scheduledAt || null,
      description: description || '',
      ownerUid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'scheduled',
      participants: [ownerUid]
    };

    const ref = await db.collection('meetings').add(meetingData);

    res.status(201).json({
      success: true,
      meeting: {
        id: ref.id,
        ...meetingData
      }
    });

  } catch (error: any) {
    next(error);
  }
});

/**
 * Get user's meetings
 * @route GET /api/meetings
 * @returns {Object} List of user's meetings
 */
router.get('/', async (req, res, next) => {
  try {
    const ownerUid = (req as any).uid as string;

    const snapshot = await db.collection('meetings')
      .where('ownerUid', '==', ownerUid)
      .orderBy('createdAt', 'desc')
      .get();

    const meetings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      success: true,
      meetings,
      count: meetings.length
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