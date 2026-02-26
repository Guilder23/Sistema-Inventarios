from django.urls import path
from . import views

urlpatterns = [
    # Inventario
    path('', views.ver_inventario, name='ver_inventario'),
    path('deposito/', views.ver_inventario_deposito, name='ver_inventario_deposito'),
    path('ubicacion/<int:ubicacion_id>/', views.ver_inventario_ubicacion, name='ver_inventario_ubicacion'),
    path('producto/<int:producto_id>/asignar-precio/', views.asignar_precio, name='asignar_precio'),
    
    # Movimientos
    path('movimientos/', views.listar_movimientos, name='listar_movimientos'),
]
