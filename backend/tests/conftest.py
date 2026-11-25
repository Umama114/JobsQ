"""Tests use their own database (jobsq_test) and upload folder, so they never touch real accounts.
This runs before any test imports the app, so the app reads these settings."""
import os
import psycopg

_real = os.environ.get("DATABASE_URL", "postgresql://jobsq:jobsq_dev_only@localhost:5433/jobsq")
_base, _ = _real.rsplit("/", 1)
TEST_URL = f"{_base}/jobsq_test"

with psycopg.connect(f"{_base}/postgres", autocommit=True) as c:
    if not c.execute("select 1 from pg_database where datname = 'jobsq_test'").fetchone():
        c.execute("create database jobsq_test")

os.environ["DATABASE_URL"] = TEST_URL
os.environ["UPLOAD_DIR"] = "/tmp/jobsq-test-uploads"
