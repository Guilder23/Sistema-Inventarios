from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0003_alter_perfilusuario_rol'),
    ]

    operations = [
        migrations.AlterField(
            model_name='perfilusuario',
            name='usuario',
            field=models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='perfil', to='auth.user'),
        ),
    ]
