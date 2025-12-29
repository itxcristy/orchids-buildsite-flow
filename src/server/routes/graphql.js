/**
 * GraphQL API Routes
 * Provides flexible GraphQL endpoint for data querying
 */

const express = require('express');
const { createHandler } = require('graphql-http/lib/use/express');
const { execute, subscribe } = require('graphql');
const schema = require('../graphql/schema');
const { authenticate, requireAgencyContext } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * GraphQL endpoint
 * POST /api/graphql
 */
router.post(
  '/',
  authenticate,
  requireAgencyContext,
  createHandler({
    schema,
    context: (req) => ({
      userId: req.raw.user.id,
      agencyId: req.raw.user.agencyId,
      agencyDatabase: req.raw.user.agencyDatabase,
    }),
    formatError: (error) => {
      console.error('[GraphQL] Error:', error);
      return {
        message: error.message,
        locations: error.locations,
        path: error.path,
      };
    },
  })
);

// GraphiQL endpoint for development
if (process.env.NODE_ENV !== 'production') {
  router.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>GraphiQL</title>
          <link href="https://unpkg.com/graphiql@3/graphiql.min.css" rel="stylesheet" />
        </head>
        <body style="margin: 0;">
          <div id="graphiql" style="height: 100vh;"></div>
          <script
            crossorigin
            src="https://unpkg.com/react@18/umd/react.production.min.js"
          ></script>
          <script
            crossorigin
            src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"
          ></script>
          <script
            crossorigin
            src="https://unpkg.com/graphiql@3/graphiql.min.js"
          ></script>
          <script>
            const graphQLFetcher = graphQLParams =>
              fetch('/api/graphql', {
                method: 'post',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer ${req.headers.authorization?.replace('Bearer ', '') || ''}',
                  'X-Agency-Database': '${req.headers['x-agency-database'] || ''}',
                },
                body: JSON.stringify(graphQLParams),
              })
                .then(response => response.json())
                .catch(() => response.text().then(text => { throw new Error(text) }));
            ReactDOM.render(
              React.createElement(GraphiQL, { fetcher: graphQLFetcher }),
              document.getElementById('graphiql'),
            );
          </script>
        </body>
      </html>
    `);
  });
}

module.exports = router;
