from django.urls import path
from . import views

urlpatterns = [
    # Reportes
    path('', views.index_reportes, name='index_reportes'),
    path('inventario/', views.reporte_inventario, name='reporte_inventario'),
    path('ventas/', views.reporte_ventas, name='reporte_ventas'),
    path('ventas/exportar/', views.exportar_reporte_ventas, name='exportar_reporte_ventas'),
    path('ventas/datos/', views.datos_reporte_ventas, name='datos_reporte_ventas'),
    path('traspasos/', views.reporte_traspasos, name='reporte_traspasos'),
    path('contenedores/', views.reporte_contenedores, name='reporte_contenedores'),
    path('cajas/auditoria/', views.reporte_auditoria_cajas, name='reporte_auditoria_cajas'),
]
