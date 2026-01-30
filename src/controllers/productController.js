import { db } from '../configs/db.js';

// --- Admin Actions ---

// Get All Products (Admin)
export const getAllProducts = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT p.*, c.name as category_name 
            FROM products p 
            JOIN product_categories c ON p.category_id = c.id 
            ORDER BY p.created_at DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching products:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Create Product
export const createProduct = async (req, res) => {
    try {
        const { 
            category_id, name, slug, short_description, 
            description, ingredients, has_stages, has_variants, is_active 
        } = req.body;
        const image_url = req.file ? `/uploads/products/${req.file.filename}` : null;

        if (!category_id || !name || !slug) {
            return res.status(400).json({ message: 'Category, name, and slug are required' });
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

        res.status(201).json({ message: 'Product created successfully', id: result.insertId });
    } catch (error) {
        console.error('Error creating product:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Slug must be unique' });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Update Product
export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            category_id, name, slug, short_description, 
            description, ingredients, has_stages, has_variants, is_active 
        } = req.body;
        
        const [existing] = await db.execute('SELECT * FROM products WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
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

        res.json({ message: 'Product updated successfully' });
    } catch (error) {
        console.error('Error updating product:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Slug must be unique' });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Delete Product
export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        // Note: Related data in product_options, product_highlights, etc. should be handled.
        // If the DB has ON DELETE CASCADE, it's fine. If not, we need to handle it.
        // Let's assume we handle it here or have CASCADE.
        
        const [result] = await db.execute('DELETE FROM products WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// --- Product Components Actions (Options, Highlights, Nutrients) ---

// Get Product Components (Admin)
export const getProductComponents = async (req, res) => {
    try {
        const { id } = req.params;
        
        const [options] = await db.execute('SELECT * FROM product_options WHERE product_id = ? ORDER BY sort_order ASC', [id]);
        const [highlights] = await db.execute('SELECT * FROM product_highlights WHERE product_id = ? ORDER BY sort_order ASC', [id]);
        const [nutrients] = await db.execute('SELECT *, nutrient_name as nutrient FROM product_nutrients WHERE product_id = ? ORDER BY sort_order ASC', [id]);

        res.json({ options, highlights, nutrients });
    } catch (error) {
        console.error('Error fetching product components:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Manage Product Options (Bulk update/replace)
export const manageProductOptions = async (req, res) => {
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
        res.json({ message: 'Product options updated successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Error managing product options:', error);
        return res.status(500).json({ message: 'Internal server error' });
    } finally {
        connection.release();
    }
};

// Manage Product Highlights
export const manageProductHighlights = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { id } = req.params;
        const { highlights } = req.body;

        await connection.beginTransaction();
        await connection.execute('DELETE FROM product_highlights WHERE product_id = ?', [id]);

        if (highlights && highlights.length > 0) {
            const insertQuery = `INSERT INTO product_highlights (product_id, highlight, sort_order) VALUES ?`;
            const values = highlights.map(h => [id, h.highlight || null, h.sort_order || 0]);
            await connection.query(insertQuery, [values]);
        }

        await connection.commit();
        res.json({ message: 'Product highlights updated successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Error managing product highlights:', error);
        return res.status(500).json({ message: 'Internal server error' });
    } finally {
        connection.release();
    }
};

// Manage Product Nutrients
export const manageProductNutrients = async (req, res) => {
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
        res.json({ message: 'Product nutrients updated successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Error managing product nutrients:', error);
        return res.status(500).json({ message: 'Internal server error' });
    } finally {
        connection.release();
    }
};

// --- Review Actions ---

// Add Review (Public)
export const addReview = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { id } = req.params; // product_id
        const { reviewer_name, rating, review } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Valid rating (1-5) is required' });
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
        res.status(201).json({ message: 'Review added successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Error adding product review:', error);
        return res.status(500).json({ message: 'Internal server error' });
    } finally {
        connection.release();
    }
};

// --- Public Actions ---

// Get Product Listing (Frontend)
export const getProductListing = async (req, res) => {
    try {
        // Fetch categories with their active products
        const [categories] = await db.execute('SELECT * FROM product_categories WHERE is_active = 1');
        
        const listing = await Promise.all(categories.map(async (cat) => {
            const [products] = await db.execute(`
                SELECT p.id, p.name, p.slug, p.short_description, p.avg_rating, p.review_count,
                       COALESCE(
                           (SELECT image FROM product_options WHERE product_id = p.id AND is_active = 1 ORDER BY sort_order ASC LIMIT 1),
                           p.image_url
                       ) as image
                FROM products p
                WHERE p.category_id = ? AND p.is_active = 1
            `, [cat.id]);
            
            return {
                ...cat,
                products
            };
        }));

        res.json(listing);
    } catch (error) {
        console.error('Error fetching product listing:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Get Product Details (Frontend)
export const getProductDetails = async (req, res) => {
    try {
        const { slug } = req.params;
        
        // Fetch product
        const [products] = await db.execute('SELECT * FROM products WHERE slug = ? AND is_active = 1', [slug]);
        if (products.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }
        
        const product = products[0];
        const productId = product.id;

        // Fetch related data
        const [options] = await db.execute('SELECT * FROM product_options WHERE product_id = ? AND is_active = 1 ORDER BY sort_order ASC', [productId]);
        const [highlights] = await db.execute('SELECT * FROM product_highlights WHERE product_id = ? ORDER BY sort_order ASC', [productId]);
        const [nutrients] = await db.execute('SELECT *, nutrient_name as nutrient FROM product_nutrients WHERE product_id = ? ORDER BY sort_order ASC', [productId]);
        const [reviews] = await db.execute('SELECT * FROM product_reviews WHERE product_id = ? AND is_approved = 1 ORDER BY created_at DESC', [productId]);

        res.json({
            ...product,
            options,
            highlights,
            nutrients,
            reviews
        });
    } catch (error) {
        console.error('Error fetching product details:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
