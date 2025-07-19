# Setup Instructions

## Prerequisites
- Node.js (v20 or later)
- Bun (v1.2 or later)
- Docker & Docker Compose (optional, for containerized setup)

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/BRAVO68WEB/loginradius-assignment
    cd loginradius-assignment
    ```
2. **Install Dependencies**:
    ```bash
    bun install
    ```
3. **Configure Environment Variables**:
    a. For API:
    - Create a `.env` file in the `packages/api` directory.
    - Copy the contents from `.env.example` and update the values as needed.
```
NODE_ENV=
PORT=4500
DB_LOGGING=
DB_AUTO_MIGRATE=
DATABASE_SSL=
DATABASE_HOST=
DATABASE_PORT=
DATABASE_USER=
DATABASE_PASSWORD=
DATABASE_NAME=
JWT_SECRET=
CACHE_ENV=
REDIS_URL=
```
    b. For Frontend:
    - Create a `.env` file in the `apps/web` directory.
    - Copy the contents from `.env.example` and update the values as needed.
```
VITE_API_BASE_URL=http://localhost:4500
```
4. **Run the Application**:
   - For development:
     ```bash
     bun run dev
     ```

5. **Run Tests**:
   - To run the test suite:
     ```bash
     bun run test
     ```

6. **Access the Application**:
    - Open your browser and navigate to `http://localhost:8080` for the frontend
    - For API documentation, visit `http://localhost:4500/docs`

## Going Production

- **Docker**: You can use the provided `packages/api/docker-compose.yaml` to run the application in a containerized environment. Change the environment variables in the `.env` file as needed.
- **Nginx**: Use the provided `deploy/nginx.conf` to set up Nginx as a reverse proxy for your application. Make sure to replace the `my.cloud.domain` with your domain or IP address and adjust the port if necessary.

1. **Nginx Configuration**:
   - Place the `nginx.conf` file in your Nginx configuration directory.
   - Update the `server_name` directive with your domain or IP address.
   - Ensure that Nginx is installed and running on your server.

2. **Environment Variables**:
   - Ensure that the environment variables in your `.env` files are set correctly for production use.
   - For example, set `NODE_ENV=production` in the API `.env` file.
```
NODE_ENV=production
PORT=4500
DB_LOGGING=true
DB_AUTO_MIGRATE=true
DATABASE_SSL=false
DATABASE_HOST=db
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=p0stgre5
DATABASE_NAME=postgres
JWT_SECRET=your_jwt_secret
CACHE_ENV=production
REDIS_URL=redis://redis:6379
```

3. **Docker Compose**:
   - If you are using Docker, run the following command to start the application:
     ```bash
     docker-compose up -d
     ```
   - This will start the API and any other services defined in the `docker-compose.yaml` file.

4. **Frontend**:
   - The frontend is built using Next.js and can be deployed to any static hosting service.
   - Ensure that the `VITE_API_BASE_URL` in the `.env` file points to your production API URL.
