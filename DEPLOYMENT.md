# CodeArena Deployment Guide

This guide provides step-by-step instructions on how to deploy CodeArena on a server so that any computer connected to the same network can access it via the server's IP address.

## Prerequisites

Before starting, ensure your server meets the following requirements:
1. A Linux-based OS (Ubuntu 20.04/22.04 or Debian recommended) or macOS.
2. **Docker** and **Docker Compose** installed.
   - [Install Docker](https://docs.docker.com/engine/install/)
   - [Install Docker Compose](https://docs.docker.com/compose/install/)
3. Git installed (`sudo apt install git`).
4. Port `80` must be available and open on the server's firewall.

## Step-by-Step Deployment

### 1. Clone the Repository
Open a terminal on your server and clone the project:
```bash
git clone <YOUR_REPOSITORY_URL>
cd IDCC
```
*(If you have simply copied the `IDCC` folder to your server, just `cd` into that folder).*

### 2. Configure Environment Variables
By default, the platform will run with safe default credentials. However, for a production server, it is highly recommended to secure your database and JWT tokens.

Create a `.env` file in the root of the project:
```bash
cp .env.example .env
```

Open the `.env` file with a text editor (like `nano .env`) and update the values:
```env
# Database Credentials
DATABASE_USERNAME=codearena_admin
DATABASE_PASSWORD=your_secure_password

# JWT Secret for Session Security (Make this a long, random string)
JWT_SECRET=your_super_secret_jwt_key_that_is_at_least_32_bytes_long
```

### 3. Build and Start the Application
Run the following command to build all the microservices and start the application in the background:
```bash
docker compose up --build -d
```
*Note: The first build will take a few minutes as it downloads the necessary base images and compiles the Java backend and React frontend.*

### 4. Verify Services are Running
Check that all containers started successfully:
```bash
docker compose ps
```
You should see the `postgres`, `redis`, `backend`, `judge-worker`, and `frontend` containers in a running/healthy state.

---

## Accessing the Platform from Other Computers

Because the application uses NGINX as a reverse proxy, you do not need to configure any special URLs or CORS settings. It handles API requests natively.

### 1. Find Your Server's IP Address
On your server, find its local network IP address:
- **Linux:** Run `ip a` or `hostname -I`
- **macOS:** Run `ipconfig getifaddr en0`
- **Windows:** Run `ipconfig`

*(Example output: `192.168.1.50`)*

### 2. Access via Browser
On any other computer connected to the same Wi-Fi or local network, simply open a web browser and type in the server's IP address:
```
http://192.168.1.50
```

You will see the CodeArena homepage! 

**Login:** 
The platform is initialized with default users.
- **Admin**: `admin@codearena.local` / `Admin@123`
- **Participant**: `student@codearena.local` / `Student@123`

---

## Maintenance & Troubleshooting

**Viewing Logs**
If you need to check the logs for a specific service (e.g., the judge worker):
```bash
docker compose logs -f judge-worker
```

**Restarting the Server**
If you need to restart the application:
```bash
docker compose restart
```

**Shutting Down**
To completely stop the application and remove the containers (your database data will remain safe in Docker volumes):
```bash
docker compose down
```
