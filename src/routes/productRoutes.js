import express from 'express';
import {
    getAllCategories,
    getCategoryBySlug,
    createCategory,
    reorderCategories,
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
    getAllProductReviews,
    getProductListing,
    getProductDetails,
    getProductsByCategory,
    getCategoryProducts,
    manageProductEcommerceLinks
} from '../controllers/productController.js';
import { adminAuth } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/rbacMiddleware.js';
import { uploadProductImage } from '../middlewares/uploadMiddleware.js';

const router = express.Router();

// --- Public Routes ---
router.get('/listing', getProductListing);
router.get('/category/:slug', getCategoryProducts);
router.get('/details/:slug', getProductDetails);
router.get('/by-category/:categoryId', getProductsByCategory);
router.post('/review/:id', addReview);
router.get('/reviews/all', getAllProductReviews);
router.get('/categories', getAllCategories);
router.get('/categories/:slug', getCategoryBySlug);

// --- Admin Product Category Routes ---
router.get('/admin/categories', adminAuth, authorize('products.view'), getAllCategories);
router.post('/admin/categories', adminAuth, authorize('products.create'), createCategory);
router.put('/admin/categories/reorder', adminAuth, authorize('products.edit'), reorderCategories);
router.put('/admin/categories/:id', adminAuth, authorize('products.edit'), updateCategory);
router.delete('/admin/categories/:id', adminAuth, authorize('products.delete'), deleteCategory);

// --- Admin Product Routes ---
router.get('/admin/all', adminAuth, authorize('products.view'), getAllProducts);
router.post('/admin/create', adminAuth, authorize('products.create'), uploadProductImage.single('image'), createProduct);
router.put('/admin/update/:id', adminAuth, authorize('products.edit'), uploadProductImage.single('image'), updateProduct);
router.delete('/admin/delete/:id', adminAuth, authorize('products.delete'), deleteProduct);

// --- Admin Product Component Management ---
router.get('/admin/components/:id', adminAuth, authorize('products.view'), getProductComponents);
router.post('/admin/options/:id', adminAuth, authorize('products.edit'), uploadProductImage.single('image'), manageProductOptions);
router.post('/admin/highlights/:id', adminAuth, authorize('products.edit'), manageProductHighlights);
router.post('/admin/nutrients/:id', adminAuth, authorize('products.edit'), manageProductNutrients);
router.post('/admin/ecommerce-links/:id', adminAuth, authorize('products.edit'), manageProductEcommerceLinks);

export default router;
