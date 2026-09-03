from django.db import models
from django.contrib.auth.models import User


class MovimientoStock(models.Model):
    """
    Registro centralizado de todos los movimientos de stock por producto y ubicación.
    Captura ventas, anulaciones, devoluciones, traspasos, dañados, pedidos y ediciones manuales.
    """

    TIPOS = (
        ('venta',              'Venta'),
        ('anulacion_venta',    'Anulación de Venta'),
        ('devolucion',         'Devolución'),
        ('traspaso_salida',    'Traspaso - Salida'),
        ('traspaso_entrada',   'Traspaso - Entrada'),
        ('pedido_recibido',    'Pedido Recibido'),
        ('danado',             'Producto Dañado'),
        ('edicion_manual',     'Edición Manual'),
        ('entrada_contenedor', 'Entrada desde Contenedor'),
    )

    # Producto y ubicación
    producto = models.ForeignKey(
        'productos.Producto',
        on_delete=models.CASCADE,
        related_name='movimientos_stock',
        verbose_name='Producto',
    )
    ubicacion = models.ForeignKey(
        'usuarios.PerfilUsuario',
        on_delete=models.CASCADE,
        related_name='movimientos_stock',
        verbose_name='Ubicación',
        help_text='Almacén, tienda o depósito donde ocurrió el movimiento',
    )

    # Tipo y cantidades
    tipo = models.CharField(
        max_length=30,
        choices=TIPOS,
        verbose_name='Tipo de Movimiento',
    )
    cantidad = models.IntegerField(
        verbose_name='Cantidad',
        help_text='Positivo = entrada de stock, Negativo = salida de stock',
    )
    stock_anterior = models.IntegerField(
        verbose_name='Stock Anterior',
        help_text='Cantidad disponible ANTES del movimiento',
    )
    stock_actual = models.IntegerField(
        verbose_name='Stock Actual',
        help_text='Cantidad disponible DESPUÉS del movimiento',
    )

    # Referencia al origen
    referencia = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name='Referencia',
        help_text='Código de la venta, traspaso, pedido u operación que generó este movimiento',
    )

    # Auditoría
    usuario = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='movimientos_stock_generados',
        verbose_name='Usuario',
    )
    fecha = models.DateTimeField(auto_now_add=True, verbose_name='Fecha')
    notas = models.TextField(blank=True, null=True, verbose_name='Notas')

    class Meta:
        verbose_name = 'Movimiento de Stock'
        verbose_name_plural = 'Movimientos de Stock'
        ordering = ['-fecha']
        db_table = 'movimientos_stock'

    def __str__(self):
        signo = '+' if self.cantidad > 0 else ''
        return (
            f"[{self.get_tipo_display()}] {self.producto.codigo} "
            f"@ {self.ubicacion.nombre_ubicacion or self.ubicacion} "
            f"| {signo}{self.cantidad} "
            f"({self.stock_anterior} → {self.stock_actual})"
        )

    @property
    def es_entrada(self):
        return self.cantidad > 0

    @property
    def es_salida(self):
        return self.cantidad < 0
