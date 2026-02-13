from django.db import models
from django.contrib.auth.models import User
from apps.productos.models import Producto
from apps.usuarios.models import PerfilUsuario

class Traspaso(models.Model):
    """Registro de traspasos entre ubicaciones"""
    ESTADOS = (
        ('pendiente', 'Pendiente'),
        ('aceptado', 'Aceptado'),
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
    creado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_aceptacion = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        verbose_name = 'Traspaso'
        verbose_name_plural = 'Traspasos'
        ordering = ['-fecha_creacion']
    
    def __str__(self):
        return f"{self.codigo} - {self.origen} → {self.destino}"


class DetalleTraspaso(models.Model):
    """Detalle de productos en el traspaso"""
    traspaso = models.ForeignKey(Traspaso, on_delete=models.CASCADE, related_name='detalles')
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE)
    cantidad = models.IntegerField()
    
    class Meta:
        verbose_name = 'Detalle de Traspaso'
        verbose_name_plural = 'Detalles de Traspasos'
    
    def __str__(self):
        return f"{self.producto.nombre} - {self.cantidad}"
