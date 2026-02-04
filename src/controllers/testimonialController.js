import { db } from '../configs/db.js';

// --- Public Actions ---

// Submit Testimonial (Frontend)
export const submitTestimonial = async (req, res, next) => {
    try {
        const { name, email, content, rating } = req.body;
        const imageUrl = req.file ? `/uploads/testimonials/${req.file.filename}` : null;

        if (!name || !content || !rating) {
            return res.status(400).json({ success: false, message: 'Name, content and rating are required' });
        }

        // Get max display_order and add 1
        const [maxOrder] = await db.execute('SELECT MAX(display_order) as max_order FROM testimonials');
        const nextOrder = (maxOrder[0].max_order || 0) + 1;

        await db.execute(
            'INSERT INTO testimonials (name, email, content, rating, image_url, display_order, is_approved) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, email || null, content, rating, imageUrl, nextOrder, 0] // Default to not approved
        );

        res.status(201).json({
            success: true,
            message: 'Testimonial submitted successfully. It will be visible after admin approval.'
        });
    } catch (error) {
        next(error);
    }
};

// Get Approved Testimonials (Frontend)
export const getApprovedTestimonials = async (req, res, next) => {
    try {
        const { page = 1, limit = 4 } = req.query;
        const offset = (page - 1) * limit;

        const [rows] = await db.execute(
            'SELECT id, name, content, rating, image_url FROM testimonials WHERE is_approved = 1 ORDER BY created_at DESC LIMIT ? OFFSET ?',
            [String(limit), String(offset)]
        );

        // Get total count for frontend to know if there's more
        const [totalRows] = await db.execute('SELECT COUNT(*) as total FROM testimonials WHERE is_approved = 1');
        const total = totalRows[0].total;

        res.json({
            success: true,
            data: rows,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                hasMore: offset + rows.length < total
            }
        });
    } catch (error) {
        next(error);
    }
};

// --- Admin Actions ---

// Get All Testimonials (Admin Dashboard)
export const getAllTestimonials = async (req, res, next) => {
    try {
        const [rows] = await db.execute('SELECT * FROM testimonials ORDER BY created_at DESC');
        res.json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};

// Toggle Approval Status
export const toggleApproval = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { is_approved } = req.body;

        await db.execute(
            'UPDATE testimonials SET is_approved = ? WHERE id = ?',
            [is_approved ? 1 : 0, id]
        );

        res.json({ success: true, message: `Testimonial ${is_approved ? 'approved' : 'hidden'} successfully` });
    } catch (error) {
        next(error);
    }
};

// Update Testimonial Order (Bulk)
export const updateTestimonialOrder = async (req, res, next) => {
    try {
        const { testimonials } = req.body; // Array of { id, display_order }

        if (!Array.isArray(testimonials)) {
            return res.status(400).json({ success: false, message: 'Invalid data format' });
        }

        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            for (const item of testimonials) {
                await connection.execute(
                    'UPDATE testimonials SET display_order = ? WHERE id = ?',
                    [item.display_order, item.id]
                );
            }
            await connection.commit();
            res.json({ success: true, message: 'Order updated successfully' });
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    } catch (error) {
        next(error);
    }
};

// Delete Testimonial
export const deleteTestimonial = async (req, res, next) => {
    try {
        const { id } = req.params;
        await db.execute('DELETE FROM testimonials WHERE id = ?', [id]);
        res.json({ success: true, message: 'Testimonial deleted successfully' });
    } catch (error) {
        next(error);
    }
};

// Get Average Rating (Frontend)
export const getAverageRating = async (req, res, next) => {
    try {
        const [rows] = await db.execute(
            'SELECT AVG(rating) as average_rating, COUNT(id) as total_testimonials FROM testimonials WHERE is_approved = 1'
        );
        const { average_rating, total_testimonials } = rows[0];
        res.json({
            success: true,
            data: {
                average_rating: average_rating ? parseFloat(average_rating).toFixed(1) : 0,
                total_testimonials: total_testimonials || 0
            }
        });
    } catch (error) {
        next(error);
    }
};
