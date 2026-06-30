import uuid

from app.services.storage import safe_object_path, public_url


def test_path_keeps_extension_and_namespaces_by_owner():
    owner = uuid.UUID("11111111-1111-1111-1111-111111111111")
    p = safe_object_path("progress", owner, "My Photo.PNG")
    assert p.startswith(f"progress/{owner}/")
    assert p.endswith(".png")


def test_path_defaults_extension_when_missing():
    owner = uuid.uuid4()
    p = safe_object_path("content", owner, "noext")
    assert p.endswith(".bin")


def test_public_url_shape(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://x.supabase.co")
    from app.core.config import get_settings
    get_settings.cache_clear()
    url = public_url("onefit-public", "progress/a/b.png")
    assert url == "https://x.supabase.co/storage/v1/object/public/onefit-public/progress/a/b.png"
