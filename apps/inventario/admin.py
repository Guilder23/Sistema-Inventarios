from django.contrib import admin
from .models import Inventario, MovimientoInventario

@admin.register(Inventario)
class InventarioAdmin(admin.ModelAdmin):
    list_display = ['producto', 'ubicacion', 'cantidad', 'estado_stock', 'fecha_actualizacion']
    list_filter = ['ubicacion', 'fecha_actualizacion']
    search_fields = ['producto__nombre', 'producto__codigo', 'ubicacion__nombre_ubicacion']
    list_per_page = 20

@admin.register(MovimientoInventario)
class MovimientoInventarioAdmin(admin.ModelAdmin):
    list_display = ['producto', 'ubicacion', 'tipo', 'cantidad', 'fecha']
    list_filter = ['tipo', 'fecha', 'ubicacion']
    search_fields = ['producto__nombre', 'referencia', 'comentario']
    list_per_page = 20
