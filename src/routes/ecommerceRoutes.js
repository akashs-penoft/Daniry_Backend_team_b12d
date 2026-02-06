import express from 'express';
import {
    getEcommercePlatforms,
    createEcommercePlatform,
    updateEcommercePlatform,
    deleteEcommercePlatform
} from '../controllers/ecommerceController.js';
import { adminAuth } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/rbacMiddleware.js';
import { uploadProductImage } from '../middlewares/uploadMiddleware.js'; // Reusing product image uploader

const router = express.Router();

router.get('/', getEcommercePlatforms);
router.post('/', adminAuth, authorize('ecommerce.create'), uploadProductImage.single('logo'), createEcommercePlatform);
router.put('/:id', adminAuth, authorize('ecommerce.edit'), uploadProductImage.single('logo'), updateEcommercePlatform);
router.delete('/:id', adminAuth, authorize('ecommerce.delete'), deleteEcommercePlatform);

router.get('/public', getEcommercePlatforms); // Public route if needed

export default router;
