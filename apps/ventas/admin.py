from django.contrib import admin
from .models import (
    Venta,
    DetalleVenta,
    AmortizacionCredito,
    SolicitudAnulacionVenta,
    SesionCaja,
    MovimientoCaja,
)

class DetalleVentaInline(admin.TabularInline):
    model = DetalleVenta
    extra = 1

class AmortizacionCreditoInline(admin.TabularInline):
    model = AmortizacionCredito
    extra = 1

class SolicitudAnulacionVentaInline(admin.TabularInline):
    model = SolicitudAnulacionVenta
    extra = 0
    readonly_fields = ['solicitado_por', 'fecha_solicitud', 'respondido_por', 'fecha_respuesta']

@admin.register(Venta)
class VentaAdmin(admin.ModelAdmin):
    list_display = ['codigo', 'cliente', 'ubicacion', 'tipo_pago', 'descuento_tipo', 'estado', 'total', 'fecha_elaboracion']
    list_filter = ['tipo_pago', 'descuento_tipo', 'estado', 'fecha_elaboracion']
    search_fields = ['codigo', 'cliente', 'razon_social', 'comentario']
    inlines = [DetalleVentaInline, AmortizacionCreditoInline, SolicitudAnulacionVentaInline]
    list_per_page = 20

@admin.register(DetalleVenta)
class DetalleVentaAdmin(admin.ModelAdmin):
    list_display = ['venta', 'producto', 'tipo_vendedor', 'modalidad', 'cantidad_cajas', 'cantidad', 'precio_unitario', 'subtotal']
    search_fields = ['producto__nombre', 'venta__codigo']
    list_per_page = 20

@admin.register(AmortizacionCredito)
class AmortizacionCreditoAdmin(admin.ModelAdmin):
    list_display = ['venta', 'monto', 'fecha', 'registrado_por']
    list_filter = ['fecha']
    search_fields = ['venta__codigo', 'observaciones']
    list_per_page = 20


class MovimientoCajaInline(admin.TabularInline):
    model = MovimientoCaja
    extra = 0
    readonly_fields = ['fecha', 'registrado_por']


@admin.register(SesionCaja)
class SesionCajaAdmin(admin.ModelAdmin):
    list_display = ['id', 'cajero', 'ubicacion', 'estado', 'fecha_apertura', 'fecha_cierre', 'monto_inicial', 'monto_real_efectivo', 'diferencia_efectivo', 'total_general_recaudado']
    list_filter = ['estado', 'fecha_apertura', 'fecha_cierre']
    search_fields = ['cajero__username', 'ubicacion__nombre_ubicacion']
    inlines = [MovimientoCajaInline]


@admin.register(MovimientoCaja)
class MovimientoCajaAdmin(admin.ModelAdmin):
    list_display = ['sesion_caja', 'tipo', 'monto', 'concepto', 'fecha', 'registrado_por']
    list_filter = ['tipo', 'fecha']
    search_fields = ['concepto', 'sesion_caja__cajero__username']
    list_per_page = 30

@admin.register(SolicitudAnulacionVenta)
class SolicitudAnulacionVentaAdmin(admin.ModelAdmin):
    list_display = ['venta', 'solicitado_por', 'estado', 'fecha_solicitud', 'respondido_por']
    list_filter = ['estado', 'fecha_solicitud']
    search_fields = ['venta__codigo', 'comentario']
    readonly_fields = ['solicitado_por', 'fecha_solicitud', 'respondido_por', 'fecha_respuesta']
    list_per_page = 20
