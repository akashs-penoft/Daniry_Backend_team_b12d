import { db } from '../configs/db.js';

// --- Category Actions ---

// Get All Categories
export const getAllCategories = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM product_categories ORDER BY sort_order ASC, id ASC');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching product categories:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Get Category by Slug
export const getCategoryBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const [rows] = await db.execute('SELECT * FROM product_categories WHERE slug = ?', [slug]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Category not found' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching product category:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Create Category
export const createCategory = async (req, res) => {
    try {
        const { name, slug, description, is_active, display_mode } = req.body;

        if (!name || !slug) {
            return res.status(400).json({ message: 'Name and slug are required' });
        }

        const [result] = await db.execute(
            'INSERT INTO product_categories (name, slug, description, is_active, display_mode) VALUES (?, ?, ?, ?, ?)',
            [name, slug, description || null, is_active ?? 1, display_mode || 'normal']
        );

        res.status(201).json({ message: 'Category created successfully', id: result.insertId });
    } catch (error) {
        console.error('Error creating product category:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Slug must be unique' });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Update Category
export const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, slug, description, is_active, display_mode } = req.body;

        const [existing] = await db.execute('SELECT id FROM product_categories WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Category not found' });
        }

        await db.execute(
            'UPDATE product_categories SET name = ?, slug = ?, description = ?, is_active = ?, display_mode = ? WHERE id = ?',
            [name, slug, description, is_active ?? 1, display_mode || 'normal', id]
        );

        res.json({ message: 'Category updated successfully' });
    } catch (error) {
        console.error('Error updating product category:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Slug must be unique' });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Delete Category (Soft delete is preferred but per schema we just disable/enable. 
// However, the request says full CRUD, so we implement delete as well, but can use is_active)
export const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if category has products
        const [products] = await db.execute('SELECT id FROM products WHERE category_id = ? LIMIT 1', [id]);
        if (products.length > 0) {
            return res.status(400).json({ message: 'Cannot delete category with associated products. Disable it instead.' });
        }

        const [result] = await db.execute('DELETE FROM product_categories WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Category not found' });
        }

        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        console.error('Error deleting product category:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Reorder Categories
export const reorderCategories = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { categories } = req.body; // Array of { id, sort_order }

        if (!categories || !Array.isArray(categories)) {
            return res.status(400).json({ message: 'Invalid categories array' });
        }

        await connection.beginTransaction();

        for (const cat of categories) {
            await connection.execute(
                'UPDATE product_categories SET sort_order = ? WHERE id = ?',
                [cat.sort_order, cat.id]
            );
        }

        await connection.commit();
        res.json({ message: 'Categories reordered successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Error reordering categories:', error);
        return res.status(500).json({ message: 'Internal server error' });
    } finally {
        connection.release();
    }
};
