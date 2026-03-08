from django.db import models
from django.contrib.auth.models import User


class Categoria(models.Model):
    """Modelo de Categoría de productos"""
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True, null=True)
    creado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='categorias_creadas')
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Categoría'
        verbose_name_plural = 'Categorías'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class Contenedor(models.Model):
    """Modelo de Contenedor de productos"""
    nombre = models.CharField(max_length=120, unique=True)
    proveedor = models.CharField(max_length=150)
    creado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='contenedores_creados')
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Contenedor'
        verbose_name_plural = 'Contenedores'
        ordering = ['nombre']

    def __str__(self):
        return f"{self.nombre} - {self.proveedor}"
    
    @property
    def stock_total(self):
        """Calcula el stock total que trae este contenedor"""
        return self.productos_contenedores.aggregate(
            total=models.Sum('cantidad')
        )['total'] or 0


class ProductoContenedor(models.Model):
    """Modelo intermedio para manejar la relación entre Productos y Contenedores
    Un producto puede llegar en múltiples contenedores, cada uno con su propia cantidad"""
    
    producto = models.ForeignKey('Producto', on_delete=models.CASCADE, 
                                related_name='productos_contenedores',
                                verbose_name='Producto')
    contenedor = models.ForeignKey('Contenedor', on_delete=models.CASCADE,
                                  related_name='productos_contenedores',
                                  verbose_name='Contenedor')
    cantidad_recibida = models.IntegerField(default=0, verbose_name='Cantidad recibida',
                                  help_text='Cantidad original que llegó en este contenedor (registro histórico)')
    cantidad = models.IntegerField(default=0, verbose_name='Cantidad disponible',
                                  help_text='Cantidad actualmente disponible en este contenedor')
    
    # Metadata
    creado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, 
                                  related_name='productos_contenedores_creados')
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Producto en Contenedor'
        verbose_name_plural = 'Productos en Contenedores'
        unique_together = ('producto', 'contenedor')  # Un producto solo una vez por contenedor
        ordering = ['-fecha_creacion']
    
    def __str__(self):
        return f"{self.producto.nombre} - {self.contenedor.nombre} ({self.cantidad} unidades)"
    
    def save(self, *args, **kwargs):
        """Guarda el ProductoContenedor"""
        super().save(*args, **kwargs)


