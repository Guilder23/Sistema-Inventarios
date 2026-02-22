from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class Deposito(models.Model):
    """Modelo para gestión de depósitos pertenecientes a tiendas"""
    
    ESTADO_CHOICES = [
        ('activo', 'Activo'),
        ('inactivo', 'Inactivo'),
        ('mantenimiento', 'En Mantenimiento'),
    ]
    
    TIPO_CHOICES = [
        ('principal', 'Principal'),
        ('secundario', 'Secundario'),
        ('temporal', 'Temporal'),
    ]
    
    nombre = models.CharField(max_length=200, unique=True, verbose_name='Nombre del Depósito')
    codigo = models.CharField(max_length=50, unique=True, verbose_name='Código')
    descripcion = models.TextField(blank=True, null=True, verbose_name='Descripción')
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='principal', 
                           verbose_name='Tipo de Depósito')
    
    # Relación con Tienda (cada depósito pertenece a una tienda)
    tienda = models.ForeignKey('tiendas.Tienda', on_delete=models.PROTECT, 
                               related_name='depositos', verbose_name='Tienda')
    
    # Ubicación
    direccion = models.CharField(max_length=300, verbose_name='Dirección')
    ciudad = models.CharField(max_length=100, verbose_name='Ciudad')
    departamento = models.CharField(max_length=100, verbose_name='Departamento/Estado')
    pais = models.CharField(max_length=100, default='Colombia', verbose_name='País')
    codigo_postal = models.CharField(max_length=20, blank=True, null=True, verbose_name='Código Postal')
    coordenadas = models.CharField(max_length=100, blank=True, null=True, 
                                  verbose_name='Coordenadas GPS')
    
    # Contacto
    telefono = models.CharField(max_length=20, blank=True, null=True, verbose_name='Teléfono')
    email = models.EmailField(blank=True, null=True, verbose_name='Email')
    
    # Detalles operativos
    area_m2 = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, 
                                  verbose_name='Área (m²)')
    horario_apertura = models.TimeField(blank=True, null=True, verbose_name='Horario de Apertura')
    horario_cierre = models.TimeField(blank=True, null=True, verbose_name='Horario de Cierre')
    
    # Estado y seguimiento
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='activo', 
                             verbose_name='Estado')
    fecha_apertura = models.DateField(blank=True, null=True, verbose_name='Fecha de Apertura')
    
    # Auditoría
    creado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, 
                                   related_name='depositos_creados', verbose_name='Creado por')
    fecha_creacion = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de Creación')
    fecha_actualizacion = models.DateTimeField(auto_now=True, verbose_name='Última Actualización')
    
    class Meta:
        verbose_name = 'Depósito'
        verbose_name_plural = 'Depósitos'
        ordering = ['-fecha_creacion']
        db_table = 'depositos'
    
    def __str__(self):
        return f"{self.codigo} - {self.nombre}"
    
    @property
    def esta_activo(self):
        """Verifica si el depósito está activo"""
        return self.estado == 'activo'
    
    @property
    def nombre_tienda(self):
        """Retorna el nombre de la tienda asociada"""
        return self.tienda.nombre if self.tienda else 'Sin tienda'
    
    @property
    def nombre_almacen(self):
        """Retorna el nombre del almacén asociado de la tienda"""
        return self.tienda.almacen.nombre if self.tienda and self.tienda.almacen else 'Sin almacén'
