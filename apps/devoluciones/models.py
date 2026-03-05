from django.db import models
from django.contrib.auth.models import User
from apps.productos.models import Producto
from apps.usuarios.models import PerfilUsuario


class Devolucion(models.Model):
    """Registro de devoluciones de productos"""
    ESTADOS = (
        ('pendiente', 'Pendiente'),
        ('parcial', 'Parcial'),
        ('cerrado', 'Cerrado'),
    )

    producto = models.ForeignKey(Producto, on_delete=models.CASCADE)
    ubicacion = models.ForeignKey(PerfilUsuario, on_delete=models.CASCADE)
    cantidad = models.IntegerField()
    comentario = models.TextField(blank=True, null=True)
    foto = models.ImageField(upload_to='devoluciones/', blank=True, null=True)
    cantidad_recuperada = models.IntegerField(default=0)
    cantidad_repuesta = models.IntegerField(default=0)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='pendiente')
    registrado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    fecha_registro = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Devolución'
        verbose_name_plural = 'Devoluciones'
        ordering = ['-fecha_registro']
        db_table = 'devoluciones'
    
    def __str__(self):
        return f"{self.producto.nombre} - {self.cantidad} unidades"

    @property
    def cantidad_pendiente(self):
        pendiente = self.cantidad - self.cantidad_recuperada - self.cantidad_repuesta
        return max(0, pendiente)
