from django.urls import path
from . import views

urlpatterns = [
    # Reportes
    path('', views.index_reportes, name='index_reportes'),
    path('inventario/', views.reporte_inventario, name='reporte_inventario'),
    path('ventas/', views.reporte_ventas, name='reporte_ventas'),
    path('traspasos/', views.reporte_traspasos, name='reporte_traspasos'),
]
