/**
 * GraphQL Schema
 * Provides flexible data querying for the ERP system
 */

const { GraphQLObjectType, GraphQLString, GraphQLInt, GraphQLFloat, GraphQLBoolean, GraphQLList, GraphQLSchema, GraphQLID } = require('graphql');
const { parseDatabaseUrl } = require('../utils/poolManager');
const { Pool } = require('pg');

/**
 * Get agency database connection
 */
async function getAgencyConnection(agencyDatabase) {
  const { host, port, user, password } = parseDatabaseUrl();
  const agencyDbUrl = `postgresql://${user}:${password}@${host}:${port}/${agencyDatabase}`;
  const agencyPool = new Pool({ connectionString: agencyDbUrl, max: 1 });
  return await agencyPool.connect();
}

/**
 * User Type
 */
const UserType = new GraphQLObjectType({
  name: 'User',
  fields: () => ({
    id: { type: GraphQLID },
    email: { type: GraphQLString },
    is_active: { type: GraphQLBoolean },
    created_at: { type: GraphQLString },
  }),
});

/**
 * Product Type
 */
const ProductType = new GraphQLObjectType({
  name: 'Product',
  fields: () => ({
    id: { type: GraphQLID },
    sku: { type: GraphQLString },
    name: { type: GraphQLString },
    description: { type: GraphQLString },
    unit_of_measure: { type: GraphQLString },
    barcode: { type: GraphQLString },
    is_active: { type: GraphQLBoolean },
  }),
});

/**
 * Inventory Type
 */
const InventoryType = new GraphQLObjectType({
  name: 'Inventory',
  fields: () => ({
    id: { type: GraphQLID },
    product_id: { type: GraphQLID },
    warehouse_id: { type: GraphQLID },
    quantity: { type: GraphQLFloat },
    available_quantity: { type: GraphQLFloat },
    reorder_point: { type: GraphQLFloat },
    product: {
      type: ProductType,
      resolve: async (parent, args, context) => {
        const client = await getAgencyConnection(context.agencyDatabase);
        try {
          const result = await client.query('SELECT * FROM public.products WHERE id = $1', [parent.product_id]);
          return result.rows[0] || null;
        } finally {
          client.release();
          await client.client.pool.end();
        }
      },
    },
  }),
});

/**
 * Project Type
 */
const ProjectType = new GraphQLObjectType({
  name: 'Project',
  fields: () => ({
    id: { type: GraphQLID },
    name: { type: GraphQLString },
    description: { type: GraphQLString },
    status: { type: GraphQLString },
    start_date: { type: GraphQLString },
    end_date: { type: GraphQLString },
    budget: { type: GraphQLFloat },
  }),
});

/**
 * Root Query
 */
const RootQuery = new GraphQLObjectType({
  name: 'RootQueryType',
  fields: {
    // Get products
    products: {
      type: new GraphQLList(ProductType),
      args: {
        limit: { type: GraphQLInt },
        search: { type: GraphQLString },
      },
      resolve: async (parent, args, context) => {
        const client = await getAgencyConnection(context.agencyDatabase);
        try {
          let query = 'SELECT * FROM public.products WHERE agency_id = $1';
          const params = [context.agencyId];
          let paramIndex = 2;

          if (args.search) {
            query += ` AND (name ILIKE $${paramIndex} OR sku ILIKE $${paramIndex})`;
            params.push(`%${args.search}%`);
            paramIndex++;
          }

          query += ' ORDER BY created_at DESC';

          if (args.limit) {
            query += ` LIMIT $${paramIndex}`;
            params.push(args.limit);
          }

          const result = await client.query(query, params);
          return result.rows;
        } finally {
          client.release();
          await client.client.pool.end();
        }
      },
    },

    // Get inventory levels
    inventory: {
      type: new GraphQLList(InventoryType),
      args: {
        product_id: { type: GraphQLID },
        warehouse_id: { type: GraphQLID },
      },
      resolve: async (parent, args, context) => {
        const client = await getAgencyConnection(context.agencyDatabase);
        try {
          let query = 'SELECT * FROM public.inventory WHERE agency_id = $1';
          const params = [context.agencyId];
          let paramIndex = 2;

          if (args.product_id) {
            query += ` AND product_id = $${paramIndex}`;
            params.push(args.product_id);
            paramIndex++;
          }

          if (args.warehouse_id) {
            query += ` AND warehouse_id = $${paramIndex}`;
            params.push(args.warehouse_id);
            paramIndex++;
          }

          const result = await client.query(query, params);
          return result.rows;
        } finally {
          client.release();
          await client.client.pool.end();
        }
      },
    },

    // Get projects
    projects: {
      type: new GraphQLList(ProjectType),
      args: {
        status: { type: GraphQLString },
        limit: { type: GraphQLInt },
      },
      resolve: async (parent, args, context) => {
        const client = await getAgencyConnection(context.agencyDatabase);
        try {
          let query = 'SELECT * FROM public.projects WHERE agency_id = $1';
          const params = [context.agencyId];
          let paramIndex = 2;

          if (args.status) {
            query += ` AND status = $${paramIndex}`;
            params.push(args.status);
            paramIndex++;
          }

          query += ' ORDER BY created_at DESC';

          if (args.limit) {
            query += ` LIMIT $${paramIndex}`;
            params.push(args.limit);
          }

          const result = await client.query(query, params);
          return result.rows;
        } finally {
          client.release();
          await client.client.pool.end();
        }
      },
    },
  },
});

const schema = new GraphQLSchema({
  query: RootQuery,
});

module.exports = schema;
