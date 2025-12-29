/**
 * Asset Management Service
 * Handles all asset management operations: assets, categories, depreciation, maintenance, disposals
 */

const { parseDatabaseUrl } = require('../utils/poolManager');
const { Pool } = require('pg');
const crypto = require('crypto');

// Generate UUID v4
function generateUUID() {
  return crypto.randomUUID();
}

/**
 * Get agency database connection
 */
async function getAgencyConnection(agencyDatabase) {
  const { host, port, user, password } = parseDatabaseUrl();
  const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
  const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
  const client = await agencyPool.connect();
  // Attach pool to client for cleanup
  client.pool = agencyPool;
  return client;
}

/**
 * Get all assets
 */
async function getAssets(agencyDatabase, agencyId, filters = {}) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    let query = `
      SELECT 
        a.*,
        ac.name as category_name,
        ac.code as category_code,
        al.name as location_name,
        al.code as location_code,
        u.email as assigned_to_email
      FROM public.assets a
      LEFT JOIN public.asset_categories ac ON a.category_id = ac.id
      LEFT JOIN public.asset_locations al ON a.location_id = al.id
      LEFT JOIN public.users u ON a.assigned_to = u.id
      WHERE a.agency_id = $1
    `;
    const params = [agencyId];
    let paramIndex = 2;

    if (filters.category_id) {
      query += ` AND a.category_id = $${paramIndex}`;
      params.push(filters.category_id);
      paramIndex++;
    }

    if (filters.status) {
      query += ` AND a.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.location_id) {
      query += ` AND a.location_id = $${paramIndex}`;
      params.push(filters.location_id);
      paramIndex++;
    }

    if (filters.search) {
      query += ` AND (a.name ILIKE $${paramIndex} OR a.asset_number ILIKE $${paramIndex} OR a.serial_number ILIKE $${paramIndex})`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    query += ' ORDER BY a.created_at DESC';

    if (filters.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
    }

    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('[Asset Service] Error fetching assets:', error);
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return [];
    }
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Asset Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Asset Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Get a single asset by ID
 */
async function getAssetById(agencyDatabase, agencyId, assetId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `SELECT 
        a.*,
        ac.name as category_name,
        ac.code as category_code,
        al.name as location_name,
        al.code as location_code,
        u.email as assigned_to_email
      FROM public.assets a
      LEFT JOIN public.asset_categories ac ON a.category_id = ac.id
      LEFT JOIN public.asset_locations al ON a.location_id = al.id
      LEFT JOIN public.users u ON a.assigned_to = u.id
      WHERE a.id = $1 AND a.agency_id = $2`,
      [assetId, agencyId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('[Asset Service] Error in operation:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Asset Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Asset Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Create a new asset
 */
async function createAsset(agencyDatabase, assetData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `INSERT INTO public.assets (
        id, agency_id, asset_number, name, description, category_id, purchase_date,
        purchase_cost, current_value, serial_number, location_id, status,
        assigned_to, warranty_end_date, condition_status, model_number, manufacturer,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())
      RETURNING *`,
      [
        generateUUID(),
        assetData.agency_id,
        assetData.asset_number || assetData.asset_tag,
        assetData.name,
        assetData.description || null,
        assetData.category_id || null,
        assetData.purchase_date || null,
        assetData.purchase_cost || assetData.purchase_price || 0,
        assetData.current_value || assetData.purchase_cost || assetData.purchase_price || 0,
        assetData.serial_number || null,
        assetData.location_id || null,
        assetData.status || 'active',
        assetData.assigned_to || null,
        assetData.warranty_end_date || assetData.warranty_expiry_date || null,
        assetData.condition_status || 'good',
        assetData.model_number || null,
        assetData.manufacturer || null,
      ]
    );
    return result.rows[0];
  } catch (error) {
    console.error('[Asset Service] Error creating asset:', error);
    throw error;
  } finally {
    if (client) {
      client.release().catch(err => console.error('[Asset Service] Error releasing client:', err));
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Asset Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Update an asset
 */
async function updateAsset(agencyDatabase, agencyId, assetId, assetData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const updates = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = ['name', 'description', 'category_id', 'purchase_date', 'purchase_cost',
                          'current_value', 'serial_number', 'location_id', 'status', 'assigned_to',
                          'warranty_end_date', 'condition_status', 'model_number', 'manufacturer'];
    
    for (const field of allowedFields) {
      if (assetData[field] !== undefined) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(assetData[field]);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    updates.push(`updated_at = NOW()`);
    values.push(assetId, agencyId);

    const query = `
      UPDATE public.assets 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND agency_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await client.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error('Asset not found');
    }

    return result.rows[0];
  } catch (error) {
    console.error('[Asset Service] Error in operation:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Asset Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Asset Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Get all asset categories
 */
async function getAssetCategories(agencyDatabase, agencyId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      'SELECT * FROM public.asset_categories WHERE agency_id = $1 ORDER BY name ASC',
      [agencyId]
    );
    return result.rows;
  } catch (error) {
    console.error('[Asset Service] Error fetching assets:', error);
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return [];
    }
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Asset Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Asset Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Create an asset category
 */
async function createAssetCategory(agencyDatabase, categoryData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `INSERT INTO public.asset_categories (
        id, agency_id, parent_id, code, name, description, depreciation_method,
        default_useful_life_years, default_depreciation_rate, is_active,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING *`,
      [
        generateUUID(),
        categoryData.agency_id,
        categoryData.parent_id || null,
        categoryData.code,
        categoryData.name,
        categoryData.description || null,
        categoryData.depreciation_method || 'straight_line',
        categoryData.default_useful_life_years || null,
        categoryData.default_depreciation_rate || null,
        categoryData.is_active !== false,
      ]
    );
    return result.rows[0];
  } catch (error) {
    console.error('[Asset Service] Error in operation:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Asset Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Asset Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Get all asset locations
 */
async function getAssetLocations(agencyDatabase, agencyId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      'SELECT * FROM public.asset_locations WHERE agency_id = $1 ORDER BY name ASC',
      [agencyId]
    );
    return result.rows;
  } catch (error) {
    console.error('[Asset Service] Error fetching assets:', error);
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return [];
    }
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Asset Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Asset Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Create an asset location
 */
async function createAssetLocation(agencyDatabase, locationData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `INSERT INTO public.asset_locations (
        id, agency_id, code, name, address, building, floor, room,
        contact_person, phone, email, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING *`,
      [
        generateUUID(),
        locationData.agency_id,
        locationData.code,
        locationData.name,
        locationData.address || null,
        locationData.building || null,
        locationData.floor || null,
        locationData.room || null,
        locationData.contact_person || null,
        locationData.phone || null,
        locationData.email || null,
        locationData.is_active !== false,
      ]
    );
    return result.rows[0];
  } catch (error) {
    console.error('[Asset Service] Error in operation:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Asset Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Asset Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Update an asset category
 */
async function updateAssetCategory(agencyDatabase, categoryId, categoryData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const updates = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = [
      'parent_id', 'code', 'name', 'description', 'depreciation_method',
      'default_useful_life_years', 'default_depreciation_rate', 'is_active'
    ];
    
    for (const field of allowedFields) {
      if (categoryData[field] !== undefined) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(categoryData[field]);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    updates.push(`updated_at = NOW()`);
    values.push(categoryId, categoryData.agency_id);

    const query = `
      UPDATE public.asset_categories 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND agency_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await client.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error('Asset category not found');
    }

    return result.rows[0];
  } catch (error) {
    console.error('[Asset Service] Error updating asset category:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Asset Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Asset Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Delete an asset category
 */
async function deleteAssetCategory(agencyDatabase, agencyId, categoryId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    // Check if category has child categories
    const childCheck = await client.query(
      'SELECT COUNT(*) as count FROM public.asset_categories WHERE parent_id = $1 AND agency_id = $2',
      [categoryId, agencyId]
    );
    
    if (parseInt(childCheck.rows[0].count) > 0) {
      throw new Error('Cannot delete category with child categories');
    }

    // Check if category is used by any assets
    const assetCheck = await client.query(
      'SELECT COUNT(*) as count FROM public.assets WHERE category_id = $1 AND agency_id = $2',
      [categoryId, agencyId]
    );
    
    if (parseInt(assetCheck.rows[0].count) > 0) {
      throw new Error('Cannot delete category that is assigned to assets');
    }

    const result = await client.query(
      'DELETE FROM public.asset_categories WHERE id = $1 AND agency_id = $2 RETURNING id',
      [categoryId, agencyId]
    );
    
    return result.rows.length > 0;
  } catch (error) {
    console.error('[Asset Service] Error deleting asset category:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Asset Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Asset Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Update an asset location
 */
async function updateAssetLocation(agencyDatabase, locationId, locationData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const updates = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = [
      'code', 'name', 'address', 'building', 'floor', 'room',
      'contact_person', 'phone', 'email', 'is_active'
    ];
    
    for (const field of allowedFields) {
      if (locationData[field] !== undefined) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(locationData[field]);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    updates.push(`updated_at = NOW()`);
    values.push(locationId, locationData.agency_id);

    const query = `
      UPDATE public.asset_locations 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND agency_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await client.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error('Asset location not found');
    }

    return result.rows[0];
  } catch (error) {
    console.error('[Asset Service] Error updating asset location:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Asset Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Asset Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Delete an asset location
 */
async function deleteAssetLocation(agencyDatabase, agencyId, locationId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    // Check if location is used by any assets
    const assetCheck = await client.query(
      'SELECT COUNT(*) as count FROM public.assets WHERE location_id = $1 AND agency_id = $2',
      [locationId, agencyId]
    );
    
    if (parseInt(assetCheck.rows[0].count) > 0) {
      throw new Error('Cannot delete location that is assigned to assets');
    }

    const result = await client.query(
      'DELETE FROM public.asset_locations WHERE id = $1 AND agency_id = $2 RETURNING id',
      [locationId, agencyId]
    );
    
    return result.rows.length > 0;
  } catch (error) {
    console.error('[Asset Service] Error deleting asset location:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Asset Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Asset Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Get all depreciation records (with optional filters)
 */
async function getAllDepreciation(agencyDatabase, agencyId, filters = {}) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    let query = `
      SELECT 
        d.*,
        a.name as asset_name,
        a.asset_number,
        u.email as posted_by_email
      FROM public.asset_depreciation d
      LEFT JOIN public.assets a ON d.asset_id = a.id
      LEFT JOIN public.users u ON d.posted_by = u.id
      WHERE d.agency_id = $1
    `;
    const params = [agencyId];
    let paramIndex = 2;

    if (filters.asset_id) {
      query += ` AND d.asset_id = $${paramIndex}`;
      params.push(filters.asset_id);
      paramIndex++;
    }

    if (filters.is_posted !== undefined) {
      query += ` AND d.is_posted = $${paramIndex}`;
      params.push(filters.is_posted);
      paramIndex++;
    }

    if (filters.depreciation_method) {
      query += ` AND d.depreciation_method = $${paramIndex}`;
      params.push(filters.depreciation_method);
      paramIndex++;
    }

    if (filters.date_from) {
      query += ` AND d.depreciation_date >= $${paramIndex}`;
      params.push(filters.date_from);
      paramIndex++;
    }

    if (filters.date_to) {
      query += ` AND d.depreciation_date <= $${paramIndex}`;
      params.push(filters.date_to);
      paramIndex++;
    }

    if (filters.search) {
      query += ` AND (a.name ILIKE $${paramIndex} OR a.asset_number ILIKE $${paramIndex})`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    query += ` ORDER BY d.depreciation_date DESC, d.created_at DESC`;

    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('[Asset Service] Error fetching depreciation:', error);
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return [];
    }
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Asset Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Asset Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Get depreciation records for an asset
 */
async function getAssetDepreciation(agencyDatabase, agencyId, assetId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `SELECT * FROM public.asset_depreciation 
       WHERE agency_id = $1 AND asset_id = $2 
       ORDER BY depreciation_date DESC`,
      [agencyId, assetId]
    );
    return result.rows;
  } catch (error) {
    console.error('[Asset Service] Error fetching assets:', error);
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return [];
    }
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Asset Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Asset Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Create a depreciation record
 */
async function createDepreciation(agencyDatabase, depreciationData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `INSERT INTO public.asset_depreciation (
        id, agency_id, asset_id, depreciation_date, period_start, period_end,
        depreciation_amount, accumulated_depreciation, book_value,
        depreciation_method, is_posted, journal_entry_id, posted_at, posted_by,
        notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
      RETURNING *`,
      [
        generateUUID(),
        depreciationData.agency_id,
        depreciationData.asset_id,
        depreciationData.depreciation_date,
        depreciationData.period_start,
        depreciationData.period_end,
        depreciationData.depreciation_amount,
        depreciationData.accumulated_depreciation,
        depreciationData.book_value,
        depreciationData.depreciation_method || 'straight_line',
        depreciationData.is_posted || false,
        depreciationData.journal_entry_id || null,
        depreciationData.is_posted ? new Date() : null,
        depreciationData.is_posted ? userId : null,
        depreciationData.notes || null,
      ]
    );
    return result.rows[0];
  } catch (error) {
    console.error('[Asset Service] Error creating depreciation:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Asset Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Asset Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Update a depreciation record
 */
async function updateDepreciation(agencyDatabase, agencyId, depreciationId, depreciationData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const updates = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = [
      'depreciation_date', 'period_start', 'period_end',
      'depreciation_amount', 'accumulated_depreciation', 'book_value',
      'depreciation_method', 'is_posted', 'journal_entry_id', 'notes'
    ];
    
    for (const field of allowedFields) {
      if (depreciationData[field] !== undefined) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(depreciationData[field]);
        paramIndex++;
      }
    }

    // Handle posted_at and posted_by when is_posted changes
    if (depreciationData.is_posted !== undefined) {
      if (depreciationData.is_posted) {
        updates.push(`posted_at = NOW()`);
        updates.push(`posted_by = $${paramIndex}`);
        values.push(userId);
        paramIndex++;
      } else {
        updates.push(`posted_at = NULL`);
        updates.push(`posted_by = NULL`);
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    updates.push(`updated_at = NOW()`);
    values.push(depreciationId, agencyId);

    const query = `
      UPDATE public.asset_depreciation 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND agency_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await client.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error('Depreciation record not found');
    }

    return result.rows[0];
  } catch (error) {
    console.error('[Asset Service] Error updating depreciation:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Asset Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Asset Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Delete a depreciation record
 */
async function deleteDepreciation(agencyDatabase, agencyId, depreciationId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    // Check if already posted
    const checkResult = await client.query(
      'SELECT is_posted FROM public.asset_depreciation WHERE id = $1 AND agency_id = $2',
      [depreciationId, agencyId]
    );

    if (checkResult.rows.length === 0) {
      throw new Error('Depreciation record not found');
    }

    if (checkResult.rows[0].is_posted) {
      throw new Error('Cannot delete posted depreciation record');
    }

    const result = await client.query(
      'DELETE FROM public.asset_depreciation WHERE id = $1 AND agency_id = $2 RETURNING id',
      [depreciationId, agencyId]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('[Asset Service] Error deleting depreciation:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Asset Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Asset Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Get all maintenance records (with optional filters)
 */
async function getAllMaintenance(agencyDatabase, agencyId, filters = {}) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    let query = `
      SELECT 
        m.*,
        a.name as asset_name,
        a.asset_number,
        u.email as performed_by_email,
        s.name as vendor_name
      FROM public.asset_maintenance m
      LEFT JOIN public.assets a ON m.asset_id = a.id
      LEFT JOIN public.users u ON m.performed_by = u.id
      LEFT JOIN public.suppliers s ON m.vendor_id = s.id
      WHERE m.agency_id = $1
    `;
    const params = [agencyId];
    let paramIndex = 2;

    if (filters.asset_id) {
      query += ` AND m.asset_id = $${paramIndex}`;
      params.push(filters.asset_id);
      paramIndex++;
    }

    if (filters.status) {
      query += ` AND m.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.maintenance_type) {
      query += ` AND m.maintenance_type = $${paramIndex}`;
      params.push(filters.maintenance_type);
      paramIndex++;
    }

    if (filters.priority) {
      query += ` AND m.priority = $${paramIndex}`;
      params.push(filters.priority);
      paramIndex++;
    }

    if (filters.search) {
      query += ` AND (m.title ILIKE $${paramIndex} OR m.description ILIKE $${paramIndex} OR a.name ILIKE $${paramIndex})`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    query += ` ORDER BY m.scheduled_date DESC, m.created_at DESC`;

    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('[Asset Service] Error fetching maintenance:', error);
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return [];
    }
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Asset Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Asset Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Get maintenance records for an asset
 */
async function getAssetMaintenance(agencyDatabase, agencyId, assetId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `SELECT 
        m.*,
        u.email as performed_by_email,
        s.name as vendor_name
      FROM public.asset_maintenance m
      LEFT JOIN public.users u ON m.performed_by = u.id
      LEFT JOIN public.suppliers s ON m.vendor_id = s.id
      WHERE m.agency_id = $1 AND m.asset_id = $2 
      ORDER BY m.scheduled_date DESC, m.created_at DESC`,
      [agencyId, assetId]
    );
    return result.rows;
  } catch (error) {
    console.error('[Asset Service] Error fetching assets:', error);
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return [];
    }
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Asset Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Asset Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Create a maintenance record
 */
async function createMaintenance(agencyDatabase, maintenanceData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `INSERT INTO public.asset_maintenance (
        id, agency_id, asset_id, maintenance_type, title, description,
        scheduled_date, completed_date, due_date, status, priority,
        cost, vendor_id, technician, technician_contact, parts_used,
        labor_hours, notes, next_maintenance_date, performed_by, created_by,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW(), NOW())
      RETURNING *`,
      [
        generateUUID(),
        maintenanceData.agency_id,
        maintenanceData.asset_id,
        maintenanceData.maintenance_type || 'scheduled',
        maintenanceData.title || maintenanceData.description || 'Maintenance',
        maintenanceData.description || null,
        maintenanceData.scheduled_date || null,
        maintenanceData.completed_date || null,
        maintenanceData.due_date || null,
        maintenanceData.status || 'scheduled',
        maintenanceData.priority || 'normal',
        maintenanceData.cost || 0,
        maintenanceData.vendor_id || null,
        maintenanceData.technician || null,
        maintenanceData.technician_contact || null,
        maintenanceData.parts_used || null,
        maintenanceData.labor_hours || null,
        maintenanceData.notes || null,
        maintenanceData.next_maintenance_date || null,
        maintenanceData.performed_by || userId,
        userId,
      ]
    );
    return result.rows[0];
  } catch (error) {
    console.error('[Asset Service] Error creating maintenance:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Asset Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Asset Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Update a maintenance record
 */
async function updateMaintenance(agencyDatabase, agencyId, maintenanceId, maintenanceData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const updates = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = [
      'maintenance_type', 'title', 'description', 'scheduled_date', 'completed_date',
      'due_date', 'status', 'priority', 'cost', 'vendor_id', 'technician',
      'technician_contact', 'parts_used', 'labor_hours', 'notes', 'next_maintenance_date',
      'performed_by'
    ];
    
    for (const field of allowedFields) {
      if (maintenanceData[field] !== undefined) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(maintenanceData[field]);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    updates.push(`updated_at = NOW()`);
    values.push(maintenanceId, agencyId);

    const query = `
      UPDATE public.asset_maintenance 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND agency_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await client.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error('Maintenance record not found');
    }

    return result.rows[0];
  } catch (error) {
    console.error('[Asset Service] Error updating maintenance:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Asset Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Asset Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Delete a maintenance record
 */
async function deleteMaintenance(agencyDatabase, agencyId, maintenanceId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      'DELETE FROM public.asset_maintenance WHERE id = $1 AND agency_id = $2 RETURNING id',
      [maintenanceId, agencyId]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('[Asset Service] Error deleting maintenance:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Asset Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Asset Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Get all asset disposals
 */
async function getAllDisposals(agencyDatabase, agencyId, filters = {}) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    let query = `
      SELECT 
        ad.*,
        a.asset_number,
        a.name as asset_name,
        a.purchase_cost,
        a.current_value,
        u.email as created_by_email,
        approver.email as approved_by_email
      FROM public.asset_disposals ad
      LEFT JOIN public.assets a ON ad.asset_id = a.id
      LEFT JOIN public.users u ON ad.created_by = u.id
      LEFT JOIN public.users approver ON ad.approved_by = approver.id
      WHERE ad.agency_id = $1
    `;
    const params = [agencyId];
    let paramIndex = 2;

    if (filters.asset_id) {
      query += ` AND ad.asset_id = $${paramIndex}`;
      params.push(filters.asset_id);
      paramIndex++;
    }

    if (filters.disposal_type) {
      query += ` AND ad.disposal_type = $${paramIndex}`;
      params.push(filters.disposal_type);
      paramIndex++;
    }

    if (filters.approval_status) {
      query += ` AND ad.approval_status = $${paramIndex}`;
      params.push(filters.approval_status);
      paramIndex++;
    }

    if (filters.date_from) {
      query += ` AND ad.disposal_date >= $${paramIndex}`;
      params.push(filters.date_from);
      paramIndex++;
    }

    if (filters.date_to) {
      query += ` AND ad.disposal_date <= $${paramIndex}`;
      params.push(filters.date_to);
      paramIndex++;
    }

    query += ' ORDER BY ad.disposal_date DESC, ad.created_at DESC';

    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('[Asset Management Service] Error fetching disposals:', error);
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return [];
    }
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Asset Management Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Asset Management Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Get asset disposal by ID
 */
async function getDisposalById(agencyDatabase, agencyId, disposalId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `SELECT 
        ad.*,
        a.asset_number,
        a.name as asset_name,
        a.purchase_cost,
        a.current_value,
        u.email as created_by_email,
        approver.email as approved_by_email
      FROM public.asset_disposals ad
      LEFT JOIN public.assets a ON ad.asset_id = a.id
      LEFT JOIN public.users u ON ad.created_by = u.id
      LEFT JOIN public.users approver ON ad.approved_by = approver.id
      WHERE ad.id = $1 AND ad.agency_id = $2`,
      [disposalId, agencyId]
    );

    if (result.rows.length === 0) {
      throw new Error('Asset disposal not found');
    }

    return result.rows[0];
  } catch (error) {
    console.error('[Asset Management Service] Error fetching disposal:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Asset Management Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Asset Management Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Create asset disposal
 */
async function createDisposal(agencyDatabase, disposalData, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    await client.query('BEGIN');

    // Generate disposal number
    const disposalNumber = `DISP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Calculate net proceeds
    const disposalValue = parseFloat(disposalData.disposal_value || 0);
    const disposalCost = parseFloat(disposalData.disposal_cost || 0);
    const netProceeds = disposalValue - disposalCost;

    const result = await client.query(
      `INSERT INTO public.asset_disposals (
        id, agency_id, asset_id, disposal_number, disposal_date,
        disposal_type, disposal_reason, disposal_value, buyer_name,
        buyer_contact, disposal_method, approval_status, disposal_cost,
        net_proceeds, notes, document_url, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        generateUUID(),
        disposalData.agency_id,
        disposalData.asset_id,
        disposalNumber,
        disposalData.disposal_date,
        disposalData.disposal_type,
        disposalData.disposal_reason || null,
        disposalValue,
        disposalData.buyer_name || null,
        disposalData.buyer_contact || null,
        disposalData.disposal_method || null,
        disposalData.approval_status || 'pending',
        disposalCost,
        netProceeds,
        disposalData.notes || null,
        disposalData.document_url || null,
        userId,
      ]
    );

    // Update asset status to 'disposed'
    await client.query(
      `UPDATE public.assets 
       SET status = 'disposed', updated_at = NOW()
       WHERE id = $1 AND agency_id = $2`,
      [disposalData.asset_id, disposalData.agency_id]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Asset Management Service] Error creating disposal:', error);
    if (error.code === '23505') {
      throw new Error('Disposal number already exists');
    }
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Asset Management Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Asset Management Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Update asset disposal
 */
async function updateDisposal(agencyDatabase, agencyId, disposalId, disposalData) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    if (disposalData.disposal_date !== undefined) {
      updateFields.push(`disposal_date = $${paramIndex++}`);
      values.push(disposalData.disposal_date);
    }
    if (disposalData.disposal_type !== undefined) {
      updateFields.push(`disposal_type = $${paramIndex++}`);
      values.push(disposalData.disposal_type);
    }
    if (disposalData.disposal_reason !== undefined) {
      updateFields.push(`disposal_reason = $${paramIndex++}`);
      values.push(disposalData.disposal_reason);
    }
    if (disposalData.disposal_value !== undefined) {
      updateFields.push(`disposal_value = $${paramIndex++}`);
      values.push(disposalData.disposal_value);
    }
    if (disposalData.buyer_name !== undefined) {
      updateFields.push(`buyer_name = $${paramIndex++}`);
      values.push(disposalData.buyer_name);
    }
    if (disposalData.buyer_contact !== undefined) {
      updateFields.push(`buyer_contact = $${paramIndex++}`);
      values.push(disposalData.buyer_contact);
    }
    if (disposalData.disposal_method !== undefined) {
      updateFields.push(`disposal_method = $${paramIndex++}`);
      values.push(disposalData.disposal_method);
    }
    if (disposalData.approval_status !== undefined) {
      updateFields.push(`approval_status = $${paramIndex++}`);
      values.push(disposalData.approval_status);
    }
    if (disposalData.disposal_cost !== undefined) {
      updateFields.push(`disposal_cost = $${paramIndex++}`);
      values.push(disposalData.disposal_cost);
    }
    if (disposalData.notes !== undefined) {
      updateFields.push(`notes = $${paramIndex++}`);
      values.push(disposalData.notes);
    }
    if (disposalData.document_url !== undefined) {
      updateFields.push(`document_url = $${paramIndex++}`);
      values.push(disposalData.document_url);
    }

    // Recalculate net proceeds if disposal_value or disposal_cost changed
    if (disposalData.disposal_value !== undefined || disposalData.disposal_cost !== undefined) {
      // Get current values
      const current = await client.query(
        'SELECT disposal_value, disposal_cost FROM public.asset_disposals WHERE id = $1',
        [disposalId]
      );
      const disposalValue = disposalData.disposal_value !== undefined
        ? parseFloat(disposalData.disposal_value)
        : parseFloat(current.rows[0]?.disposal_value || 0);
      const disposalCost = disposalData.disposal_cost !== undefined
        ? parseFloat(disposalData.disposal_cost)
        : parseFloat(current.rows[0]?.disposal_cost || 0);
      const netProceeds = disposalValue - disposalCost;
      updateFields.push(`net_proceeds = $${paramIndex++}`);
      values.push(netProceeds);
    }

    if (updateFields.length === 0) {
      return await getDisposalById(agencyDatabase, agencyId, disposalId);
    }

    values.push(disposalId, agencyId);
    const result = await client.query(
      `UPDATE public.asset_disposals 
       SET ${updateFields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex} AND agency_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('Asset disposal not found');
    }

    return result.rows[0];
  } catch (error) {
    console.error('[Asset Management Service] Error updating disposal:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Asset Management Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Asset Management Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Delete asset disposal
 */
async function deleteDisposal(agencyDatabase, agencyId, disposalId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    await client.query('BEGIN');

    // Get disposal to check asset
    const disposalResult = await client.query(
      'SELECT asset_id FROM public.asset_disposals WHERE id = $1 AND agency_id = $2',
      [disposalId, agencyId]
    );

    if (disposalResult.rows.length === 0) {
      throw new Error('Asset disposal not found');
    }

    const assetId = disposalResult.rows[0].asset_id;

    // Delete disposal
    await client.query(
      'DELETE FROM public.asset_disposals WHERE id = $1 AND agency_id = $2',
      [disposalId, agencyId]
    );

    // Update asset status back to active if no other disposals exist
    const otherDisposals = await client.query(
      'SELECT COUNT(*) FROM public.asset_disposals WHERE asset_id = $1 AND id != $2',
      [assetId, disposalId]
    );

    if (parseInt(otherDisposals.rows[0].count) === 0) {
      await client.query(
        `UPDATE public.assets 
         SET status = 'active', updated_at = NOW()
         WHERE id = $1 AND agency_id = $2`,
        [assetId, agencyId]
      );
    }

    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Asset Management Service] Error deleting disposal:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Asset Management Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Asset Management Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Approve asset disposal
 */
async function approveDisposal(agencyDatabase, agencyId, disposalId, userId) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const result = await client.query(
      `UPDATE public.asset_disposals 
       SET approval_status = 'approved',
           approved_by = $1,
           approved_at = NOW(),
           updated_at = NOW()
       WHERE id = $2 AND agency_id = $3
       RETURNING *`,
      [userId, disposalId, agencyId]
    );

    if (result.rows.length === 0) {
      throw new Error('Asset disposal not found');
    }

    return result.rows[0];
  } catch (error) {
    console.error('[Asset Management Service] Error approving disposal:', error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Asset Management Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Asset Management Service] Error ending pool:', err);
      }
    }
  }
}

/**
 * Get asset reports summary
 */
async function getAssetReports(agencyDatabase, agencyId, filters = {}) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    const dateFrom = filters.date_from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const dateTo = filters.date_to || new Date().toISOString().split('T')[0];

    // Overall statistics
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT a.id) as total_assets,
        COUNT(DISTINCT CASE WHEN a.status = 'active' THEN a.id END) as active_assets,
        COUNT(DISTINCT CASE WHEN a.status = 'maintenance' THEN a.id END) as maintenance_assets,
        COUNT(DISTINCT CASE WHEN a.status = 'disposed' THEN a.id END) as disposed_assets,
        COUNT(DISTINCT ac.id) as total_categories,
        COUNT(DISTINCT al.id) as total_locations,
        COALESCE(SUM(a.purchase_cost), 0) as total_purchase_cost,
        COALESCE(SUM(a.current_value), 0) as total_current_value,
        COALESCE(SUM(ad.depreciation_amount), 0) as total_depreciation
      FROM public.assets a
      LEFT JOIN public.asset_categories ac ON a.category_id = ac.id
      LEFT JOIN public.asset_locations al ON a.location_id = al.id
      LEFT JOIN public.asset_depreciation ad ON a.id = ad.asset_id
        AND ad.posted = true
        AND ad.depreciation_date >= $2::date
        AND ad.depreciation_date <= $3::date
      WHERE a.agency_id = $1
    `;
    const statsResult = await client.query(statsQuery, [agencyId, dateFrom, dateTo]).catch(() => ({ rows: [{}] }));

    // Assets by status
    const assetsByStatusQuery = `
      SELECT 
        status,
        COUNT(*) as count,
        COALESCE(SUM(purchase_cost), 0) as total_purchase_cost,
        COALESCE(SUM(current_value), 0) as total_current_value
      FROM public.assets
      WHERE agency_id = $1
      GROUP BY status
    `;
    const assetsByStatusResult = await client.query(assetsByStatusQuery, [agencyId]).catch(() => ({ rows: [] }));

    // Assets by category
    const assetsByCategoryQuery = `
      SELECT 
        ac.id,
        ac.name,
        ac.code,
        COUNT(DISTINCT a.id) as asset_count,
        COALESCE(SUM(a.purchase_cost), 0) as total_purchase_cost,
        COALESCE(SUM(a.current_value), 0) as total_current_value
      FROM public.asset_categories ac
      LEFT JOIN public.assets a ON a.category_id = ac.id
      WHERE ac.agency_id = $1
      GROUP BY ac.id, ac.name, ac.code
      ORDER BY asset_count DESC
      LIMIT 10
    `;
    const assetsByCategoryResult = await client.query(assetsByCategoryQuery, [agencyId]).catch(() => ({ rows: [] }));

    // Depreciation summary
    const depreciationQuery = `
      SELECT 
        DATE_TRUNC('month', depreciation_date) as month,
        COUNT(*) as record_count,
        COALESCE(SUM(depreciation_amount), 0) as total_depreciation
      FROM public.asset_depreciation
      WHERE agency_id = $1
        AND depreciation_date >= $2::date
        AND depreciation_date <= $3::date
        AND posted = true
      GROUP BY DATE_TRUNC('month', depreciation_date)
      ORDER BY month DESC
      LIMIT 12
    `;
    const depreciationResult = await client.query(depreciationQuery, [agencyId, dateFrom, dateTo]).catch(() => ({ rows: [] }));

    // Maintenance summary
    const maintenanceQuery = `
      SELECT 
        maintenance_type,
        COUNT(*) as count,
        COALESCE(SUM(cost), 0) as total_cost
      FROM public.asset_maintenance
      WHERE agency_id = $1
        AND maintenance_date >= $2::date
        AND maintenance_date <= $3::date
      GROUP BY maintenance_type
    `;
    const maintenanceResult = await client.query(maintenanceQuery, [agencyId, dateFrom, dateTo]).catch(() => ({ rows: [] }));

    // Top assets by value
    const topAssetsQuery = `
      SELECT 
        a.id,
        a.asset_number,
        a.name,
        a.purchase_cost,
        a.current_value,
        a.status,
        ac.name as category_name
      FROM public.assets a
      LEFT JOIN public.asset_categories ac ON a.category_id = ac.id
      WHERE a.agency_id = $1
      ORDER BY a.purchase_cost DESC
      LIMIT 10
    `;
    const topAssetsResult = await client.query(topAssetsQuery, [agencyId]).catch(() => ({ rows: [] }));

    return {
      summary: statsResult.rows[0] || {},
      assets_by_status: assetsByStatusResult.rows,
      assets_by_category: assetsByCategoryResult.rows,
      depreciation_trend: depreciationResult.rows,
      maintenance_summary: maintenanceResult.rows,
      top_assets: topAssetsResult.rows,
      date_range: { from: dateFrom, to: dateTo },
    };
  } catch (error) {
    console.error('[Asset Management Service] Error fetching reports:', error);
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return {
        summary: {},
        assets_by_status: [],
        assets_by_category: [],
        depreciation_trend: [],
        maintenance_summary: [],
        top_assets: [],
        date_range: { from: null, to: null },
      };
    }
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Asset Management Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Asset Management Service] Error ending pool:', err);
      }
    }
  }
}

module.exports = {
  getAssets,
  getAssetById,
  createAsset,
  updateAsset,
  getAssetCategories,
  createAssetCategory,
  updateAssetCategory,
  deleteAssetCategory,
  getAssetLocations,
  createAssetLocation,
  updateAssetLocation,
  deleteAssetLocation,
  getAllDepreciation,
  getAssetDepreciation,
  createDepreciation,
  updateDepreciation,
  deleteDepreciation,
  getAllMaintenance,
  getAssetMaintenance,
  createMaintenance,
  updateMaintenance,
  deleteMaintenance,
  getAllDisposals,
  getDisposalById,
  createDisposal,
  updateDisposal,
  deleteDisposal,
  approveDisposal,
  getAssetReports,
};

