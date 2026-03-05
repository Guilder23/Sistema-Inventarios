from django.contrib import admin
from .models import Categoria, Contenedor, Producto, HistorialProducto, ProductoDanado, ProductoContenedor


@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'activo', 'creado_por', 'fecha_creacion']
    list_filter = ['activo', 'fecha_creacion']
    search_fields = ['nombre', 'descripcion']
    list_per_page = 20


class ProductoContenedorInline(admin.TabularInline):
    """Inline para agregar productos a un contenedor"""
    model = ProductoContenedor
    extra = 1
    fields = ['producto', 'cantidad', 'fecha_creacion', 'creado_por']
    readonly_fields = ['fecha_creacion', 'creado_por']
    verbose_name = 'Producto'
    verbose_name_plural = 'Productos en este Contenedor'


@admin.register(Contenedor)
class ContenedorAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'proveedor', 'stock_total_display', 'activo', 'creado_por', 'fecha_creacion']
    list_filter = ['activo', 'fecha_creacion']
    search_fields = ['nombre', 'proveedor']
    list_per_page = 20
    inlines = [ProductoContenedorInline]
    
    def stock_total_display(self, obj):
        return obj.stock_total
    stock_total_display.short_description = 'Stock Total'


class ProductoContenedorProductoInline(admin.TabularInline):
    """Inline para ver/editar en qué contenedores está un producto"""
    model = ProductoContenedor
    extra = 1
    fields = ['contenedor', 'cantidad', 'fecha_creacion']
    readonly_fields = ['fecha_creacion']
    verbose_name = 'Contenedor'
    verbose_name_plural = 'Contenedores de este Producto'


@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = ['codigo', 'nombre', 'categoria', 'stock_display', 'precio_unitario_display', 'activo', 'fecha_creacion']
    list_filter = ['activo', 'fecha_creacion', 'categoria']
    search_fields = ['codigo', 'nombre', 'descripcion']
    list_per_page = 20
    inlines = [ProductoContenedorProductoInline]
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('codigo', 'nombre', 'categoria', 'descripcion', 'foto', 'activo')
        }),
        ('Precios (Configurables por Administrador)', {
            'fields': ('precio_compra', 'precio_caja', 'precio_mayor', 'precio_unidad', 'poliza', 'gastos'),
            'description': 'Todos los precios pueden ser editados por el administrador'
        }),
        ('Stock', {
            'fields': ('stock', 'unidades_por_caja', 'stock_critico', 'stock_bajo'),
            'description': 'El stock principal se guarda en el campo Slock. El stock desde contenedores es un cálculo adicional'
        }),
        ('Auditoría', {
            'fields': ('creado_por', 'fecha_creacion', 'fecha_actualizacion'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('creado_por', 'fecha_creacion', 'fecha_actualizacion')
    
    def stock_display(self, obj):
        return f"{obj.stock} unidades"
    stock_display.short_description = 'Stock Total'
    
    def precio_unitario_display(self, obj):
        return f"Bs. {obj.precio_unidad}"
    precio_unitario_display.short_description = 'Precio Unitario'
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.creado_por = request.user
        super().save_model(request, obj, form, change)


@admin.register(ProductoContenedor)
class ProductoContenedorAdmin(admin.ModelAdmin):
    """Admin para ver/editar la relación Producto-Contenedor"""
    list_display = ['producto', 'contenedor', 'cantidad', 'fecha_creacion', 'creado_por']
    list_filter = ['fecha_creacion', 'contenedor', 'producto']
    search_fields = ['producto__nombre', 'contenedor__nombre']
    list_per_page = 30
    readonly_fields = ['fecha_creacion', 'fecha_actualizacion', 'creado_por']
    
    fieldsets = (
        ('Información', {
            'fields': ('producto', 'contenedor', 'cantidad')
        }),
        ('Auditoría', {
            'fields': ('creado_por', 'fecha_creacion', 'fecha_actualizacion'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.creado_por = request.user
        super().save_model(request, obj, form, change)

@admin.register(HistorialProducto)
class HistorialProductoAdmin(admin.ModelAdmin):
    list_display = ['producto', 'accion', 'usuario', 'fecha']
    list_filter = ['accion', 'fecha']
    search_fields = ['producto__nombre', 'usuario__username']
    list_per_page = 20

@admin.register(ProductoDanado)
class ProductoDanadoAdmin(admin.ModelAdmin):
    list_display = ['producto', 'ubicacion', 'cantidad', 'cantidad_recuperada', 'cantidad_repuesta', 'estado', 'registrado_por', 'fecha_registro']
    list_filter = ['fecha_registro', 'ubicacion', 'estado']
    search_fields = ['producto__nombre', 'comentario']
    list_per_page = 20
