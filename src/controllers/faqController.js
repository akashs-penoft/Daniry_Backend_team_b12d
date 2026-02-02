import { db } from '../configs/db.js';
import fs from 'fs';
import path from 'path';

// --- Public Actions ---

// Get FAQs (Frontend) - Filter by page and/or category
export const getFAQs = async (req, res) => {
    try {
        const { page, category, category_id } = req.query;
        let query = 'SELECT * FROM faqs WHERE is_active = 1';
        const params = [];

        if (page) {
            query += ' AND page = ?';
            params.push(page);
        }

        // Support both query param types if needed, but preference to category_id
        if (category_id) {
            query += ' AND category_id = ?';
            params.push(category_id);
        }

        query += ' ORDER BY sort_order ASC, created_at DESC';

        const [rows] = await db.execute(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching FAQs:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// --- Category Actions ---

// Get All Categories (Public/Admin)
export const getAllCategories = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM faq_categories ORDER BY sort_order ASC');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching FAQ categories:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Get Category by ID
export const getCategoryById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.execute('SELECT * FROM faq_categories WHERE id = ?', [id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Category not found' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching FAQ category:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Create Category
export const createCategory = async (req, res) => {
    try {
        const { title, slug, is_active, sort_order } = req.body;
        const image = req.file ? req.file.path.replace(/\\/g, '/') : null;

        if (!title || !slug) {
            return res.status(400).json({ message: 'Title and slug are required' });
        }

        let finalSortOrder = sort_order;
        if (finalSortOrder === undefined || finalSortOrder === null) {
            const [maxResult] = await db.execute('SELECT MAX(sort_order) as max_order FROM faq_categories');
            finalSortOrder = (maxResult[0].max_order || 0) + 1;
        }

        const [result] = await db.execute(
            'INSERT INTO faq_categories (title, slug, image_url, is_active, sort_order) VALUES (?, ?, ?, ?, ?)',
            [title, slug, image, is_active ?? 1, finalSortOrder]
        );

        res.status(201).json({ message: 'Category created successfully', id: result.insertId });
    } catch (error) {
        console.error('Error creating FAQ category:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Update Category
export const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, slug, is_active, sort_order } = req.body;
        const newImage = req.file ? req.file.path.replace(/\\/g, '/') : null;

        const [existing] = await db.execute('SELECT image_url FROM faq_categories WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Category not found' });
        }

        let query = 'UPDATE faq_categories SET title = ?, slug = ?, is_active = ?, sort_order = ?';
        const params = [title, slug, is_active ?? 1, sort_order ?? 0];

        if (newImage) {
            query += ', image_url = ?';
            params.push(newImage);

            // Delete old image
            if (existing[0].image_url) {
                const oldPath = path.resolve(existing[0].image_url);
                fs.unlink(oldPath, (err) => {
                    if (err) console.error('Error deleting old image:', err);
                });
            }
        }

        query += ' WHERE id = ?';
        params.push(id);

        await db.execute(query, params);
        res.json({ message: 'Category updated successfully' });
    } catch (error) {
        console.error('Error updating FAQ category:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Delete Category
export const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const [existing] = await db.execute('SELECT image_url FROM faq_categories WHERE id = ?', [id]);

        if (existing.length === 0) {
            return res.status(404).json({ message: 'Category not found' });
        }

        await db.execute('DELETE FROM faq_categories WHERE id = ?', [id]);

        if (existing[0].image_url) {
            const oldPath = path.resolve(existing[0].image_url);
            fs.unlink(oldPath, (err) => {
                if (err) console.error('Error deleting category image:', err);
            });
        }

        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        console.error('Error deleting FAQ category:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Reorder Categories
export const reorderCategories = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { orders } = req.body; // Array of { id, sort_order }

        if (!orders || !Array.isArray(orders)) {
            return res.status(400).json({ message: 'Orders array is required' });
        }

        await connection.beginTransaction();

        for (const order of orders) {
            await connection.execute(
                'UPDATE faq_categories SET sort_order = ? WHERE id = ?',
                [order.sort_order, order.id]
            );
        }

        await connection.commit();
        res.json({ message: 'Categories reordered successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Error reordering FAQ categories:', error);
        return res.status(500).json({ message: 'Internal server error' });
    } finally {
        connection.release();
    }
};

// --- Admin Actions ---

// Get All FAQs (Admin Dashboard)
export const getAllFAQs = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM faqs ORDER BY sort_order ASC');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching FAQs for admin:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Create FAQ
export const createFAQ = async (req, res) => {
    try {
        const { question, answer, category, category_id, page, is_active, sort_order } = req.body;

        if (!question || !answer) {
            return res.status(400).json({ message: 'Question and answer are required' });
        }

        // If sort_order is not provided, get max + 1
        let finalSortOrder = sort_order;
        if (finalSortOrder === undefined || finalSortOrder === null) {
            const [maxResult] = await db.execute('SELECT MAX(sort_order) as max_order FROM faqs');
            finalSortOrder = (maxResult[0].max_order || 0) + 1;
        }

        const [result] = await db.execute(
            'INSERT INTO faqs (question, answer, category_id, page, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
            [question, answer, category_id || category || null, page || null, is_active ?? 1, finalSortOrder]
        );

        res.status(201).json({
            message: 'FAQ created successfully',
            id: result.insertId
        });
    } catch (error) {
        console.error('Error creating FAQ:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Update FAQ
export const updateFAQ = async (req, res) => {
    try {
        const { id } = req.params;
        const { question, answer, category, category_id, page, is_active, sort_order } = req.body;

        // Check if FAQ exists
        const [existing] = await db.execute('SELECT * FROM faqs WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'FAQ not found' });
        }

        const currentFaq = existing[0];

        await db.execute(
            'UPDATE faqs SET question = ?, answer = ?, category_id = ?, page = ?, is_active = ?, sort_order = ? WHERE id = ?',
            [
                question !== undefined ? question : currentFaq.question,
                answer !== undefined ? answer : currentFaq.answer,
                (category_id !== undefined ? category_id : (category !== undefined ? category : currentFaq.category_id)),
                page !== undefined ? page : currentFaq.page,
                is_active !== undefined ? is_active : currentFaq.is_active,
                sort_order !== undefined ? sort_order : currentFaq.sort_order,
                id
            ]
        );

        res.json({ message: 'FAQ updated successfully' });
    } catch (error) {
        console.error('Error updating FAQ:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Delete FAQ
export const deleteFAQ = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await db.execute('DELETE FROM faqs WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'FAQ not found' });
        }

        res.json({ message: 'FAQ deleted successfully' });
    } catch (error) {
        console.error('Error deleting FAQ:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Reorder FAQs (Bulk)
export const reorderFAQs = async (req, res) => {
    try {
        const { orders } = req.body; // Array of { id, sort_order }

        if (!Array.isArray(orders)) {
            return res.status(400).json({ message: 'Invalid data format' });
        }

        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            for (const item of orders) {
                await connection.execute(
                    'UPDATE faqs SET sort_order = ? WHERE id = ?',
                    [item.sort_order, item.id]
                );
            }
            await connection.commit();
            res.json({ message: 'FAQs reordered successfully' });
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error reordering FAQs:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
