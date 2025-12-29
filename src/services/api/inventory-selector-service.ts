/**
 * Standardized Inventory/Product Selector Service
 * 
 * This service provides a centralized, reliable way to fetch products/inventory items
 * for dropdowns and selectors across the entire application.
 * 
 * Key Features:
 * - Automatic agency_id filtering (multi-tenant isolation)
 * - Handles products with missing records gracefully
 * - Consistent data structure across all components
 * - Category-based filtering and stock level information
 * - Performance optimized with proper indexing
 */

import { selectRecords, selectOne } from './postgresql-service';
import { getAgencyId } from '@/utils/agencyUtils';

/**
 * Product option interface for dropdowns/selectors
 */
export interface ProductOption {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category_id: string | null;
  category_name: string | null;
  brand: string | null;
  unit_of_measure: string;
  barcode: string | null;
  image_url: string | null;
  total_stock: number; // Sum of all warehouse quantities
  available_stock: number; // Sum of all available quantities
  is_active: boolean;
}

/**
 * Options for fetching products
 */
export interface ProductFetchOptions {
  includeInactive?: boolean;  // Include inactive products (default: false)
  categoryId?: string;       // Filter by category ID
  search?: string;            // Search by name, SKU, or barcode
  inStockOnly?: boolean;      // Only show products with stock > 0
  limit?: number;             // Limit results (for pagination)
  offset?: number;            // Offset for pagination
}

/**
 * Get all products for selection dropdowns
 * Automatically filters by agency_id and handles all edge cases
 * 
 * @param agencyId - Agency ID to filter products (required for multi-tenant isolation)
 * @param options - Optional filtering options
 * @returns Array of product options for dropdowns
 * 
 * @example
 * ```typescript
 * const agencyId = await getAgencyId(profile, user?.id);
 * const products = await getProductsForSelection(agencyId, {
 *   includeInactive: false,
 *   categoryId: 'cat-123',
 *   search: 'Widget',
 *   inStockOnly: true
 * });
 * ```
 */
export async function getProductsForSelection(
  agencyId: string | null,
  options: ProductFetchOptions = {}
): Promise<ProductOption[]> {
  if (!agencyId) {
    console.warn('getProductsForSelection: No agencyId provided, returning empty array');
    return [];
  }

  const {
    includeInactive = false,
    categoryId,
    search,
    inStockOnly = false,
    limit,
    offset
  } = options;

  try {
    // Build filters
    const filters: any[] = [];
    
    // Always filter by agency_id
    filters.push({
      column: 'agency_id',
      operator: 'eq',
      value: agencyId
    });

    // Filter by active status
    if (!includeInactive) {
      filters.push({
        column: 'is_active',
        operator: 'eq',
        value: true
      });
    }

    // Filter by category
    if (categoryId) {
      filters.push({
        column: 'category_id',
        operator: 'eq',
        value: categoryId
      });
    }

    // Build query options
    const queryOptions: any = {
      filters,
      orderBy: 'name ASC'
    };

    // Add pagination if specified
    if (limit) {
      queryOptions.limit = limit;
    }
    if (offset) {
      queryOptions.offset = offset;
    }

    // Execute query
    let products = await selectRecords('products', queryOptions);

    // Apply search filter in memory
    if (search) {
      const searchLower = search.toLowerCase();
      products = products.filter((product: any) =>
        product.name?.toLowerCase().includes(searchLower) ||
        product.sku?.toLowerCase().includes(searchLower) ||
        product.barcode?.toLowerCase().includes(searchLower) ||
        product.description?.toLowerCase().includes(searchLower)
      );
    }

    // Fetch inventory levels and category names for each product
    const productOptions: ProductOption[] = await Promise.all(
      products.map(async (product: any) => {
        // Get category name if category_id exists
        let categoryName: string | null = null;
        if (product.category_id) {
          try {
            const category = await selectOne('product_categories', { id: product.category_id });
            if (category) {
              categoryName = category.name || null;
            }
          } catch (error) {
            console.warn(`Failed to fetch category for product ${product.id}:`, error);
          }
        }

        // Get inventory levels (sum across all warehouses)
        let totalStock = 0;
        let availableStock = 0;
        try {
          const inventoryLevels = await selectRecords('inventory', {
            filters: [
              { column: 'product_id', operator: 'eq', value: product.id }
            ]
          });

          totalStock = inventoryLevels.reduce((sum: number, inv: any) => {
            return sum + (parseFloat(inv.quantity) || 0);
          }, 0);

          availableStock = inventoryLevels.reduce((sum: number, inv: any) => {
            return sum + (parseFloat(inv.available_quantity) || 0);
          }, 0);
        } catch (error) {
          console.warn(`Failed to fetch inventory levels for product ${product.id}:`, error);
        }

        // Filter by stock if requested
        if (inStockOnly && availableStock <= 0) {
          return null;
        }

        return {
          id: product.id,
          sku: product.sku || '',
          name: product.name || 'Unnamed Product',
          description: product.description,
          category_id: product.category_id,
          category_name: categoryName,
          brand: product.brand,
          unit_of_measure: product.unit_of_measure || 'pcs',
          barcode: product.barcode,
          image_url: product.image_url,
          total_stock: totalStock,
          available_stock: availableStock,
          is_active: product.is_active !== false
        };
      })
    );

    // Filter out null values (from inStockOnly filter)
    return productOptions.filter((p): p is ProductOption => p !== null);
  } catch (error: any) {
    console.error('Error in getProductsForSelection:', error);
    throw new Error(`Failed to fetch products: ${error.message}`);
  }
}

