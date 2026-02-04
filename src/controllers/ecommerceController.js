import { db } from '../configs/db.js';

// Get all ecommerce platforms
export const getEcommercePlatforms = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM ecommerce_platforms ORDER BY name ASC');
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error fetching ecommerce platforms:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Create a new ecommerce platform
export const createEcommercePlatform = async (req, res) => {
    const { name, is_active } = req.body;
    const logo_url = req.file ? `/uploads/settings/${req.file.filename}` : null; // Logo saves to 'uploads/settings' via middleware 
    // Checking middleware path usage. 
    // Usually it uploads to 'uploads' 
    // and we store relative path.

    if (!name) {
        return res.status(400).json({ message: "Platform name is required" });
    }

    try {
        const [result] = await db.query(
            'INSERT INTO ecommerce_platforms (name, logo_url, is_active) VALUES (?, ?, ?)',
            [name, logo_url, is_active ? 1 : 0]
        );
        res.status(201).json({ id: result.insertId, name, logo_url, is_active });
    } catch (error) {
        console.error("Error creating ecommerce platform:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Update an ecommerce platform
export const updateEcommercePlatform = async (req, res) => {
    const { id } = req.params;
    const { name, is_active } = req.body;
    let logo_url = req.body.logo_url; // Keep existing if not updated

    if (req.file) {
        logo_url = `/uploads/settings/${req.file.filename}`;
    }

    try {
        await db.query(
            'UPDATE ecommerce_platforms SET name = ?, logo_url = ?, is_active = ? WHERE id = ?',
            [name, logo_url, is_active ? 1 : 0, id]
        );
        res.status(200).json({ message: "Platform updated successfully" });
    } catch (error) {
        console.error("Error updating ecommerce platform:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Delete an ecommerce platform
export const deleteEcommercePlatform = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM ecommerce_platforms WHERE id = ?', [id]);
        res.status(200).json({ message: "Platform deleted successfully" });
    } catch (error) {
        console.error("Error deleting ecommerce platform:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
