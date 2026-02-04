import { db } from "../configs/db.js";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getCompanyLogo = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      "SELECT value FROM settings WHERE setting_key = 'company_logo'"
    );

    if (rows.length === 0) {
      // Return a default logo if none is set in DB
      return res.json({ success: true, data: { logoPath: "/KIF-HEADER-LOGO.png" } });
    }

    res.json({ success: true, data: { logoPath: rows[0].value } });
  } catch (error) {
    next(error);
  }
};

export const updateCompanyLogo = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No logo file uploaded" });
    }

    const newLogoPath = `/uploads/settings/${req.file.filename}`;

    // 1. Get the old logo path to delete the physical file
    const [oldRows] = await db.query(
      "SELECT value FROM settings WHERE setting_key = 'company_logo'"
    );

    if (oldRows.length > 0) {
      const oldLogoPath = oldRows[0].value;
      // Convert URL path to absolute filesystem path
      const oldFilePath = path.join(__dirname, '../../', oldLogoPath);

      if (fs.existsSync(oldFilePath)) {
        try {
          fs.unlinkSync(oldFilePath);
        } catch (err) {
          // Non-critical error, just log it internally
          console.error(`Error deleting old logo file: ${err.message}`);
        }
      }
    }

    // 2. Update or Insert the new path in DB
    await db.execute(
      "INSERT INTO settings (setting_key, value) VALUES ('company_logo', ?) ON DUPLICATE KEY UPDATE value = ?",
      [newLogoPath, newLogoPath]
    );

    res.json({ success: true, message: "Logo updated successfully", data: { logoPath: newLogoPath } });
  } catch (error) {
    next(error);
  }
};
