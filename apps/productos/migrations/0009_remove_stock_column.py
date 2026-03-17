# Generated manually to fix database schema
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('productos', '0008_remove_contenedor_stock_remove_producto_contenedor_and_more'),
    ]

    operations = [
        migrations.RunSQL(
            sql='ALTER TABLE productos_producto DROP COLUMN IF EXISTS stock;',
            reverse_sql='ALTER TABLE productos_producto ADD COLUMN stock INTEGER DEFAULT 0;'
        ),
    ]
