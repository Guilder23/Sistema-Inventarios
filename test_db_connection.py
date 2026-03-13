#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Script para probar la conexión a PostgreSQL"""

import os
import sys
import django

# Agregar el directorio actual al path
sys.path.insert(0, os.path.dirname(__file__))

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sistemaInventario.settings')
django.setup()

from django.db import connection

try:
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
        result = cursor.fetchone()
    
    if result:
        print("✅ ¡Conexión a PostgreSQL exitosa!")
        print(f"Versión de PostgreSQL: ", end="")
        with connection.cursor() as cursor:
            cursor.execute("SELECT version();")
            print(cursor.fetchone()[0])
    else:
        print("❌ No se pudo ejecutar la consulta")
        
except Exception as e:
    print(f"❌ Error de conexión: {type(e).__name__}")
    print(f"Detalles: {str(e)}")
    print("\nVerifica:")
    print("  1. PostgreSQL está corriendo en 127.0.0.1:5434")
    print("  2. La base de datos 'sistema_inventario' existe")
    print("  3. Usuario 'postgres' y contraseña son correctos")
    print("  4. El archivo .env tiene la codificación UTF-8")
