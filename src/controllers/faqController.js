import { db } from '../configs/db.js';

// --- Public Actions ---

// Get FAQs (Frontend) - Filter by page and/or category
export const getFAQs = async (req, res) => {
    try {
        const { page, category } = req.query;
        let query = 'SELECT * FROM faqs WHERE is_active = 1';
        const params = [];

        if (page) {
            query += ' AND page = ?';
            params.push(page);
        }

        if (category) {
            query += ' AND category = ?';
            params.push(category);
        }

        query += ' ORDER BY sort_order ASC, created_at DESC';

        const [rows] = await db.execute(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching FAQs:', error);
        return res.status(500).json({ message: 'Internal server error' });
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
        const { question, answer, category, page, is_active, sort_order } = req.body;

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
            'INSERT INTO faqs (question, answer, category, page, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
            [question, answer, category || null, page || null, is_active ?? 1, finalSortOrder]
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
        const { question, answer, category, page, is_active, sort_order } = req.body;

        // Check if FAQ exists
        const [existing] = await db.execute('SELECT id FROM faqs WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'FAQ not found' });
        }

        await db.execute(
            'UPDATE faqs SET question = ?, answer = ?, category = ?, page = ?, is_active = ?, sort_order = ? WHERE id = ?',
            [
                question,
                answer,
                category || null,
                page || null,
                is_active ?? 1,
                sort_order ?? 0,
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
