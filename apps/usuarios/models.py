from django.db import models
from django.contrib.auth.models import User

class PerfilUsuario(models.Model):
    """Perfil extendido del usuario"""
    ROLES = (
        ('administrador', 'Administrador'),
        ('almacen', 'Almacén'),
        ('tienda', 'Tienda'),
        ('deposito', 'Depósito'),
        ('tienda_online', 'Tienda Online'),
    )
    
    usuario = models.OneToOneField(User, on_delete=models.CASCADE, related_name='perfil')
    rol = models.CharField(max_length=20, choices=ROLES)
    nombre_ubicacion = models.CharField(max_length=200, blank=True, null=True, help_text='Nombre de la tienda/almacén/depósito')
    
    # Relaciones a almacenes y tiendas
    almacen = models.ForeignKey('almacenes.Almacen', on_delete=models.SET_NULL, null=True, blank=True, related_name='usuarios')
    tienda = models.ForeignKey('tiendas.Tienda', on_delete=models.SET_NULL, null=True, blank=True, related_name='usuarios')
    
    encargado = models.CharField(max_length=200, blank=True, null=True)
    telefono = models.CharField(max_length=20, blank=True, null=True)
    direccion = models.TextField(blank=True, null=True)
    activo = models.BooleanField(default=True)
    creado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='usuarios_creados')
    ubicacion_relacionada = models.ForeignKey(
        'self', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        help_text='Para depósitos: la tienda a la que pertenece'
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Perfil de Usuario'
        verbose_name_plural = 'Perfiles de Usuarios'
        ordering = ['nombre_ubicacion']
    
    def __str__(self):
        return f"{self.usuario.username} - {self.get_rol_display()}"
