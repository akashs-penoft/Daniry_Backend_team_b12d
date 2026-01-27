import { db } from '../configs/db.js';

// --- Public Actions ---

// Submit Testimonial (Frontend)
export const submitTestimonial = async (req, res) => {
    try {
        const { name, email, content, rating } = req.body;
        const imageUrl = req.file ? `/uploads/testimonials/${req.file.filename}` : null;

        if (!name || !content || !rating) {
            return res.status(400).json({ message: 'Name, content and rating are required' });
        }

        // Get max display_order and add 1
        const [maxOrder] = await db.execute('SELECT MAX(display_order) as max_order FROM testimonials');
        const nextOrder = (maxOrder[0].max_order || 0) + 1;

        await db.execute(
            'INSERT INTO testimonials (name, email, content, rating, image_url, display_order, is_approved) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, email || null, content, rating, imageUrl, nextOrder, 0] // Default to not approved
        );

        res.status(201).json({
            message: 'Testimonial submitted successfully. It will be visible after admin approval.'
        });
    } catch (error) {
        console.error('Error submitting testimonial:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get Approved Testimonials (Frontend)
export const getApprovedTestimonials = async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT id, name, content, rating, image_url FROM testimonials WHERE is_approved = 1 ORDER BY display_order ASC'
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching testimonials:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// --- Admin Actions ---

// Get All Testimonials (Admin Dashboard)
export const getAllTestimonials = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM testimonials ORDER BY display_order ASC');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching testimonials for admin:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Toggle Approval Status
export const toggleApproval = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_approved } = req.body;

        await db.execute(
            'UPDATE testimonials SET is_approved = ? WHERE id = ?',
            [is_approved ? 1 : 0, id]
        );

        res.json({ message: `Testimonial ${is_approved ? 'approved' : 'hidden'} successfully` });
    } catch (error) {
        console.error('Error toggling approval:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Update Testimonial Order (Bulk)
export const updateTestimonialOrder = async (req, res) => {
    try {
        const { testimonials } = req.body; // Array of { id, display_order }

        if (!Array.isArray(testimonials)) {
            return res.status(400).json({ message: 'Invalid data format' });
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
            res.json({ message: 'Order updated successfully' });
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Delete Testimonial
export const deleteTestimonial = async (req, res) => {
    try {
        const { id } = req.params;
        await db.execute('DELETE FROM testimonials WHERE id = ?', [id]);
        res.json({ message: 'Testimonial deleted successfully' });
    } catch (error) {
        console.error('Error deleting testimonial:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
