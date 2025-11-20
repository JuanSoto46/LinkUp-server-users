/**
 * Meeting management routes
 * @module MeetingRoutes
 */
import { Router } from 'express';
import { db } from '../config/firebase';
import  verifyIdToken  from '../middleware/auth';

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

export default router;