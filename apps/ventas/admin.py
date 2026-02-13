from django.contrib import admin
from .models import Venta, DetalleVenta, AmortizacionCredito

class DetalleVentaInline(admin.TabularInline):
    model = DetalleVenta
    extra = 1

class AmortizacionCreditoInline(admin.TabularInline):
    model = AmortizacionCredito
    extra = 1

@admin.register(Venta)
class VentaAdmin(admin.ModelAdmin):
    list_display = ['codigo', 'cliente', 'ubicacion', 'tipo_pago', 'estado', 'total', 'fecha_elaboracion']
    list_filter = ['tipo_pago', 'estado', 'fecha_elaboracion']
    search_fields = ['codigo', 'cliente', 'razon_social']
    inlines = [DetalleVentaInline, AmortizacionCreditoInline]
    list_per_page = 20

@admin.register(DetalleVenta)
class DetalleVentaAdmin(admin.ModelAdmin):
    list_display = ['venta', 'producto', 'cantidad', 'precio_unitario', 'subtotal']
    search_fields = ['producto__nombre', 'venta__codigo']
    list_per_page = 20

@admin.register(AmortizacionCredito)
class AmortizacionCreditoAdmin(admin.ModelAdmin):
    list_display = ['venta', 'monto', 'fecha', 'registrado_por']
    list_filter = ['fecha']
    search_fields = ['venta__codigo', 'observaciones']
    list_per_page = 20
