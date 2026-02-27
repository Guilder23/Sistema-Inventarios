from django.contrib import admin
from .models import Categoria, Contenedor, Producto, HistorialProducto, ProductoDanado


@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'activo', 'creado_por', 'fecha_creacion']
    list_filter = ['activo', 'fecha_creacion']
    search_fields = ['nombre', 'descripcion']
    list_per_page = 20


@admin.register(Contenedor)
class ContenedorAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'proveedor', 'stock', 'activo', 'creado_por', 'fecha_creacion']
    list_filter = ['activo', 'fecha_creacion']
    search_fields = ['nombre', 'proveedor']
    list_per_page = 20

@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = ['codigo', 'nombre', 'categoria', 'contenedor', 'stock', 'precio_unitario_display', 'activo', 'fecha_creacion']
    list_filter = ['activo', 'fecha_creacion']
    search_fields = ['codigo', 'nombre', 'descripcion']
    list_per_page = 20
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('codigo', 'nombre', 'categoria', 'contenedor', 'descripcion', 'foto', 'activo')
        }),
        ('Precios (Configurables por Administrador)', {
            'fields': ('precio_compra', 'precio_caja', 'precio_mayor', 'precio_unidad', 'poliza', 'gastos'),
            'description': 'Todos los precios pueden ser editados por el administrador'
        }),
        ('Stock', {
            'fields': ('unidades_por_caja', 'stock', 'stock_critico', 'stock_bajo')
        }),
        ('Auditoría', {
            'fields': ('creado_por', 'fecha_creacion', 'fecha_actualizacion'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('creado_por', 'fecha_creacion', 'fecha_actualizacion')
    
    def precio_unitario_display(self, obj):
        return f"Bs. {obj.precio_unidad}"
    precio_unitario_display.short_description = 'Precio Unitario'
    
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
