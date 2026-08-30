from django.contrib import admin
from .models import MovimientoStock


@admin.register(MovimientoStock)
class MovimientoStockAdmin(admin.ModelAdmin):
    list_display = (
        'fecha', 'producto', 'ubicacion', 'tipo',
        'cantidad', 'stock_anterior', 'stock_actual',
        'referencia', 'usuario',
    )
    list_filter = ('tipo', 'ubicacion', 'fecha')
    search_fields = ('producto__nombre', 'producto__codigo', 'referencia', 'notas')
    readonly_fields = (
        'fecha', 'producto', 'ubicacion', 'tipo',
        'cantidad', 'stock_anterior', 'stock_actual',
        'referencia', 'usuario',
    )
    ordering = ('-fecha',)

    def has_add_permission(self, request):
        return False  # Los movimientos solo se crean por código

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser
