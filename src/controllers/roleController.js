import { db } from "../configs/db.js";
import { clearAllPermissionCache } from "../middlewares/rbacMiddleware.js";

/**
 * Get all roles with permission counts
 */
export const getAllRoles = async (req, res, next) => {
    try {
        const [roles] = await db.query(`
            SELECT 
                r.id,
                r.name,
                r.description,
                r.created_at,
                COUNT(rp.permission_id) as permission_count
            FROM roles r
            LEFT JOIN role_permissions rp ON r.id = rp.role_id
            GROUP BY r.id
            ORDER BY r.name
        `);

        res.json({
            success: true,
            data: roles
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Get role by ID with all permissions
 */
export const getRoleById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const [roles] = await db.query(
            "SELECT id, name, description, created_at FROM roles WHERE id = ?",
            [id]
        );

        if (roles.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Role not found"
            });
        }

        const role = roles[0];

        // Get role permissions
        const [permissions] = await db.query(`
            SELECT p.id, p.name, p.module, p.description
            FROM permissions p
            INNER JOIN role_permissions rp ON p.id = rp.permission_id
            WHERE rp.role_id = ?
            ORDER BY p.module, p.name
        `, [id]);

        role.permissions = permissions;

        res.json({
            success: true,
            data: role
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Create a new role
 * Super Admin only
 */
export const createRole = async (req, res, next) => {
    try {
        const { name, description, permissionIds } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Role name is required"
            });
        }

        // Check if role already exists
        const [existing] = await db.query(
            "SELECT id FROM roles WHERE name = ?",
            [name]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Role with this name already exists"
            });
        }

        // Create role
        const [result] = await db.execute(
            "INSERT INTO roles (name, description) VALUES (?, ?)",
            [name, description || null]
        );

        const roleId = result.insertId;

        // Assign permissions if provided
        if (permissionIds && Array.isArray(permissionIds) && permissionIds.length > 0) {
            const permissionValues = permissionIds.map(permId => [roleId, permId]);
            await db.query(
                "INSERT INTO role_permissions (role_id, permission_id) VALUES ?",
                [permissionValues]
            );
        }

        // Clear all permission cache since role structure changed
        clearAllPermissionCache();

        res.status(201).json({
            success: true,
            message: "Role created successfully",
            data: { roleId }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Update role details and permissions
 * Super Admin only
 */
export const updateRole = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, description, permissionIds } = req.body;

        // Check if role exists
        const [existing] = await db.query("SELECT id FROM roles WHERE id = ?", [id]);

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Role not found"
            });
        }

        // Update role details
        if (name || description !== undefined) {
            const updates = [];
            const values = [];

            if (name) {
                updates.push("name = ?");
                values.push(name);
            }
            if (description !== undefined) {
                updates.push("description = ?");
                values.push(description);
            }

            values.push(id);

            await db.execute(
                `UPDATE roles SET ${updates.join(", ")} WHERE id = ?`,
                values
            );
        }

        // Update permissions if provided
        if (permissionIds && Array.isArray(permissionIds)) {
            // Remove existing permissions
            await db.execute("DELETE FROM role_permissions WHERE role_id = ?", [id]);

            // Add new permissions
            if (permissionIds.length > 0) {
                const permissionValues = permissionIds.map(permId => [id, permId]);
                await db.query(
                    "INSERT INTO role_permissions (role_id, permission_id) VALUES ?",
                    [permissionValues]
                );
            }
        }

        // Clear all permission cache
        clearAllPermissionCache();

        res.json({
            success: true,
            message: "Role updated successfully"
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Delete role
 * Super Admin only
 */
export const deleteRole = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Check if role exists
        const [existing] = await db.query("SELECT id FROM roles WHERE id = ?", [id]);

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Role not found"
            });
        }

        // Check if role is assigned to any users
        const [usersWithRole] = await db.query(
            "SELECT COUNT(*) as count FROM user_roles WHERE role_id = ?",
            [id]
        );

        if (usersWithRole[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete role. It is assigned to ${usersWithRole[0].count} user(s).`
            });
        }

        // Delete role (cascade will handle role_permissions)
        await db.execute("DELETE FROM roles WHERE id = ?", [id]);

        // Clear all permission cache
        clearAllPermissionCache();

        res.json({
            success: true,
            message: "Role deleted successfully"
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Get all permissions grouped by module
 */
export const getAllPermissions = async (req, res, next) => {
    try {
        const [permissions] = await db.query(`
            SELECT id, name, module, description
            FROM permissions
            ORDER BY module, name
        `);

        // Group permissions by module
        const groupedPermissions = permissions.reduce((acc, perm) => {
            if (!acc[perm.module]) {
                acc[perm.module] = [];
            }
            acc[perm.module].push(perm);
            return acc;
        }, {});

        res.json({
            success: true,
            data: {
                permissions,
                grouped: groupedPermissions
            }
        });

    } catch (error) {
        next(error);
    }
};