/**
 * Get a single product by ID with full details including stock levels
 * 
 * @param productId - Product ID
 * @param agencyId - Agency ID to filter products (required for multi-tenant isolation)
 * @returns Product option or null if not found
 */
export async function getProductById(
  productId: string,
  agencyId: string | null
): Promise<ProductOption | null> {
  if (!agencyId) {
    console.warn('getProductById: No agencyId provided, returning null');
    return null;
  }

  try {
    const product = await selectOne('products', {
      id: productId,
      agency_id: agencyId
    });

    if (!product) {
      return null;
    }

    // Get category name
    let categoryName: string | null = null;
    if (product.category_id) {
      try {
        const category = await selectOne('product_categories', { id: product.category_id });
        if (category) {
          categoryName = category.name || null;
        }
      } catch (error) {
        console.warn(`Failed to fetch category for product ${product.id}:`, error);
      }
    }

    // Get inventory levels
    let totalStock = 0;
    let availableStock = 0;
    try {
      const inventoryLevels = await selectRecords('inventory', {
        filters: [
          { column: 'product_id', operator: 'eq', value: product.id }
        ]
      });

      totalStock = inventoryLevels.reduce((sum: number, inv: any) => {
        return sum + (parseFloat(inv.quantity) || 0);
      }, 0);

      availableStock = inventoryLevels.reduce((sum: number, inv: any) => {
        return sum + (parseFloat(inv.available_quantity) || 0);
      }, 0);
    } catch (error) {
      console.warn(`Failed to fetch inventory levels for product ${product.id}:`, error);
    }

    return {
      id: product.id,
      sku: product.sku || '',
      name: product.name || 'Unnamed Product',
      description: product.description,
      category_id: product.category_id,
      category_name: categoryName,
      brand: product.brand,
      unit_of_measure: product.unit_of_measure || 'pcs',
      barcode: product.barcode,
      image_url: product.image_url,
      total_stock: totalStock,
      available_stock: availableStock,
      is_active: product.is_active !== false
    };
  } catch (error: any) {
    console.error('Error in getProductById:', error);
    throw new Error(`Failed to fetch product: ${error.message}`);
  }
}

/**
 * Get products for selection (convenience wrapper)
 * Automatically gets agencyId from profile and user
 * 
 * @param profile - User profile from useAuth hook
 * @param userId - User ID
 * @param options - Optional filtering options
 * @returns Array of product options
 * 
 * @example
 * ```typescript
 * const { profile, user } = useAuth();
 * const products = await getProductsForSelectionAuto(profile, user?.id, {
 *   categoryId: 'cat-123',
 *   search: 'Widget',
 *   inStockOnly: true
 * });
 * ```
 */
export async function getProductsForSelectionAuto(
  profile: { agency_id?: string | null } | null | undefined,
  userId: string | null | undefined,
  options: ProductFetchOptions = {}
): Promise<ProductOption[]> {
  const agencyId = await getAgencyId(profile, userId);
  if (!agencyId) {
    return [];
  }
  return await getProductsForSelection(agencyId, options);
}

