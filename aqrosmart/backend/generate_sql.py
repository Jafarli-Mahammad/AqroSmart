#!/usr/bin/env python
"""Generate CREATE TABLE SQL for manual execution."""
import sys
sys.path.insert(0, '/app' if '/opt/render' in sys.argv[0] else '.')

from app.database import Base
import app.models  # Import to register all models
from sqlalchemy.schema import CreateTable
from sqlalchemy.dialects import postgresql

print("-- AqroSmart Database Schema")
print("-- Execute these SQL statements manually in your PostgreSQL database")
print()

# Get tables in dependency order
tables_to_create = list(Base.metadata.tables.values())

def get_fk_deps(table):
    return {fk.column.table for fk in table.foreign_keys}

sorted_tables = []
remaining = set(tables_to_create)

while remaining:
    ready = [t for t in remaining if not (get_fk_deps(t) & remaining)]
    if not ready:
        ready = list(remaining)
    sorted_tables.extend(ready)
    remaining -= set(ready)

# Generate SQL for all tables
for table in sorted_tables:
    stmt = CreateTable(table).compile(dialect=postgresql.dialect())
    print(f"-- Table: {table.name}")
    print(f"{stmt};")
    print()
