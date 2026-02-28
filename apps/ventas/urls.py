from django.urls import path
from . import views
from .views import generar_pdf_venta

app_name = 'ventas'

urlpatterns = [
    # Ventas
    path('', views.listar_ventas, name='listar_ventas'),
    path('crear/', views.crear_venta, name='crear_venta'),
    path('guardar/', views.guardar_venta, name='guardar_venta'),
    path('api/buscar-productos/', views.buscar_productos, name='buscar_productos'),
    path('<int:id>/ver/', views.ver_venta, name='ver_venta'),
    path('<int:id>/pdf/', generar_pdf_venta, name='pdf_venta'),
    path('tienda/crear/', views.crear_venta_tienda, name='crear_venta_tienda'),
    path('tienda/guardar/', views.guardar_venta_tienda, name='guardar_venta_tienda'),
    path('tienda/listar/', views.listar_ventas_tienda, name='listar_ventas_tienda'),
    path('<int:id>/anular/', views.anular_venta, name='anular_venta'),   
        
    # Amortizaciones
    path('<int:venta_id>/amortizacion/', views.registrar_amortizacion, name='registrar_amortizacion'),
]
