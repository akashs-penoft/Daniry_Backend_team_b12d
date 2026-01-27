import express from 'express';
import { 
    submitTestimonial, 
    getApprovedTestimonials, 
    getAllTestimonials, 
    toggleApproval, 
    updateTestimonialOrder, 
    deleteTestimonial 
} from '../controllers/testimonialController.js';
import { uploadTestimonialImage } from '../middlewares/uploadMiddleware.js';
import { adminAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/submit', uploadTestimonialImage.single('image'), submitTestimonial);
router.get('/public', getApprovedTestimonials);

// Admin routes (Protected)
router.get('/admin/all', adminAuth, getAllTestimonials);
router.patch('/admin/approve/:id', adminAuth, toggleApproval);
router.put('/admin/reorder', adminAuth, updateTestimonialOrder);
router.delete('/admin/:id', adminAuth, deleteTestimonial);

export default router;
