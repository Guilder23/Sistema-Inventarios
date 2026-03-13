from django.db import models
from apps.productos.models import Producto
from apps.usuarios.models import PerfilUsuario

class Inventario(models.Model):
    """Control de inventario por ubicación"""
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE)
    ubicacion = models.ForeignKey(PerfilUsuario, on_delete=models.CASCADE)
    cantidad = models.IntegerField(default=0)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Inventario'
        verbose_name_plural = 'Inventarios'
        unique_together = ['producto', 'ubicacion']
        ordering = ['producto__nombre']
    
    def __str__(self):
        return f"{self.producto.nombre} - {self.ubicacion.nombre_ubicacion}: {self.cantidad}"
    
    @property
    def estado_stock(self):
        """Retorna el estado del stock: critico, bajo, normal"""
        if self.cantidad <= self.producto.stock_critico:
            return 'critico'
        elif self.cantidad <= self.producto.stock_bajo:
            return 'bajo'
        return 'normal'


class MovimientoInventario(models.Model):
    """Registro de todos los movimientos de inventario"""
    TIPOS = (
        ('entrada', 'Entrada'),
        ('salida', 'Salida'),
        ('traspaso_enviado', 'Traspaso Enviado'),
        ('traspaso_recibido', 'Traspaso Recibido'),
        ('venta', 'Venta'),
        ('devolucion', 'Devolución'),
        ('danado', 'Producto Dañado'),
    )
    
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE)
    ubicacion = models.ForeignKey(PerfilUsuario, on_delete=models.CASCADE)
    tipo = models.CharField(max_length=30, choices=TIPOS)
    cantidad = models.IntegerField()
    fecha = models.DateTimeField(auto_now_add=True)
    referencia = models.CharField(max_length=100, blank=True, null=True)
    comentario = models.TextField(blank=True, null=True)
    
    class Meta:
        verbose_name = 'Movimiento de Inventario'
        verbose_name_plural = 'Movimientos de Inventario'
        ordering = ['-fecha']
    
    def __str__(self):
        return f"{self.tipo} - {self.producto.nombre} ({self.cantidad})"
