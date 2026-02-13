from django.db import models
from apps.usuarios.models import Usuario
from apps.productos.models import Producto


class Precio(models.Model):
    producto = models.OneToOneField(Producto, on_delete=models.CASCADE, primary_key=True, related_name='precio')
    
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    moneda = models.CharField(max_length=3, default='BOB')  # Bolivianos por defecto
    
    # Precios adicionales (opcional)
    precio_mayorista = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    precio_especial = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Auditoría
    actualizado_por = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, related_name='precios_actualizados')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Precio'
        verbose_name_plural = 'Precios'
    
    def __str__(self):
        return f"{self.producto.codigo} - {self.moneda} {self.precio_unitario}"


class HistorialPrecio(models.Model):
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE, related_name='historiales_precio')
    
    precio_anterior = models.DecimalField(max_digits=10, decimal_places=2)
    precio_nuevo = models.DecimalField(max_digits=10, decimal_places=2)
    
    actualizado_por = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True)
    fecha = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Historial Precio'
        verbose_name_plural = 'Historiales Precios'
        ordering = ['-fecha']
        indexes = [
            models.Index(fields=['producto']),
            models.Index(fields=['fecha']),
        ]
    
    def __str__(self):
        return f"{self.producto.codigo} - {self.precio_anterior} → {self.precio_nuevo}"
