#!/bin/bash
# Script to update .env file with Namecheap email settings

echo "Updating .env file with Namecheap email configuration..."

# Backup current .env
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Update SMTP settings
sed -i.bak 's|SMTP_HOST=.*|SMTP_HOST=mail.privateemail.com|' .env
sed -i.bak 's|SMTP_PORT=.*|SMTP_PORT=587|' .env
sed -i.bak 's|SMTP_SECURE=.*|SMTP_SECURE=false|' .env
sed -i.bak 's|SMTP_USER=.*|SMTP_USER=grace_edge@homecomming26.com|' .env
sed -i.bak 's|SMTP_PASS=.*|SMTP_PASS=YOUR_SMTP_PASSWORD|' .env
sed -i.bak 's|FROM_EMAIL=.*|FROM_EMAIL=grace_edge@homecomming26.com|' .env
sed -i.bak 's|FROM_NAME=.*|FROM_NAME=Grace Edge Ministries|' .env
sed -i.bak 's|CHURCH_NAME=.*|CHURCH_NAME=Grace Edge Ministries|' .env

# Remove backup files
rm -f .env.bak

echo "✅ .env file updated!"
echo ""
echo "Updated settings:"
echo "  SMTP_HOST=mail.privateemail.com"
echo "  SMTP_PORT=587"
echo "  SMTP_USER=grace_edge@homecomming26.com"
echo "  FROM_EMAIL=grace_edge@homecomming26.com"
echo ""
echo "⚠️  Note: If port 587 doesn't work, try:"
echo "  SMTP_PORT=465"
echo "  SMTP_SECURE=true"
