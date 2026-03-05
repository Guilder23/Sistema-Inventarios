from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class Vendedor(models.Model):
    """Modelo para gestión de vendedores"""
    
    ESTADO_CHOICES = [
        ('activo', 'Activo'),
        ('inactivo', 'Inactivo'),
        ('suspendido', 'Suspendido'),
    ]
    
    # Datos básicos
    nombre = models.CharField(max_length=200, verbose_name='Nombre del Vendedor')
    apellido = models.CharField(max_length=200, verbose_name='Apellido')
    cedula = models.CharField(max_length=50, unique=True, verbose_name='Cédula/DNI')
    email = models.EmailField(blank=True, null=True, verbose_name='Email')
    telefono = models.CharField(max_length=20, blank=True, null=True, verbose_name='Teléfono')
    direccion = models.TextField(blank=True, null=True, verbose_name='Dirección')
    
    # Asignación a almacén o tienda
    almacen = models.ForeignKey(
        'almacenes.Almacen',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='vendedores',
        verbose_name='Almacén'
    )
    tienda = models.ForeignKey(
        'tiendas.Tienda',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='vendedores',
        verbose_name='Tienda'
    )
    
    # Estado y control
    estado = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
        default='activo',
        verbose_name='Estado'
    )
    comision = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        blank=True,
        verbose_name='Comisión (%)'
    )
    
    # Auditoría
    creado_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='vendedores_creados',
        verbose_name='Creado por'
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de Creación')
    fecha_actualizacion = models.DateTimeField(auto_now=True, verbose_name='Última Actualización')
    
    class Meta:
        verbose_name = 'Vendedor'
        verbose_name_plural = 'Vendedores'
        ordering = ['-fecha_creacion']
        db_table = 'vendedores'
    
    def __str__(self):
        return f"{self.nombre} {self.apellido} - {self.cedula}"
    
    @property
    def nombre_completo(self):
        """Retorna el nombre completo del vendedor"""
        return f"{self.nombre} {self.apellido}"
    
    @property
    def ubicacion(self):
        """Retorna la ubicación asignada (almacén o tienda)"""
        if self.almacen:
            return self.almacen.nombre
        elif self.tienda:
            return self.tienda.nombre
        return 'Sin asignar'
    
    @property
    def tipo_ubicacion(self):
        """Retorna el tipo de ubicación"""
        if self.almacen:
            return 'Almacén'
        elif self.tienda:
            return 'Tienda'
        return 'Sin asignar'
    
    @property
    def esta_activo(self):
        """Verifica si el vendedor está activo"""
        return self.estado == 'activo'
