from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('productos', '0006_contenedor'),
    ]

    operations = [
        migrations.AddField(
            model_name='producto',
            name='contenedor',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='productos', to='productos.contenedor'),
        ),
    ]
