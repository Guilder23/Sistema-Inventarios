from django.core.management.base import BaseCommand
from django.contrib.auth.models import User


class Command(BaseCommand):
    help = 'Crea el usuario administrador principal para el sistema'

    def handle(self, *args, **kwargs):
        # Datos del administrador
        username = 'admin'
        email = 'admin@gmail.com'
        password = 'admin12345'
        
        if User.objects.filter(username=username).exists():
            self.stdout.write(
                self.style.WARNING(f'✗ El usuario "{username}" ya existe en el sistema')
            )
            return

        # Crear superusuario
        User.objects.create_superuser(
            username=username,
            email=email,
            password=password,
            first_name='Administrador',
            last_name='Principal'
        )

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS('  ✓ USUARIO ADMINISTRADOR CREADO EXITOSAMENTE'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('CREDENCIALES DE ACCESO:'))
        self.stdout.write(self.style.SUCCESS('-' * 60))
        self.stdout.write(f'  Usuario:    {username}')
        self.stdout.write(f'  Contraseña: {password}')
        self.stdout.write(f'  Email:      {email}')
        self.stdout.write('')
        self.stdout.write(self.style.WARNING('⚠ IMPORTANTE: Cambia la contraseña después del primer inicio de sesión'))
        self.stdout.write('')
