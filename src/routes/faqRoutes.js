import express from 'express';
import {
    getFAQs,
    getAllFAQs,
    createFAQ,
    updateFAQ,
    deleteFAQ,
    reorderFAQs,
    createCategory,
    updateCategory,
    deleteCategory,
    getAllCategories,
    getCategoryById
} from '../controllers/faqController.js';
import { adminAuth } from '../middlewares/authMiddleware.js';
import { uploadFaqImage } from '../middlewares/uploadMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getFAQs);
router.get('/categories', getAllCategories);

// Admin routes (Protected)
router.get('/admin/all', adminAuth, getAllFAQs);
router.post('/admin/create', adminAuth, createFAQ);
router.put('/admin/update/:id', adminAuth, updateFAQ);
router.delete('/admin/delete/:id', adminAuth, deleteFAQ);
router.put('/admin/reorder', adminAuth, reorderFAQs);

// Category Routes (Admin)
router.get('/admin/categories', adminAuth, getAllCategories);
router.get('/admin/categories/:id', adminAuth, getCategoryById);
router.post('/admin/categories', adminAuth, uploadFaqImage.single('image'), createCategory);
router.put('/admin/categories/:id', adminAuth, uploadFaqImage.single('image'), updateCategory);
router.delete('/admin/categories/:id', adminAuth, deleteCategory);

export default router;
