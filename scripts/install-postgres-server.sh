#!/usr/bin/env bash
# ==============================================================================
# GrandStay SaaS - PostgreSQL Setup & Migration Script for Hostinger VPS / CloudPanel
# Target Server: sasapi.u2tech.in (CloudPanel)
# ==============================================================================

set -e

# Configuration
DB_NAME="hotel_saas"
DB_USER="hotel_user"
DB_PASS="${1:-HotelSecretPass2026!}"
BACKEND_DIR="/home/u2tech-sasapi/htdocs/sasapi.u2tech.in"

echo "================================================================="
echo "  GrandStay SaaS: Installing & Configuring PostgreSQL on Server  "
echo "================================================================="

# 1. Update APT and Install PostgreSQL
echo "[1/6] Installing PostgreSQL & Contrib packages..."
sudo apt update -y
sudo apt install -y postgresql postgresql-contrib

# 2. Detect PHP version and install php-pgsql extension
echo "[2/6] Detecting PHP version and installing PHP PostgreSQL extension..."
PHP_VER=$(php -r "echo PHP_MAJOR_VERSION . '.' . PHP_MINOR_VERSION;")
echo "Detected PHP Version: $PHP_VER"

sudo apt install -y php-pgsql php${PHP_VER}-pgsql || true

# Restart PHP-FPM service so web server loads pdo_pgsql
echo "Restarting PHP-FPM service..."
sudo systemctl restart php${PHP_VER}-fpm 2>/dev/null || sudo systemctl restart php-fpm 2>/dev/null || true

# 3. Enable and Start PostgreSQL service
echo "[3/6] Starting PostgreSQL service..."
sudo systemctl enable postgresql
sudo systemctl restart postgresql

# 4. Create Database, User and Grant Privileges
echo "[4/6] Creating PostgreSQL database '$DB_NAME' and user '$DB_USER'..."
sudo -u postgres psql << EOF
-- Terminate existing connections if any
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = '${DB_NAME}'
  AND pid <> pg_backend_pid();

-- Create Database if not exists
SELECT 'CREATE DATABASE ${DB_NAME}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')\gexec

-- Create or update user password
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE USER ${DB_USER} WITH ENCRYPTED PASSWORD '${DB_PASS}';
  ELSE
    ALTER USER ${DB_USER} WITH ENCRYPTED PASSWORD '${DB_PASS}';
  END IF;
END
\$\$;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
ALTER DATABASE ${DB_NAME} OWNER TO ${DB_USER};
EOF

# Grant schema privileges in the database
sudo -u postgres psql -d ${DB_NAME} << EOF
GRANT ALL ON SCHEMA public TO ${DB_USER};
ALTER SCHEMA public OWNER TO ${DB_USER};
EOF

echo "✓ PostgreSQL Database and User configured successfully."

# 5. Update Laravel .env on Server
if [ -d "$BACKEND_DIR" ] && [ -f "$BACKEND_DIR/.env" ]; then
    echo "[5/6] Updating Laravel .env at $BACKEND_DIR/.env..."

    # Use sed to replace or insert DB settings
    sed -i "s/^DB_CONNECTION=.*/DB_CONNECTION=pgsql/" "$BACKEND_DIR/.env"
    sed -i "s/^DB_HOST=.*/DB_HOST=127.0.0.1/" "$BACKEND_DIR/.env"
    sed -i "s/^DB_PORT=.*/DB_PORT=5432/" "$BACKEND_DIR/.env"
    sed -i "s/^DB_DATABASE=.*/DB_DATABASE=${DB_NAME}/" "$BACKEND_DIR/.env"
    sed -i "s/^DB_USERNAME=.*/DB_USERNAME=${DB_USER}/" "$BACKEND_DIR/.env"
    sed -i "s/^DB_PASSWORD=.*/DB_PASSWORD=${DB_PASS}/" "$BACKEND_DIR/.env"

    echo "✓ .env file updated with PostgreSQL credentials."

    # 6. Run Migrations & Seeders
    echo "[6/6] Running Artisan migrations and seeders on PostgreSQL..."
    cd "$BACKEND_DIR"
    php artisan config:clear
    php artisan cache:clear
    php artisan migrate --force
    php artisan db:seed --force
    php artisan config:cache
    php artisan route:cache

    echo "================================================================="
    echo "  🎉 SUCCESS: PostgreSQL is live and connected on server!       "
    echo "  Database: ${DB_NAME} | User: ${DB_USER}                        "
    echo "================================================================="
else
    echo "[5/6] Notice: Backend directory $BACKEND_DIR/.env not found."
    echo "Please manually update your .env with:"
    echo "  DB_CONNECTION=pgsql"
    echo "  DB_HOST=127.0.0.1"
    echo "  DB_PORT=5432"
    echo "  DB_DATABASE=${DB_NAME}"
    echo "  DB_USERNAME=${DB_USER}"
    echo "  DB_PASSWORD=${DB_PASS}"
fi
