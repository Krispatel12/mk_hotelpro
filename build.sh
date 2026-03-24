#!/usr/bin/env bash
# exit on error
set -o errexit

# Move into the Django directory
cd hotelpro

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --no-input
