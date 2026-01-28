import express from 'express';
import {
    getFAQs,
    getAllFAQs,
    createFAQ,
    updateFAQ,
    deleteFAQ,
    reorderFAQs
} from '../controllers/faqController.js';
import { adminAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getFAQs);

// Admin routes (Protected)
router.get('/admin/all', adminAuth, getAllFAQs);
router.post('/admin/create', adminAuth, createFAQ);
router.put('/admin/update/:id', adminAuth, updateFAQ);
router.delete('/admin/delete/:id', adminAuth, deleteFAQ);
router.put('/admin/reorder', adminAuth, reorderFAQs);

export default router;