class Producto(models.Model):
    """Modelo de Producto"""
    codigo = models.CharField(max_length=100, unique=True)
    nombre = models.CharField(max_length=200)
    categoria = models.ForeignKey('Categoria', on_delete=models.SET_NULL, null=True, blank=True, related_name='productos')
    descripcion = models.TextField(blank=True, null=True)
    foto = models.ImageField(upload_to='productos/', blank=True, null=True)
    unidades_por_caja = models.IntegerField(default=1)
    
    # Precios (administrador puede configurar todos)
    precio_compra = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    precio_caja = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    precio_mayor = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    precio_unidad = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    poliza = models.DecimalField(max_digits=10, decimal_places=2, default=0, blank=True, null=True)
    gastos = models.DecimalField(max_digits=10, decimal_places=2, default=0, blank=True, null=True)
    
    # Control de stock 
    # Cuando no hay ProductoContenedor, usar este valor como stock principal
    stock = models.IntegerField(default=0, help_text='Stock principal del producto')
    stock_critico = models.IntegerField(default=10)
    stock_bajo = models.IntegerField(default=30)
    
    # Auditoría
    creado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='productos_creados')
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    activo = models.BooleanField(default=True)
    
    class Meta:
        verbose_name = 'Producto'
        verbose_name_plural = 'Productos'
        ordering = ['nombre']
    
    def __str__(self):
        return f"{self.codigo} - {self.nombre}"
    
    def obtener_stock_por_contenedor(self):
        """Retorna un diccionario con el stock del producto en cada contenedor"""
        return self.productos_contenedores.values(
            'contenedor__nombre', 'cantidad', 'id'
        ).order_by('contenedor__nombre')
    
    def reducir_stock(self, cantidad, usuario=None):
        """
        Reduce el stock del producto restando de los ProductoContenedor disponibles.
        Retorna True si se pudo reducir completamente, False en caso contrario.
        """
        if cantidad <= 0:
            return False
        
        # Verificar que hay stock suficiente
        if self.stock < cantidad:
            return False
        
        # Restar de los contenedores con stock disponible (FIFO - primeros en entrar)
        cantidad_restante = cantidad
        contenedores_con_stock = self.productos_contenedores.filter(
            cantidad__gt=0
        ).order_by('fecha_creacion')
        
        for pc in contenedores_con_stock:
            if cantidad_restante <= 0:
                break
            
            if pc.cantidad >= cantidad_restante:
                # Este contenedor tiene suficiente
                pc.cantidad -= cantidad_restante
                cantidad_restante = 0
                pc.save(update_fields=['cantidad', 'fecha_actualizacion'])
            else:
                # Este contenedor no tiene suficiente, usar todo y continuar
                cantidad_restante -= pc.cantidad
                pc.cantidad = 0
                pc.save(update_fields=['cantidad', 'fecha_actualizacion'])
        
        return cantidad_restante == 0
    
    def aumentar_stock(self, cantidad, usuario=None, contenedor=None):
        """
        Aumenta el stock del producto agregando a un ProductoContenedor.
        Si no se especifica contenedor, usa el más reciente o crea uno genérico.
        Retorna True si se pudo aumentar, False en caso contrario.
        """
        if cantidad <= 0:
            return False
        
        # Si no se especifica contenedor, usar el más reciente o crear uno genérico
        if contenedor is None:
            # Buscar el contenedor más reciente de este producto
            ultimo_pc = self.productos_contenedores.order_by('-fecha_creacion').first()
            if ultimo_pc:
                ultimo_pc.cantidad += cantidad
                ultimo_pc.save(update_fields=['cantidad', 'fecha_actualizacion'])
                return True
            else:
                # No hay contenedores, buscar/crear uno genérico llamado "Stock General"
                from django.contrib.auth.models import User
                contenedor_general, creado = Contenedor.objects.get_or_create(
                    nombre='Stock General',
                    defaults={
                        'proveedor': 'Sistema',
                        'creado_por': usuario,
                        'activo': True
                    }
                )
                ProductoContenedor.objects.create(
                    producto=self,
                    contenedor=contenedor_general,
                    cantidad_recibida=cantidad,
                    cantidad=cantidad,
                    creado_por=usuario
                )
                return True
        else:
            # Usar el contenedor especificado
            pc, creado = ProductoContenedor.objects.get_or_create(
                producto=self,
                contenedor=contenedor,
                defaults={'cantidad_recibida': cantidad, 'cantidad': cantidad, 'creado_por': usuario}
            )
            if not creado:
                pc.cantidad_recibida += cantidad
                pc.cantidad += cantidad
                pc.save(update_fields=['cantidad_recibida', 'cantidad', 'fecha_actualizacion'])
            return True


class HistorialProducto(models.Model):
    """Historial de cambios en productos"""
    ACCIONES = (
        ('creacion', 'Creación'),
        ('edicion', 'Edición'),
        ('eliminacion', 'Eliminación'),
    )
    
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE, related_name='historial')
    accion = models.CharField(max_length=20, choices=ACCIONES)
    usuario = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    detalles = models.TextField()
    fecha = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Historial de Producto'
        verbose_name_plural = 'Historiales de Productos'
        ordering = ['-fecha']
    
    def __str__(self):
        return f"{self.producto.codigo} - {self.get_accion_display()} - {self.fecha}"


class ProductoDanado(models.Model):
    """Registro de productos dañados"""
    ESTADOS = (
        ('pendiente', 'Pendiente'),
        ('parcial', 'Parcial'),
        ('cerrado', 'Cerrado'),
    )

    producto = models.ForeignKey(Producto, on_delete=models.CASCADE)
    ubicacion = models.ForeignKey('usuarios.PerfilUsuario', on_delete=models.CASCADE)
    cantidad = models.IntegerField()
    comentario = models.TextField(blank=True, null=True)
    foto = models.ImageField(upload_to='danados/', blank=True, null=True)
    cantidad_recuperada = models.IntegerField(default=0)
    cantidad_repuesta = models.IntegerField(default=0)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='pendiente')
    registrado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    fecha_registro = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Producto Dañado'
        verbose_name_plural = 'Productos Dañados'
        ordering = ['-fecha_registro']
    
    def __str__(self):
        return f"{self.producto.nombre} - {self.cantidad} unidades"

    @property
    def cantidad_pendiente(self):
        pendiente = self.cantidad - self.cantidad_recuperada - self.cantidad_repuesta
        return max(0, pendiente)
