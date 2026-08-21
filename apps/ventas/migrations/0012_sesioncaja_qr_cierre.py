from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ventas', '0011_venta_monto_efectivo_venta_monto_qr_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='sesioncaja',
            name='monto_real_qr',
            field=models.DecimalField(decimal_places=2, default=0.0, max_digits=12),
        ),
        migrations.AddField(
            model_name='sesioncaja',
            name='diferencia_qr',
            field=models.DecimalField(decimal_places=2, default=0.0, max_digits=12),
        ),
    ]
