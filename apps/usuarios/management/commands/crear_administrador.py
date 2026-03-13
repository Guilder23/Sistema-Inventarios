from django.core.management.base import BaseCommand
from django.contrib.auth.models import User


class Command(BaseCommand):
    help = 'Crea un usuario administrador por defecto para el sistema'

    def handle(self, *args, **kwargs):
        username = 'admin'
        email = 'admin@sistema-inventario.com'
        password = 'admin123'

        if User.objects.filter(username=username).exists():
            self.stdout.write(
                self.style.WARNING(f'El usuario "{username}" ya existe en el sistema')
            )
            return

        # Crear superusuario
        User.objects.create_superuser(
            username=username,
            email=email,
            password=password,
            first_name='Administrador',
            last_name='Sistema'
        )

        self.stdout.write(
            self.style.SUCCESS('Usuario administrador creado exitosamente')
        )
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('Credenciales de acceso:'))
        self.stdout.write(f'  Usuario: {username}')
        self.stdout.write(f'  Contraseña: {password}')
        self.stdout.write('')
        self.stdout.write(
            self.style.WARNING('IMPORTANTE: Cambie la contraseña despues del primer inicio de sesion')
        )
