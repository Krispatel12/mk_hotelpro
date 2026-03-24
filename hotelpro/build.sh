#!/usr/bin/env bash
# exit on error
set -o errexit

# Install dependencies
pip install -r requirements.txt

# Run collect static files (uses dummy DB if DATABASE_URL is missing)
python manage.py collectstatic --no-input
