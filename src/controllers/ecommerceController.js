import { db } from '../configs/db.js';

// Get all ecommerce platforms
export const getEcommercePlatforms = async (req, res, next) => {
    try {
        const [rows] = await db.query('SELECT * FROM ecommerce_platforms ORDER BY name ASC');
        res.json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};

// Create a new ecommerce platform
export const createEcommercePlatform = async (req, res, next) => {
    try {
        const { name, is_active } = req.body;
        const logo_url = req.file ? `/uploads/settings/${req.file.filename}` : null;

        if (!name) {
            return res.status(400).json({ success: false, message: "Platform name is required" });
        }

        const [result] = await db.query(
            'INSERT INTO ecommerce_platforms (name, logo_url, is_active) VALUES (?, ?, ?)',
            [name, logo_url, is_active ? 1 : 0]
        );
        res.status(201).json({ success: true, message: "Platform created successfully", data: { id: result.insertId, name, logo_url, is_active } });
    } catch (error) {
        next(error);
    }
};

// Update an ecommerce platform
export const updateEcommercePlatform = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, is_active } = req.body;
        let logo_url = req.body.logo_url;

        if (req.file) {
            logo_url = `/uploads/settings/${req.file.filename}`;
        }

        await db.query(
            'UPDATE ecommerce_platforms SET name = ?, logo_url = ?, is_active = ? WHERE id = ?',
            [name, logo_url, is_active ? 1 : 0, id]
        );
        res.json({ success: true, message: "Platform updated successfully" });
    } catch (error) {
        next(error);
    }
};

// Delete an ecommerce platform
export const deleteEcommercePlatform = async (req, res, next) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM ecommerce_platforms WHERE id = ?', [id]);
        res.json({ success: true, message: "Platform deleted successfully" });
    } catch (error) {
        next(error);
    }
};
