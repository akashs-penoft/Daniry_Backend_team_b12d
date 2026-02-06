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
    reorderCategories,
    getAllCategories,
    getCategoryById
} from '../controllers/faqController.js';
import { adminAuth } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/rbacMiddleware.js';
import { uploadFaqImage } from '../middlewares/uploadMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getFAQs);
router.get('/categories', getAllCategories);

// Admin routes (Protected)
router.get('/admin/all', adminAuth, authorize('faq.view'), getAllFAQs);
router.post('/admin/create', adminAuth, authorize('faq.create'), createFAQ);
router.put('/admin/update/:id', adminAuth, authorize('faq.edit'), updateFAQ);
router.delete('/admin/delete/:id', adminAuth, authorize('faq.delete'), deleteFAQ);
router.put('/admin/reorder', adminAuth, authorize('faq.edit'), reorderFAQs);

// Category Routes (Admin)
router.get('/admin/categories', adminAuth, authorize('faq.view'), getAllCategories);
router.put('/admin/categories/reorder', adminAuth, authorize('faq.edit'), reorderCategories);
router.get('/admin/categories/:id', adminAuth, authorize('faq.view'), getCategoryById);
router.post('/admin/categories', adminAuth, authorize('faq.create'), uploadFaqImage.single('image'), createCategory);
router.put('/admin/categories/:id', adminAuth, authorize('faq.edit'), uploadFaqImage.single('image'), updateCategory);
router.delete('/admin/categories/:id', adminAuth, authorize('faq.delete'), deleteCategory);

export default router;
