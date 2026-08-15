from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('ventas', '0007_detalleventa_comision_transporte_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='SesionCaja',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fecha_apertura', models.DateTimeField(auto_now_add=True)),
                ('fecha_cierre', models.DateTimeField(blank=True, null=True)),
                ('monto_inicial', models.DecimalField(decimal_places=2, default=0.0, max_digits=12)),
                ('total_efectivo_sistema', models.DecimalField(decimal_places=2, default=0.0, max_digits=12)),
                ('monto_esperado_efectivo', models.DecimalField(decimal_places=2, default=0.0, max_digits=12)),
                ('monto_real_efectivo', models.DecimalField(decimal_places=2, default=0.0, max_digits=12)),
                ('diferencia_efectivo', models.DecimalField(decimal_places=2, default=0.0, max_digits=12)),
                ('total_transferencia', models.DecimalField(decimal_places=2, default=0.0, max_digits=12)),
                ('total_general_recaudado', models.DecimalField(decimal_places=2, default=0.0, max_digits=12)),
                ('estado', models.CharField(default='ABIERTA', max_length=20, choices=[('ABIERTA', 'Abierta'), ('CERRADA', 'Cerrada')])),
                ('observaciones', models.TextField(blank=True, null=True)),
                ('cajero', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sesiones_caja', to=settings.AUTH_USER_MODEL)),
                ('ubicacion', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='sesiones_caja', to='usuarios.perfilusuario')),
            ],
            options={
                'db_table': 'ventas_sesioncaja',
                'ordering': ['-fecha_apertura'],
                'verbose_name': 'Sesión de Caja',
                'verbose_name_plural': 'Sesiones de Caja',
            },
        ),
        migrations.CreateModel(
            name='MovimientoCaja',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tipo', models.CharField(max_length=20, choices=[('INGRESO', 'Ingreso de Dinero'), ('EGRESO', 'Salida/Gasto de Dinero')])),
                ('monto', models.DecimalField(decimal_places=2, max_digits=12)),
                ('concepto', models.CharField(max_length=255)),
                ('fecha', models.DateTimeField(auto_now_add=True)),
                ('registrado_por', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='movimientos_caja', to=settings.AUTH_USER_MODEL)),
                ('sesion_caja', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='movimientos', to='ventas.sesioncaja')),
            ],
            options={
                'db_table': 'ventas_movimientocaja',
                'ordering': ['-fecha'],
                'verbose_name': 'Movimiento de Caja',
                'verbose_name_plural': 'Movimientos de Caja',
            },
        ),
        migrations.AddField(
            model_name='venta',
            name='sesion_caja',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='ventas', to='ventas.sesioncaja'),
        ),
        migrations.AddField(
            model_name='amortizacioncredito',
            name='sesion_caja',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='amortizaciones', to='ventas.sesioncaja'),
        ),
        migrations.AddField(
            model_name='amortizacioncredito',
            name='tipo_pago',
            field=models.CharField(choices=[('contado', 'Contado'), ('credito', 'Crédito')], default='contado', max_length=20),
        ),
    ]
