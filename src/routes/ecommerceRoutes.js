import express from 'express';
import {
    getEcommercePlatforms,
    createEcommercePlatform,
    updateEcommercePlatform,
    deleteEcommercePlatform
} from '../controllers/ecommerceController.js';
import { adminAuth } from '../middlewares/authMiddleware.js';
import { uploadProductImage } from '../middlewares/uploadMiddleware.js'; // Reusing product image uploader

const router = express.Router();

router.get('/', adminAuth, getEcommercePlatforms);
router.post('/', adminAuth, uploadProductImage.single('logo'), createEcommercePlatform);
router.put('/:id', adminAuth, uploadProductImage.single('logo'), updateEcommercePlatform);
router.delete('/:id', adminAuth, deleteEcommercePlatform);

router.get('/public', getEcommercePlatforms); // Public route if needed

export default router;
