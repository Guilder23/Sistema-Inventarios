from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ventas', '0009_sesioncaja_moneda_usd'),
    ]

    operations = [
        migrations.AlterField(
            model_name='sesioncaja',
            name='monto_inicial',
            field=models.DecimalField(decimal_places=2, default=0.0, help_text='Fondo/cambio base con el que abre la caja', max_digits=12),
        ),
    ]
