import express from 'express';
import {
    submitTestimonial,
    getApprovedTestimonials,
    getAllTestimonials,
    toggleApproval,
    updateTestimonialOrder,
    deleteTestimonial,
    getAverageRating
} from '../controllers/testimonialController.js';
import { uploadTestimonialImage } from '../middlewares/uploadMiddleware.js';
import { adminAuth } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/rbacMiddleware.js';

const router = express.Router();

// Public routes
router.post('/submit', uploadTestimonialImage.single('image'), submitTestimonial);
router.get('/public', getApprovedTestimonials);
router.get('/average-rating', getAverageRating);

// Admin routes (Protected)
router.get('/admin/all', adminAuth, authorize('testimonials.view'), getAllTestimonials);
router.patch('/admin/approve/:id', adminAuth, authorize('testimonials.edit'), toggleApproval);
router.put('/admin/reorder', adminAuth, authorize('testimonials.edit'), updateTestimonialOrder);
router.delete('/admin/:id', adminAuth, authorize('testimonials.delete'), deleteTestimonial);

export default router;
