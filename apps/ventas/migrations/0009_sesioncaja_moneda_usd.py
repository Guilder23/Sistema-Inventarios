from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ventas', '0008_sesioncaja_movimientocaja'),
    ]

    operations = [
        migrations.AddField(
            model_name='movimientocaja', name='moneda',
            field=models.CharField(choices=[('BOB', 'Bolivianos'), ('USD', 'Dólares')], default='BOB', max_length=3),
        ),
        migrations.AddField(model_name='sesioncaja', name='monto_inicial_usd', field=models.DecimalField(decimal_places=2, default=0.0, max_digits=12)),
        migrations.AddField(model_name='sesioncaja', name='total_efectivo_sistema_usd', field=models.DecimalField(decimal_places=2, default=0.0, max_digits=12)),
        migrations.AddField(model_name='sesioncaja', name='monto_esperado_efectivo_usd', field=models.DecimalField(decimal_places=2, default=0.0, max_digits=12)),
        migrations.AddField(model_name='sesioncaja', name='monto_real_efectivo_usd', field=models.DecimalField(decimal_places=2, default=0.0, max_digits=12)),
        migrations.AddField(model_name='sesioncaja', name='diferencia_efectivo_usd', field=models.DecimalField(decimal_places=2, default=0.0, max_digits=12)),
    ]
