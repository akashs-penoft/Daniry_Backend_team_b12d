import { db } from '../configs/db.js';

// --- Admin Actions ---

// Get All Products (Admin)
export const getAllProducts = async (req, res, next) => {
    try {
        const [rows] = await db.execute(`
            SELECT p.*, c.name as category_name 
            FROM products p 
            JOIN product_categories c ON p.category_id = c.id 
            ORDER BY p.created_at DESC
        `);
        res.json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};

// Create Product
export const createProduct = async (req, res, next) => {
    try {
        const {
            category_id, name, slug, short_description,
            description, ingredients, has_stages, has_variants, is_active
        } = req.body;
        const image_url = req.file ? `/uploads/products/${req.file.filename}` : null;

        if (!category_id || !name || !slug) {
            return res.status(400).json({ success: false, message: 'Category, name, and slug are required' });
        }

        const [result] = await db.execute(
            `INSERT INTO products 
            (category_id, name, slug, image_url, short_description, description, ingredients, has_stages, has_variants, is_active) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                category_id, name, slug, image_url, short_description || null,
                description || null, ingredients || null,
                has_stages ?? 0, has_variants ?? 0, is_active ?? 1
            ]
        );

        res.status(201).json({ success: true, message: 'Product created successfully', data: { id: result.insertId } });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Slug must be unique' });
        }
        next(error);
    }
};

// Update Product
export const updateProduct = async (req, res, next) => {
    try {
        const { id } = req.params;
        const {
            category_id, name, slug, short_description,
            description, ingredients, has_stages, has_variants, is_active
        } = req.body;

        const [existing] = await db.execute('SELECT * FROM products WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const product = existing[0];
        const image_url = req.file ? `/uploads/products/${req.file.filename}` : product.image_url;

        await db.execute(
            `UPDATE products SET 
            category_id = ?, name = ?, slug = ?, image_url = ?, short_description = ?, 
            description = ?, ingredients = ?, has_stages = ?, has_variants = ?, is_active = ? 
            WHERE id = ?`,
            [
                category_id ?? product.category_id,
                name ?? product.name,
                slug ?? product.slug,
                image_url,
                short_description ?? product.short_description,
                description ?? product.description,
                ingredients ?? product.ingredients,
                has_stages ?? product.has_stages,
                has_variants ?? product.has_variants,
                is_active ?? product.is_active,
                id
            ]
        );

        res.json({ success: true, message: 'Product updated successfully' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Slug must be unique' });
        }
        next(error);
    }
};

// Delete Product
export const deleteProduct = async (req, res, next) => {
    const connection = await db.getConnection();
    try {
        const { id } = req.params;

        await connection.beginTransaction();

        // Check if product exists
        const [existing] = await connection.execute('SELECT * FROM products WHERE id = ?', [id]);
        if (existing.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Delete related records first (to handle foreign key constraints)
        await connection.execute('DELETE FROM product_reviews WHERE product_id = ?', [id]);
        await connection.execute('DELETE FROM product_nutrients WHERE product_id = ?', [id]);
        await connection.execute('DELETE FROM product_highlights WHERE product_id = ?', [id]);
        await connection.execute('DELETE FROM product_options WHERE product_id = ?', [id]);

        // Now delete the product itself
        await connection.execute('DELETE FROM products WHERE id = ?', [id]);

        await connection.commit();
        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

// --- Product Components Actions (Options, Highlights, Nutrients) ---

// Get Product Components (Admin)
export const getProductComponents = async (req, res, next) => {
    try {
        const { id } = req.params;

        const [options] = await db.execute('SELECT * FROM product_options WHERE product_id = ? ORDER BY sort_order ASC', [id]);
        const [highlights] = await db.execute('SELECT * FROM product_highlights WHERE product_id = ? ORDER BY sort_order ASC', [id]);
        const [nutrients] = await db.execute('SELECT *, nutrient_name as nutrient FROM product_nutrients WHERE product_id = ? ORDER BY sort_order ASC', [id]);

        res.json({ success: true, data: { options, highlights, nutrients } });
    } catch (error) {
        next(error);
    }
};

// Manage Product Options (Bulk update/replace)
export const manageProductOptions = async (req, res, next) => {
    const connection = await db.getConnection();
    try {
        const { id } = req.params; // product_id
        const { options } = req.body; // array of options

        await connection.beginTransaction();

        // Simple approach: delete existing and insert new
        await connection.execute('DELETE FROM product_options WHERE product_id = ?', [id]);

        if (options && options.length > 0) {
            const insertQuery = `INSERT INTO product_options 
                (product_id, option_type, title, subtitle, age_range, image, sort_order, is_active) 
                VALUES ?`;

            const values = options.map(opt => [
                id, opt.option_type, opt.title, opt.subtitle || null,
                opt.age_range || null, opt.image || null, opt.sort_order || 0, opt.is_active ?? 1
            ]);

            await connection.query(insertQuery, [values]);
        }

        await connection.commit();
        res.json({ success: true, message: 'Product options updated successfully' });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

// Manage Product Highlights
export const manageProductHighlights = async (req, res, next) => {
    const connection = await db.getConnection();
    try {
        const { id } = req.params;
        const { highlights } = req.body;

        await connection.beginTransaction();
        await connection.execute('DELETE FROM product_highlights WHERE product_id = ?', [id]);

        if (highlights && highlights.length > 0) {
            const insertQuery = `INSERT INTO product_highlights (product_id, highlight, sort_order) VALUES ?`;
            const values = highlights.map(h => [id, h.highlight || '', h.sort_order || 0]);
            await connection.query(insertQuery, [values]);
        }

        await connection.commit();
        res.json({ success: true, message: 'Product highlights updated successfully' });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

// Manage Product Nutrients
export const manageProductNutrients = async (req, res, next) => {
    const connection = await db.getConnection();
    try {
        const { id } = req.params;
        const { nutrients } = req.body;

        await connection.beginTransaction();
        await connection.execute('DELETE FROM product_nutrients WHERE product_id = ?', [id]);

        if (nutrients && nutrients.length > 0) {
            const insertQuery = `INSERT INTO product_nutrients (product_id, nutrient_name, nutrient_value, sort_order) VALUES ?`;
            const values = nutrients.map(n => [
                id,
                n.nutrient || n.nutrient_name,
                n.nutrient_value || '',
                n.sort_order || 0
            ]);
            await connection.query(insertQuery, [values]);
        }

        await connection.commit();
        res.json({ success: true, message: 'Product nutrients updated successfully' });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

// --- Review Actions ---

// Add Review (Public)
export const addReview = async (req, res, next) => {
    const connection = await db.getConnection();
    try {
        const { id } = req.params; // product_id
        const { reviewer_name, rating, review } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: 'Valid rating (1-5) is required' });
        }

        await connection.beginTransaction();

        // Insert review
        await connection.execute(
            'INSERT INTO product_reviews (product_id, reviewer_name, rating, review, is_approved) VALUES (?, ?, ?, ?, ?)',
            [id, reviewer_name || 'Anonymous', rating, review || null, 1] // Auto-approving for now per requirements
        );

        // Update product rating and count
        const [stats] = await connection.execute(
            'SELECT AVG(rating) as avg_rating, COUNT(*) as review_count FROM product_reviews WHERE product_id = ? AND is_approved = 1',
            [id]
        );

        await connection.execute(
            'UPDATE products SET avg_rating = ?, review_count = ? WHERE id = ?',
            [stats[0].avg_rating || 0, stats[0].review_count || 0, id]
        );

        await connection.commit();
        res.status(201).json({ success: true, message: 'Review added successfully' });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

// Get All Product Reviews (Public)
export const getAllProductReviews = async (req, res, next) => {
    try {
        const { page = 1, limit = 4 } = req.query;
        const offset = (page - 1) * limit;

        const [reviews] = await db.execute(`
            SELECT pr.*, p.name as product_name, p.slug as product_slug
            FROM product_reviews pr
            JOIN products p ON pr.product_id = p.id
            WHERE pr.is_approved = 1
            ORDER BY pr.created_at DESC
            LIMIT ? OFFSET ?
        `, [String(limit), String(offset)]);

        // Get total count
        const [totalRows] = await db.execute('SELECT COUNT(*) as total FROM product_reviews WHERE is_approved = 1');
        const total = totalRows[0].total;

        res.json({
            success: true,
            data: reviews,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                hasMore: offset + reviews.length < total
            }
        });
    } catch (error) {
        next(error);
    }
};

// --- Public Actions ---

// Get Product Listing (Frontend)
export const getProductListing = async (req, res, next) => {
    try {
        const { limit = 100 } = req.query; // Default to 100 products per category for now

        // Fetch categories with their active products
        const [categories] = await db.execute('SELECT * FROM product_categories WHERE is_active = 1 ORDER BY sort_order ASC, id ASC');

        const listing = await Promise.all(categories.map(async (cat) => {
            // Get total product count for this category
            const [countResult] = await db.execute(
                'SELECT COUNT(*) as total FROM products WHERE category_id = ? AND is_active = 1',
                [cat.id]
            );
            const totalProducts = countResult[0].total;

            const [products] = await db.execute(`
                SELECT p.id, p.name, p.slug, p.short_description, p.avg_rating, p.review_count,
                       COALESCE(
                           (SELECT image FROM product_options WHERE product_id = p.id AND is_active = 1 ORDER BY sort_order ASC LIMIT 1),
                           p.image_url
                       ) as image,
                       (SELECT title FROM product_options WHERE product_id = p.id AND is_active = 1 ORDER BY sort_order ASC LIMIT 1) as option_title,
                       (SELECT age_range FROM product_options WHERE product_id = p.id AND is_active = 1 ORDER BY sort_order ASC LIMIT 1) as option_age_range
                FROM products p
                WHERE p.category_id = ? AND p.is_active = 1
                LIMIT ?
            `, [cat.id, String(limit)]);

            return {
                ...cat,
                total_products: totalProducts,
                products
            };
        }));

        res.json({ success: true, data: listing });
    } catch (error) {
        next(error);
    }
};

// Get Products by Category Slug (Frontend - for Category Page with Pagination)
export const getCategoryProducts = async (req, res, next) => {
    try {
        const { slug } = req.params;
        const { page = 1, limit = 9 } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        // Fetch category details
        const [categoryRows] = await db.execute('SELECT * FROM product_categories WHERE slug = ? AND is_active = 1', [slug]);
        if (categoryRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }
        const category = categoryRows[0];

        // Fetch products for this category
        const [products] = await db.execute(`
            SELECT p.id, p.name, p.slug, p.short_description, p.avg_rating, p.review_count,
                   COALESCE(
                       (SELECT image FROM product_options WHERE product_id = p.id AND is_active = 1 ORDER BY sort_order ASC LIMIT 1),
                       p.image_url
                   ) as image,
                   (SELECT title FROM product_options WHERE product_id = p.id AND is_active = 1 ORDER BY sort_order ASC LIMIT 1) as option_title,
                   (SELECT age_range FROM product_options WHERE product_id = p.id AND is_active = 1 ORDER BY sort_order ASC LIMIT 1) as option_age_range
            FROM products p
            WHERE p.category_id = ? AND p.is_active = 1
            ORDER BY p.id ASC
            LIMIT ? OFFSET ?
        `, [category.id, String(limit), String(offset)]);

        // Get total count
        const [countResult] = await db.execute(
            'SELECT COUNT(*) as total FROM products WHERE category_id = ? AND is_active = 1',
            [category.id]
        );
        const total = countResult[0].total;

        res.json({
            success: true,
            data: {
                category,
                products,
                pagination: {
                    total,
                    page: Number(page),
                    limit: Number(limit),
                    hasMore: offset + products.length < total
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get Product Details (Frontend)
export const getProductDetails = async (req, res, next) => {
    try {
        const { slug } = req.params;

        // Fetch product
        const [products] = await db.execute('SELECT * FROM products WHERE slug = ? AND is_active = 1', [slug]);
        if (products.length === 0) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const product = products[0];
        const productId = product.id;

        // Fetch related data
        const [options] = await db.execute('SELECT * FROM product_options WHERE product_id = ? AND is_active = 1 ORDER BY sort_order ASC', [productId]);
        const [highlights] = await db.execute('SELECT * FROM product_highlights WHERE product_id = ? ORDER BY sort_order ASC', [productId]);
        const [nutrients] = await db.execute('SELECT *, nutrient_name as nutrient FROM product_nutrients WHERE product_id = ? ORDER BY sort_order ASC', [productId]);
        const [reviews] = await db.execute('SELECT * FROM product_reviews WHERE product_id = ? AND is_approved = 1 ORDER BY created_at DESC', [productId]);

        // Fetch ecommerce links with platform details
        const [ecommerce_links] = await db.execute(`
            SELECT pel.url, ep.name, ep.logo_url
            FROM product_ecommerce_links pel
            JOIN ecommerce_platforms ep ON pel.platform_id = ep.id
            WHERE pel.product_id = ? AND ep.is_active = 1
        `, [productId]);

        res.json({
            success: true,
            data: {
                ...product,
                options,
                highlights,
                nutrients,
                reviews,
                ecommerce_links
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get Products by Category (Frontend - for stage navigation)
export const getProductsByCategory = async (req, res, next) => {
    try {
        const { categoryId } = req.params;

        const [products] = await db.execute(`
            SELECT p.id, p.name, p.slug, p.category_id,
                   po.title as stage_title, po.subtitle as stage_subtitle, po.age_range
            FROM products p
            LEFT JOIN product_options po ON p.id = po.product_id AND po.is_active = 1
            WHERE p.category_id = ? AND p.is_active = 1
            ORDER BY p.id ASC
        `, [categoryId]);

        res.json({ success: true, data: products });
    } catch (error) {
        next(error);
    }
};

// Manage Product Ecommerce Links
export const manageProductEcommerceLinks = async (req, res, next) => {
    const connection = await db.getConnection();
    try {
        const { id } = req.params;
        const { links, coming_soon_status } = req.body; // links: { platformId: url }, coming_soon_status: 1/0

        await connection.beginTransaction();

        // Update active/coming soon status in products table
        if (coming_soon_status !== undefined) {
            await connection.execute(
                'UPDATE products SET coming_soon_status = ? WHERE id = ?',
                [coming_soon_status ? 1 : 0, id]
            );
        }

        // Manage links
        if (links) {
            // Delete existing links for this product
            await connection.execute('DELETE FROM product_ecommerce_links WHERE product_id = ?', [id]);

            const linkEntries = Object.entries(links).map(([platformId, url]) => {
                if (url && url.trim() !== "") {
                    return [id, platformId, url];
                }
                return null;
            }).filter(entry => entry !== null);

            if (linkEntries.length > 0) {
                const insertQuery = `INSERT INTO product_ecommerce_links (product_id, platform_id, url) VALUES ?`;
                await connection.query(insertQuery, [linkEntries]);
            }
        }

        await connection.commit();
        res.json({ success: true, message: 'Product ecommerce links updated successfully' });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};
