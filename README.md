# LoginRadius - Brute-Force Protected Login Application

This repository contains the code for the Brute-Force Protected Login Application created as part of the LoginRadius take home assignment. The application is built using Bun, Kysely ORM, and OpenAPI with Zod and includes features like brute-force protection, anomaly logging, and comprehensive tests.

## Docs

- [Dev Journey / Documentation / Guide](docs/DEV%20JOURNEY.md)
- [Architectural Design](docs/ARCHITECTURAL%20DESIGN.md)
- [Setup Guide](docs/SETUP.md)
- [AI Usage](docs/AI%20USAGE.md)

## Project Structure

```
packages/
├── api/                # Backend API with Kysely ORM and OpenAPI
└── sdk/                # Generated SDK for Auth API
apps/
└── web/                # Frontend application
docs/                   # Documentation files
deploy/                 # Deployment configurations (Nginx)
```