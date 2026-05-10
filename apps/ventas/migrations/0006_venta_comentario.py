from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ventas', '0005_detalleventa_cantidad_cajas_detalleventa_modalidad_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='venta',
            name='comentario',
            field=models.TextField(blank=True, null=True),
        ),
    ]
