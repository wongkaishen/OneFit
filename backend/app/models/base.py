from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Declarative base for all ORM models. Maps to the existing Supabase schema
    (created by supabase/migrations); SQLAlchemy does not own/create the schema."""
