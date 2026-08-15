from django.urls import path

from .views import (
    abrir_caja,
    registrar_movimiento_caja,
    resumen_caja_actual,
    cerrar_caja,
    generar_pdf_arqueo,
)

app_name = 'ventas_api'

urlpatterns = [
    path('caja/abrir/', abrir_caja, name='abrir_caja'),
    path('caja/movimiento/', registrar_movimiento_caja, name='registrar_movimiento_caja'),
    path('caja/resumen-actual/', resumen_caja_actual, name='resumen_caja_actual'),
    path('caja/cerrar/', cerrar_caja, name='cerrar_caja'),
    path('caja/<int:sesion_id>/pdf/', generar_pdf_arqueo, name='generar_pdf_arqueo'),
]
