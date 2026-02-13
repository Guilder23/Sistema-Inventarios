from django.urls import path
from . import views

urlpatterns = [
    # Ventas
    path('', views.listar_ventas, name='listar_ventas'),
    path('crear/', views.crear_venta, name='crear_venta'),
    path('<int:id>/ver/', views.ver_venta, name='ver_venta'),
    path('<int:id>/pdf/', views.generar_pdf_venta, name='generar_pdf_venta'),
    
    # Amortizaciones
    path('<int:venta_id>/amortizacion/', views.registrar_amortizacion, name='registrar_amortizacion'),
]
