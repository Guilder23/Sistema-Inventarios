# Generated migration to fix exchange rate from 6.0 to 6.93

from django.db import migrations
from decimal import Decimal


def fix_exchange_rate(apps, schema_editor):
    """Actualizar el tipo de cambio USD a 6.93"""
    TipoCambio = apps.get_model('moneda', 'TipoCambio')
    
    # Actualizar todos los registros USD a 6.93
    TipoCambio.objects.filter(moneda='USD').update(valor=Decimal('6.93'))
    
    print("\n✅ [MIGRACIÓN] Tipo de cambio actualizado a 6.93 USD/BOB\n")


def reverse_fix(apps, schema_editor):
    """Revertir cambios si es necesario"""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('moneda', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(fix_exchange_rate, reverse_fix),
    ]
