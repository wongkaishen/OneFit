"""Test config. Sets dummy Supabase env BEFORE the app is imported so settings
load and the async engine constructs (it connects lazily, so no DB is needed for
these smoke tests). Tests here intentionally avoid endpoints that hit the DB."""

import os

os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-anon")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service")
os.environ.setdefault("SUPABASE_JWT_SECRET", "test-secret")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://u:p@localhost:5432/postgres")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="session")
def client() -> TestClient:
    return TestClient(app)
