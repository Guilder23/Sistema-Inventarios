from django.contrib import admin
from .models import Producto, HistorialProducto, ProductoDanado

@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = ['codigo', 'nombre', 'precio_caja', 'precio_unidad', 'activo', 'fecha_creacion']
    list_filter = ['activo', 'fecha_creacion']
    search_fields = ['codigo', 'nombre', 'descripcion']
    list_per_page = 20

@admin.register(HistorialProducto)
class HistorialProductoAdmin(admin.ModelAdmin):
    list_display = ['producto', 'accion', 'usuario', 'fecha']
    list_filter = ['accion', 'fecha']
    search_fields = ['producto__nombre', 'usuario__username']
    list_per_page = 20

@admin.register(ProductoDanado)
class ProductoDanadoAdmin(admin.ModelAdmin):
    list_display = ['producto', 'ubicacion', 'cantidad', 'registrado_por', 'fecha_registro']
    list_filter = ['fecha_registro', 'ubicacion']
    search_fields = ['producto__nombre', 'comentario']
    list_per_page = 20
