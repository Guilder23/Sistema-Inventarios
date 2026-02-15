from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from apps.productos.models import Producto
from apps.usuarios.models import PerfilUsuario
import uuid

class Traspaso(models.Model):
    """Registro de traspasos entre ubicaciones"""
    ESTADOS = (
        ('pendiente', 'Pendiente'),
        ('transito', 'En Tránsito'),
        ('recibido', 'Recibido'),
        ('rechazado', 'Rechazado'),
        ('cancelado', 'Cancelado'),
    )
    
    TIPOS = (
        ('normal', 'Normal'),
        ('devolucion', 'Devolución'),
    )
    
    codigo = models.CharField(max_length=50, unique=True)
    tipo = models.CharField(max_length=20, choices=TIPOS, default='normal')
    origen = models.ForeignKey(PerfilUsuario, on_delete=models.CASCADE, related_name='traspasos_enviados')
    destino = models.ForeignKey(PerfilUsuario, on_delete=models.CASCADE, related_name='traspasos_recibidos')
    estado = models.CharField(max_length=20, choices=ESTADOS, default='pendiente')
    comentario = models.TextField(blank=True, null=True)
    foto = models.ImageField(upload_to='traspasos/', blank=True, null=True)
    creado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='traspasos_creados')
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_envio = models.DateTimeField(blank=True, null=True)
    fecha_recepcion = models.DateTimeField(blank=True, null=True)
    aceptado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='traspasos_aceptados')
    
    class Meta:
        verbose_name = 'Traspaso'
        verbose_name_plural = 'Traspasos'
        ordering = ['-fecha_creacion']
    
    def __str__(self):
        return f"{self.codigo} - {self.get_tipo_display()}"
    
    @classmethod
    def generar_codigo(cls):
        """Genera código único para traspaso"""
        from datetime import datetime
        prefijo = "TRP"
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        aleatorio = str(uuid.uuid4())[:8].upper()
        return f"{prefijo}-{timestamp}-{aleatorio}"
    
    @property
    def total(self):
        """Calcula el total del traspaso"""
        total = 0
        for detalle in self.detalles.all():
            total += detalle.subtotal
        return total


class DetalleTraspaso(models.Model):
    """Detalle de productos en el traspaso"""
    traspaso = models.ForeignKey(Traspaso, on_delete=models.CASCADE, related_name='detalles')
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE)
    cantidad = models.IntegerField()
    
    class Meta:
        verbose_name = 'Detalle de Traspaso'
        verbose_name_plural = 'Detalles de Traspasos'
        unique_together = ('traspaso', 'producto')
    
    def __str__(self):
        return f"{self.traspaso.codigo} - {self.producto.nombre}"
    
    @property
    def subtotal(self):
        """Calcula el subtotal del producto"""
        return self.producto.precio_unidad * self.cantidad
