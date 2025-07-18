import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import coreRoutes from './core/routes';
import { config } from './utils/env';
import infoLogs, { LogTypes } from './libs/logger';
import { Scalar } from '@scalar/hono-api-reference';
import { openAPISpecs } from 'hono-openapi';

const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', logger());
app.use('*', prettyJSON());

// Routes
app.route('/', coreRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Application error:', err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

// OpenAPI documentation
app.get(
    "/openapi",
    openAPISpecs(app, {
        documentation: {
            info: {
                title: "Brute-Force Protected Login API",
                version: "v1.0.0",
                description: "API with comprehensive brute-force protection including user suspension and IP blocking",
            },
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: "http",
                        scheme: "bearer",
                        bearerFormat: "JWT",
                    },
                    apiKeyAuth: {
                        type: "apiKey",
                        in: "header",
                        name: "X-API-Key",
                    },
                },
            },
            security: [
                {
                    bearerAuth: [],
                },
                {
                    apiKeyAuth: [],
                },
            ],
            servers: [
                {
                    url: "http://localhost:" + config.PORT,
                    description: "Local development server",
                },
            ],
        },
    }),
);

app.get(
    "/docs",
    Scalar({
        theme: "elysiajs",
        url: "/openapi",
        title: "Brute-Force Protected API Documentation",
    }),
);

app.get('/version', (c) => {
  return c.json({ version: '0.0.1' });
});

const port = config.PORT || 3000;

console.log(`🚀 Server starting on port ${port}`);
infoLogs(`Server starting on port ${port}`, LogTypes.LOGS, 'Main');

export default {
  port: port,
  fetch: app.fetch,
};
