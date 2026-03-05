from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('productos', '0003_producto_danado_gestion_devoluciones'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Categoria',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nombre', models.CharField(max_length=100, unique=True)),
                ('descripcion', models.TextField(blank=True, null=True)),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True)),
                ('fecha_actualizacion', models.DateTimeField(auto_now=True)),
                ('activo', models.BooleanField(default=True)),
                ('creado_por', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='categorias_creadas', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Categoría',
                'verbose_name_plural': 'Categorías',
                'ordering': ['nombre'],
            },
        ),
    ]
