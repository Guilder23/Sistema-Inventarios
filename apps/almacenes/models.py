from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class Almacen(models.Model):
    """Modelo para gestión de almacenes"""
    
    ESTADO_CHOICES = [
        ('activo', 'Activo'),
        ('inactivo', 'Inactivo'),
        ('mantenimiento', 'En Mantenimiento'),
    ]
    
    nombre = models.CharField(max_length=200, unique=True, verbose_name='Nombre del Almacén')
    codigo = models.CharField(max_length=50, unique=True, verbose_name='Código')
    descripcion = models.TextField(blank=True, null=True, verbose_name='Descripción')
    
    # Ubicación
    direccion = models.CharField(max_length=300, verbose_name='Dirección')
    ciudad = models.CharField(max_length=100, verbose_name='Ciudad')
    departamento = models.CharField(max_length=100, verbose_name='Departamento/Estado')
    pais = models.CharField(max_length=100, default='Colombia', verbose_name='País')
    codigo_postal = models.CharField(max_length=20, blank=True, null=True, verbose_name='Código Postal')
    
    # Contacto
    telefono = models.CharField(max_length=20, blank=True, null=True, verbose_name='Teléfono')
    email = models.EmailField(blank=True, null=True, verbose_name='Email')
    
    # Capacidad
    capacidad_m2 = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, 
                                       verbose_name='Capacidad (m²)')
    capacidad_productos = models.IntegerField(blank=True, null=True, 
                                              verbose_name='Capacidad de Productos')
    
    # Estado y seguimiento
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='activo', 
                             verbose_name='Estado')
    
    # Auditoría
    creado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, 
                                   related_name='almacenes_creados', verbose_name='Creado por')
    fecha_creacion = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de Creación')
    fecha_actualizacion = models.DateTimeField(auto_now=True, verbose_name='Última Actualización')
    
    class Meta:
        verbose_name = 'Almacén'
        verbose_name_plural = 'Almacenes'
        ordering = ['-fecha_creacion']
        db_table = 'almacenes'
    
    def __str__(self):
        return f"{self.codigo} - {self.nombre}"
    
    @property
    def esta_activo(self):
        """Verifica si el almacén está activo"""
        return self.estado == 'activo'
    
    @property
    def total_tiendas(self):
        """Retorna el total de tiendas asignadas a este almacén"""
        return self.tiendas.filter(estado='activo').count()
