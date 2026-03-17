from django.urls import path, include
from . import views
from rest_framework.routers import DefaultRouter
from .views import InventarioAPIViewSet


router = DefaultRouter()
router.register(r'inventario', InventarioAPIViewSet, basename='inventario_api')

urlpatterns = [
    # 1. Ponemos la API bajo el prefijo /api/
    path('api/', include(router.urls)),
    path('api/roles/', views.RolesAPIView.as_view(), name='roles_api'),
    # Inventario
    path('', views.ver_inventario, name='ver_inventario'),
    path('general/', views.ver_inventario_general, name='ver_inventario_general'), #Para inventario general consolidado
    path('deposito/', views.ver_inventario_deposito, name='ver_inventario_deposito'),
    path('ubicacion/<int:ubicacion_id>/', views.ver_inventario_ubicacion, name='ver_inventario_ubicacion'),
    path('producto/<int:producto_id>/asignar-precio/', views.asignar_precio, name='asignar_precio'),
    
    # AJAX
    path('ajax/ubicaciones-por-rol/', views.obtener_ubicaciones_por_rol, name='obtener_ubicaciones_por_rol'), #AJAX para obtener ubicaciones según rol del usuario
    
    # Movimientos
    path('movimientos/', views.listar_movimientos, name='listar_movimientos'),
]
