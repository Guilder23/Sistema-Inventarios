from django.contrib import admin
from .models import Precio, HistorialPrecio


@admin.register(Precio)
class PrecioAdmin(admin.ModelAdmin):
    list_display = ('producto', 'precio_unitario', 'moneda', 'updated_at')
    search_fields = ('producto__codigo', 'producto__nombre')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(HistorialPrecio)
class HistorialPrecioAdmin(admin.ModelAdmin):
    list_display = ('producto', 'precio_anterior', 'precio_nuevo', 'actualizado_por', 'fecha')
    list_filter = ('fecha',)
    search_fields = ('producto__codigo',)
    readonly_fields = ('fecha',)
