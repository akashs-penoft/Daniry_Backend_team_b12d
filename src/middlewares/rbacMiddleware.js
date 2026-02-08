import { db } from '../configs/db.js';

/**
 * Permission Cache
 * Stores user permissions in memory to avoid repeated DB queries
 * Format: { userId: { permissions: [...], timestamp: Date } }
 */
const permissionCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get user permissions from database
 * Aggregates permissions from roles and individual user permissions
 */
async function getUserPermissions(userId, isSuperAdmin = false) {
    // Super Admin has all permissions
    if (isSuperAdmin) {
        return ['*']; // Wildcard for all permissions
    }

    // Check cache first
    const cached = permissionCache.get(userId);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        return cached.permissions;
    }

    try {
        // Get permissions from roles
        const [rolePermissions] = await db.query(`
            SELECT DISTINCT p.slug
            FROM permissions p
            INNER JOIN role_permissions rp ON p.id = rp.permission_id
            INNER JOIN user_roles ur ON rp.role_id = ur.role_id
            WHERE ur.user_id = ?
        `, [userId]);

        // Get individual user permissions (overrides)
        const [userPermissions] = await db.query(`
            SELECT p.slug, up.granted
            FROM permissions p
            INNER JOIN user_permissions up ON p.id = up.permission_id
            WHERE up.user_id = ?
        `, [userId]);

        // Combine permissions
        const permissions = new Set(rolePermissions.map(p => p.slug));

        // Apply user-specific overrides
        userPermissions.forEach(up => {
            if (up.granted) {
                permissions.add(up.slug);
            } else {
                permissions.delete(up.slug);
            }
        });

        const permissionArray = Array.from(permissions);

        // Cache the result
        permissionCache.set(userId, {
            permissions: permissionArray,
            timestamp: Date.now()
        });

        return permissionArray;

    } catch (error) {
        console.error('Error fetching user permissions:', error);
        return [];
    }
}

/**
 * Clear permission cache for a specific user
 * Call this when user roles or permissions are updated
 */
export function clearUserPermissionCache(userId) {
    permissionCache.delete(userId);
}

/**
 * Clear all permission cache
 * Call this when roles or permissions are modified globally
 */
export function clearAllPermissionCache() {
    permissionCache.clear();
}

/**
 * Authorization Middleware
 * Checks if the authenticated user has the required permission
 * 
 * @param {string} permission - Required permission (e.g., 'products.view')
 * @returns {Function} Express middleware function
 * 
 * Usage:
 *   router.get('/products', adminAuth, authorize('products.view'), getAllProducts);
 */
export function authorize(permission) {
    return async (req, res, next) => {
        try {
            // Check if user is authenticated
            if (!req.admin && !req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            const userId = req.admin?.id || req.user?.id;
            const isSuperAdmin = req.admin?.isSuperAdmin || false;

            // Get user permissions
            const permissions = await getUserPermissions(userId, isSuperAdmin);

            // Super Admin has all permissions
            if (permissions.includes('*')) {
                return next();
            }

            // Check if user has the required permission
            if (!permissions.includes(permission)) {
                return res.status(403).json({
                    success: false,
                    message: 'Insufficient permissions',
                    required: permission
                });
            }

            // Attach permissions to request for later use
            req.permissions = permissions;

            next();

        } catch (error) {
            console.error('Authorization error:', error);
            return res.status(500).json({
                success: false,
                message: 'Authorization check failed'
            });
        }
    };
}

/**
 * Check if user has any of the specified permissions
 * Useful for routes that accept multiple permission types
 * 
 * @param {string[]} permissions - Array of acceptable permissions
 * @returns {Function} Express middleware function
 */
export function authorizeAny(permissions) {
    return async (req, res, next) => {
        try {
            if (!req.admin && !req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            const userId = req.admin?.id || req.user?.id;
            const isSuperAdmin = req.admin?.isSuperAdmin || false;

            const userPermissions = await getUserPermissions(userId, isSuperAdmin);

            // Super Admin has all permissions
            if (userPermissions.includes('*')) {
                return next();
            }

            // Check if user has any of the required permissions
            const hasPermission = permissions.some(p => userPermissions.includes(p));

            if (!hasPermission) {
                return res.status(403).json({
                    success: false,
                    message: 'Insufficient permissions',
                    required: permissions
                });
            }

            req.permissions = userPermissions;
            next();

        } catch (error) {
            console.error('Authorization error:', error);
            return res.status(500).json({
                success: false,
                message: 'Authorization check failed'
            });
        }
    };
}

/**
 * Super Admin Only Middleware
 * Restricts access to Super Admin only
 */
export function superAdminOnly(req, res, next) {
    if (!req.admin?.isSuperAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Super Admin access required'
        });
    }
    next();
}
