from django.contrib import admin
from .models import Traspaso, DetalleTraspaso

class DetalleTraspasoInline(admin.TabularInline):
    model = DetalleTraspaso
    extra = 1

@admin.register(Traspaso)
class TraspasoAdmin(admin.ModelAdmin):
    list_display = ['codigo', 'tipo', 'origen', 'destino', 'estado', 'fecha_creacion']
    list_filter = ['tipo', 'estado', 'fecha_creacion']
    search_fields = ['codigo', 'comentario']
    inlines = [DetalleTraspasoInline]
    list_per_page = 20

@admin.register(DetalleTraspaso)
class DetalleTraspasoAdmin(admin.ModelAdmin):
    list_display = ['traspaso', 'producto', 'cantidad']
    list_filter = ['traspaso__estado']
    search_fields = ['producto__nombre', 'traspaso__codigo']
    list_per_page = 20
