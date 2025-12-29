/**
 * Reporting Dashboard Service
 * Aggregates data from multiple modules for comprehensive reporting
 */

const { parseDatabaseUrl } = require('../utils/poolManager');
const { Pool } = require('pg');

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
 * Get comprehensive dashboard data
 */
async function getDashboardData(agencyDatabase, agencyId, filters = {}) {
  const client = await getAgencyConnection(agencyDatabase);
  try {
    // Validate and set date range
    const dateFrom = filters.date_from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const dateTo = filters.date_to || new Date().toISOString().split('T')[0];

    // Validate date range
    if (new Date(dateFrom) > new Date(dateTo)) {
      throw new Error('Invalid date range: date_from must be before date_to');
    }

    // Execute all queries in parallel for better performance
    const [
      financialResult,
      expensesResult,
      inventoryResult,
      procurementResult,
      assetsResult,
      projectsResult,
      hrResult,
      activityResult
    ] = await Promise.all([
      // Financial Summary
      client.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.total_amount ELSE 0 END), 0) as revenue,
          COALESCE(SUM(CASE WHEN i.status = 'pending' THEN i.total_amount ELSE 0 END), 0) as pending_revenue,
          COALESCE(SUM(CASE WHEN i.status = 'overdue' THEN i.total_amount ELSE 0 END), 0) as overdue_revenue,
          COUNT(CASE WHEN i.status = 'paid' THEN 1 END) as paid_invoices,
          COUNT(CASE WHEN i.status = 'pending' THEN 1 END) as pending_invoices,
          COUNT(CASE WHEN i.status = 'overdue' THEN 1 END) as overdue_invoices
        FROM public.invoices i
        WHERE i.agency_id = $1
          AND i.issue_date >= $2::date
          AND i.issue_date <= $3::date
      `, [agencyId, dateFrom, dateTo]).catch(err => {
        console.error('[Dashboard] Financial query error:', err.message);
        return { rows: [{}] };
      }),

      // Expenses from journal entries
      client.query(`
        SELECT 
          COALESCE(SUM(jel.debit_amount), 0) as total_expenses
        FROM public.journal_entry_lines jel
        JOIN public.journal_entries je ON jel.journal_entry_id = je.id
        JOIN public.chart_of_accounts coa ON jel.account_id = coa.id
        WHERE je.agency_id = $1
          AND je.entry_date >= $2::date
          AND je.entry_date <= $3::date
          AND coa.account_type = 'expense'
      `, [agencyId, dateFrom, dateTo]).catch(err => {
        console.error('[Dashboard] Expenses query error:', err.message);
        return { rows: [{ total_expenses: 0 }] };
      }),

      // Inventory Summary
      client.query(`
        SELECT 
          COUNT(DISTINCT p.id) as total_products,
          COUNT(DISTINCT w.id) as total_warehouses,
          COALESCE(SUM(i.quantity), 0) as total_quantity,
          COALESCE(SUM(i.quantity * i.average_cost), 0) as total_stock_value,
          COUNT(DISTINCT CASE WHEN i.available_quantity <= i.reorder_point THEN i.id END) as low_stock_items
        FROM public.products p
        LEFT JOIN public.inventory i ON p.id = i.product_id
        LEFT JOIN public.warehouses w ON i.warehouse_id = w.id
        WHERE p.agency_id = $1 AND (w.agency_id = $1 OR w.id IS NULL)
      `, [agencyId]).catch(err => {
        console.error('[Dashboard] Inventory query error:', err.message);
        return { rows: [{}] };
      }),

      // Procurement Summary - Fixed to use separate queries instead of FULL OUTER JOIN
      Promise.all([
        client.query(`
          SELECT 
            COUNT(*) as total_requisitions,
            COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_requisitions
          FROM public.purchase_requisitions
          WHERE agency_id = $1
            AND created_at >= $2::date
            AND created_at <= $3::date
        `, [agencyId, dateFrom, dateTo]),
        client.query(`
          SELECT 
            COUNT(*) as total_purchase_orders,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
            COALESCE(SUM(CASE WHEN status IN ('pending', 'approved', 'partially_received') THEN total_amount ELSE 0 END), 0) as pending_po_value,
            COALESCE(SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END), 0) as completed_po_value
          FROM public.purchase_orders
          WHERE agency_id = $1
            AND created_at >= $2::date
            AND created_at <= $3::date
        `, [agencyId, dateFrom, dateTo])
      ]).then(([reqResult, poResult]) => ({
        rows: [{
          total_requisitions: reqResult.rows[0]?.total_requisitions || 0,
          approved_requisitions: reqResult.rows[0]?.approved_requisitions || 0,
          total_purchase_orders: poResult.rows[0]?.total_purchase_orders || 0,
          completed_orders: poResult.rows[0]?.completed_orders || 0,
          pending_po_value: poResult.rows[0]?.pending_po_value || 0,
          completed_po_value: poResult.rows[0]?.completed_po_value || 0,
        }]
      })).catch(err => {
        console.error('[Dashboard] Procurement query error:', err.message);
        return { rows: [{}] };
      }),

      // Assets Summary
      client.query(`
        SELECT 
          COUNT(DISTINCT a.id) as total_assets,
          COUNT(DISTINCT CASE WHEN a.status = 'active' THEN a.id END) as active_assets,
          COUNT(DISTINCT CASE WHEN a.status = 'maintenance' THEN a.id END) as maintenance_assets,
          COALESCE(SUM(a.purchase_cost), 0) as total_asset_value,
          COALESCE(SUM(a.current_value), 0) as total_current_value,
          COALESCE(SUM(ad.depreciation_amount), 0) as total_depreciation
        FROM public.assets a
        LEFT JOIN public.asset_depreciation ad ON a.id = ad.asset_id
          AND ad.posted = true
          AND ad.depreciation_date >= $2::date
          AND ad.depreciation_date <= $3::date
        WHERE a.agency_id = $1
      `, [agencyId, dateFrom, dateTo]).catch(err => {
        console.error('[Dashboard] Assets query error:', err.message);
        return { rows: [{}] };
      }),

      // Projects Summary
      client.query(`
        SELECT 
          COUNT(DISTINCT p.id) as total_projects,
          COUNT(DISTINCT CASE WHEN p.status = 'in-progress' THEN p.id END) as active_projects,
          COUNT(DISTINCT CASE WHEN p.status = 'completed' THEN p.id END) as completed_projects,
          COALESCE(SUM(p.budget), 0) as total_budget,
          COALESCE(SUM(
            CASE WHEN p.status = 'completed' AND p.end_date >= $2::date AND p.end_date <= $3::date
            THEN p.budget ELSE 0 END
          ), 0) as completed_budget
        FROM public.projects p
        WHERE p.agency_id = $1
      `, [agencyId, dateFrom, dateTo]).catch(err => {
        console.error('[Dashboard] Projects query error:', err.message);
        return { rows: [{}] };
      }),

      // HR Summary
      client.query(`
        SELECT 
          COUNT(DISTINCT ed.id) as total_employees,
          COUNT(DISTINCT CASE WHEN ed.is_active = true THEN ed.id END) as active_employees,
          COUNT(DISTINCT a.id) as attendance_records,
          COUNT(DISTINCT CASE WHEN a.status = 'present' THEN a.id END) as present_count,
          COALESCE(
            ROUND(
              (COUNT(DISTINCT CASE WHEN a.status = 'present' THEN a.id END)::numeric / 
               NULLIF(COUNT(DISTINCT a.id), 0)) * 100, 
              2
            ), 
            0
          ) as attendance_rate
        FROM public.employee_details ed
        LEFT JOIN public.attendance a ON ed.user_id = a.employee_id
          AND a.date >= $2::date
          AND a.date <= $3::date
        WHERE ed.agency_id = $1
      `, [agencyId, dateFrom, dateTo]).catch(err => {
        console.error('[Dashboard] HR query error:', err.message);
        return { rows: [{}] };
      }),

      // Recent Activity (last 7 days)
      client.query(`
        SELECT 
          'inventory' as module,
          COUNT(*) as count
        FROM public.inventory_transactions
        WHERE agency_id = $1
          AND created_at >= NOW() - INTERVAL '7 days'
        UNION ALL
        SELECT 
          'procurement' as module,
          COUNT(*) as count
        FROM public.purchase_orders
        WHERE agency_id = $1
          AND created_at >= NOW() - INTERVAL '7 days'
        UNION ALL
        SELECT 
          'assets' as module,
          COUNT(*) as count
        FROM public.asset_maintenance
        WHERE agency_id = $1
          AND created_at >= NOW() - INTERVAL '7 days'
        UNION ALL
        SELECT 
          'projects' as module,
          COUNT(*) as count
        FROM public.projects
        WHERE agency_id = $1
          AND created_at >= NOW() - INTERVAL '7 days'
      `, [agencyId]).catch(err => {
        console.error('[Dashboard] Activity query error:', err.message);
        return { rows: [] };
      })
    ]);

    // Parse and return results
    const revenue = parseFloat(financialResult.rows[0]?.revenue || 0);
    const expenses = parseFloat(expensesResult.rows[0]?.total_expenses || 0);

    return {
      financial: {
        revenue,
        pending_revenue: parseFloat(financialResult.rows[0]?.pending_revenue || 0),
        overdue_revenue: parseFloat(financialResult.rows[0]?.overdue_revenue || 0),
        expenses,
        profit: revenue - expenses,
        paid_invoices: parseInt(financialResult.rows[0]?.paid_invoices || 0, 10),
        pending_invoices: parseInt(financialResult.rows[0]?.pending_invoices || 0, 10),
        overdue_invoices: parseInt(financialResult.rows[0]?.overdue_invoices || 0, 10),
      },
      inventory: {
        total_products: parseInt(inventoryResult.rows[0]?.total_products || 0, 10),
        total_warehouses: parseInt(inventoryResult.rows[0]?.total_warehouses || 0, 10),
        total_quantity: parseFloat(inventoryResult.rows[0]?.total_quantity || 0),
        total_stock_value: parseFloat(inventoryResult.rows[0]?.total_stock_value || 0),
        low_stock_items: parseInt(inventoryResult.rows[0]?.low_stock_items || 0, 10),
      },
      procurement: {
        total_requisitions: parseInt(procurementResult.rows[0]?.total_requisitions || 0, 10),
        approved_requisitions: parseInt(procurementResult.rows[0]?.approved_requisitions || 0, 10),
        total_purchase_orders: parseInt(procurementResult.rows[0]?.total_purchase_orders || 0, 10),
        completed_orders: parseInt(procurementResult.rows[0]?.completed_orders || 0, 10),
        pending_po_value: parseFloat(procurementResult.rows[0]?.pending_po_value || 0),
        completed_po_value: parseFloat(procurementResult.rows[0]?.completed_po_value || 0),
      },
      assets: {
        total_assets: parseInt(assetsResult.rows[0]?.total_assets || 0, 10),
        active_assets: parseInt(assetsResult.rows[0]?.active_assets || 0, 10),
        maintenance_assets: parseInt(assetsResult.rows[0]?.maintenance_assets || 0, 10),
        total_asset_value: parseFloat(assetsResult.rows[0]?.total_asset_value || 0),
        total_current_value: parseFloat(assetsResult.rows[0]?.total_current_value || 0),
        total_depreciation: parseFloat(assetsResult.rows[0]?.total_depreciation || 0),
      },
      projects: {
        total_projects: parseInt(projectsResult.rows[0]?.total_projects || 0, 10),
        active_projects: parseInt(projectsResult.rows[0]?.active_projects || 0, 10),
        completed_projects: parseInt(projectsResult.rows[0]?.completed_projects || 0, 10),
        total_budget: parseFloat(projectsResult.rows[0]?.total_budget || 0),
        completed_budget: parseFloat(projectsResult.rows[0]?.completed_budget || 0),
      },
      hr: {
        total_employees: parseInt(hrResult.rows[0]?.total_employees || 0, 10),
        active_employees: parseInt(hrResult.rows[0]?.active_employees || 0, 10),
        attendance_records: parseInt(hrResult.rows[0]?.attendance_records || 0, 10),
        present_count: parseInt(hrResult.rows[0]?.present_count || 0, 10),
        attendance_rate: parseFloat(hrResult.rows[0]?.attendance_rate || 0),
      },
      recent_activity: (activityResult.rows || []).map(row => ({
        module: row.module || 'unknown',
        count: parseInt(row.count || 0, 10),
      })),
      date_range: {
        from: dateFrom,
        to: dateTo,
      },
    };
  } catch (error) {
    console.error('[Reporting Dashboard Service] Error fetching dashboard data:', error);
    
    // Return empty structure if tables don't exist or other recoverable errors
    if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('Invalid date range')) {
      const dateFrom = filters.date_from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const dateTo = filters.date_to || new Date().toISOString().split('T')[0];
      
      return {
        financial: {
          revenue: 0,
          pending_revenue: 0,
          overdue_revenue: 0,
          expenses: 0,
          profit: 0,
          paid_invoices: 0,
          pending_invoices: 0,
          overdue_invoices: 0,
        },
        inventory: {
          total_products: 0,
          total_warehouses: 0,
          total_quantity: 0,
          total_stock_value: 0,
          low_stock_items: 0,
        },
        procurement: {
          total_requisitions: 0,
          approved_requisitions: 0,
          total_purchase_orders: 0,
          completed_orders: 0,
          pending_po_value: 0,
          completed_po_value: 0,
        },
        assets: {
          total_assets: 0,
          active_assets: 0,
          maintenance_assets: 0,
          total_asset_value: 0,
          total_current_value: 0,
          total_depreciation: 0,
        },
        projects: {
          total_projects: 0,
          active_projects: 0,
          completed_projects: 0,
          total_budget: 0,
          completed_budget: 0,
        },
        hr: {
          total_employees: 0,
          active_employees: 0,
          attendance_records: 0,
          present_count: 0,
          attendance_rate: 0,
        },
        recent_activity: [],
        date_range: { from: dateFrom, to: dateTo },
      };
    }
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error('[Reporting Dashboard Service] Error releasing client:', err);
      }
    }
    if (client && client.pool) {
      try {
        await client.pool.end();
      } catch (err) {
        console.error('[Reporting Dashboard Service] Error ending pool:', err);
      }
    }
  }
}

module.exports = {
  getDashboardData,
};

