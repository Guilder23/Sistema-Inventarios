from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class Tienda(models.Model):
    """Modelo para gestión de tiendas físicas"""
    
    ESTADO_CHOICES = [
        ('activo', 'Activo'),
        ('inactivo', 'Inactivo'),
        ('remodelacion', 'En Remodelación'),
    ]
    
    TIPO_CHOICES = [
        ('principal', 'Principal'),
        ('sucursal', 'Sucursal'),
        ('punto_venta', 'Punto de Venta'),
    ]
    
    nombre = models.CharField(max_length=200, unique=True, verbose_name='Nombre de la Tienda')
    descripcion = models.TextField(blank=True, null=True, verbose_name='Descripción')
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='sucursal', 
                           verbose_name='Tipo de Tienda')
    
    # Relación con Almacén
    almacen = models.ForeignKey('almacenes.Almacen', on_delete=models.PROTECT, 
                               related_name='tiendas', verbose_name='Almacén')
    
    # Ubicación
    direccion = models.CharField(max_length=300, verbose_name='Dirección')
    ciudad = models.CharField(max_length=100, verbose_name='Ciudad')
    departamento = models.CharField(max_length=100, verbose_name='Departamento/Estado')
    coordenadas = models.CharField(max_length=100, blank=True, null=True, 
                                  verbose_name='Coordenadas GPS')
    
    # Estado y seguimiento
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='activo', 
                             verbose_name='Estado')
    
    # Auditoría
    creado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, 
                                   related_name='tiendas_creadas', verbose_name='Creado por')
    fecha_creacion = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de Creación')
    fecha_actualizacion = models.DateTimeField(auto_now=True, verbose_name='Última Actualización')
    
    class Meta:
        verbose_name = 'Tienda'
        verbose_name_plural = 'Tiendas'
        ordering = ['-fecha_creacion']
        db_table = 'tiendas'
    
    def __str__(self):
        return f"{self.nombre}"
    
    @property
    def esta_activo(self):
        """Verifica si la tienda está activa"""
        return self.estado == 'activo'
    
    @property
    def nombre_almacen(self):
        """Retorna el nombre del almacén asociado"""
        return self.almacen.nombre if self.almacen else 'Sin almacén'
