from django.contrib import admin
from .models import Pedido, DetallePedido

class DetallePedidoInline(admin.TabularInline):
    model = DetallePedido
    extra = 1

@admin.register(Pedido)
class PedidoAdmin(admin.ModelAdmin):
    list_display = ['codigo', 'solicitante', 'proveedor', 'estado', 'fecha_solicitud']
    list_filter = ['estado', 'fecha_solicitud']
    search_fields = ['codigo', 'comentario']
    inlines = [DetallePedidoInline]
    list_per_page = 20

@admin.register(DetallePedido)
class DetallePedidoAdmin(admin.ModelAdmin):
    list_display = ['pedido', 'producto', 'cantidad']
    search_fields = ['producto__nombre', 'pedido__codigo']
    list_per_page = 20
