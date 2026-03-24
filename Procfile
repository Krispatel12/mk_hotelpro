web: cd hotelpro && gunicorn hotelpro.wsgi:application --workers 2 --threads 4 --worker-class gthread --worker-tmp-dir /dev/shm --timeout 120 --bind 0.0.0.0:$PORT
