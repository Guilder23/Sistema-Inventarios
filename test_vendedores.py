#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sistemaInventario.settings')
django.setup()

from django.db import connection
from apps.vendedores.models import Vendedor

cursor = connection.cursor()

try:
    # Primero, listar todas las tablas
    cursor.execute("""
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
    """)
    all_tables = [row[0] for row in cursor.fetchall()]
    print("✓ Tablas en la base de datos PostgreSQL:")
    for table in sorted(all_tables):
        print(f"  - {table}")
    
    # Verificar si existe la tabla vendedores
    if 'vendedores' in all_tables:
        cursor.execute("SELECT COUNT(*) FROM vendedores")
        count = cursor.fetchone()[0]
        print(f"\n✓ Tabla 'vendedores' existe")
        print(f"  Registros actuales: {count}")
    else:
        print(f"\n✗ Tabla 'vendedores' NO existe")
        
except Exception as e:
    print(f"✗ Error: {str(e)}")

# Verificar que el ORM puede acceder
try:
    count = Vendedor.objects.count()
    print(f"✓ Total de vendedores accesibles vía ORM: {count}")
except Exception as e:
    print(f"  Error en ORM: {str(e)}")
