#!/bin/bash
# Export data from AWS RDS to Railway

# Set your AWS RDS connection details
AWS_HOST="172.31.22.74"
AWS_PORT="5432"
AWS_USER="root"
AWS_PASSWORD="Molunix3ndosuperapp"
AWS_DATABASE="xmarketdb"

# Export database
echo "Exporting database from AWS RDS..."
pg_dump "postgresql://$AWS_USER:$AWS_PASSWORD@$AWS_HOST:$AWS_PORT/$AWS_DATABASE?sslmode=require" > xmarket_backup.sql

echo "Backup created: xmarket_backup.sql"
echo "Upload this to Railway PostgreSQL using the Railway CLI or pgAdmin"
