import express from 'express';
import {
    getAllCategories,
    getCategoryBySlug,
    createCategory,
    updateCategory,
    deleteCategory
} from '../controllers/productCategoryController.js';
import {
    getAllProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    getProductComponents,
    manageProductOptions,
    manageProductHighlights,
    manageProductNutrients,
    addReview,
    getProductListing,
    getProductDetails
} from '../controllers/productController.js';
import { adminAuth } from '../middlewares/authMiddleware.js';
import { uploadProductImage } from '../middlewares/uploadMiddleware.js';

const router = express.Router();

// --- Public Routes ---
router.get('/listing', getProductListing);
router.get('/details/:slug', getProductDetails);
router.post('/review/:id', addReview);
router.get('/categories', getAllCategories);
router.get('/categories/:slug', getCategoryBySlug);

// --- Admin Product Category Routes ---
router.get('/admin/categories', adminAuth, getAllCategories);
router.post('/admin/categories', adminAuth, createCategory);
router.put('/admin/categories/:id', adminAuth, updateCategory);
router.delete('/admin/categories/:id', adminAuth, deleteCategory);

// --- Admin Product Routes ---
router.get('/admin/all', adminAuth, getAllProducts);
router.post('/admin/create', adminAuth, createProduct);
router.put('/admin/update/:id', adminAuth, updateProduct);
router.delete('/admin/delete/:id', adminAuth, deleteProduct);

// --- Admin Product Component Management ---
router.get('/admin/components/:id', adminAuth, getProductComponents);
router.post('/admin/options/:id', adminAuth, uploadProductImage.single('image'), manageProductOptions);
router.post('/admin/highlights/:id', adminAuth, manageProductHighlights);
router.post('/admin/nutrients/:id', adminAuth, manageProductNutrients);

export default router;
