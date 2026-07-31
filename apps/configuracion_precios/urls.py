from django.urls import path

from . import views


urlpatterns = [
    path('', views.listar_configuraciones_precios, name='listar_configuraciones_precios'),
    path('crear/', views.crear_configuracion_precios, name='crear_configuracion_precios'),
    path('<int:pk>/obtener/', views.obtener_configuracion_precios, name='obtener_configuracion_precios'),
    path('<int:pk>/editar/', views.editar_configuracion_precios, name='editar_configuracion_precios'),
    path('<int:pk>/eliminar/', views.eliminar_configuracion_precios, name='eliminar_configuracion_precios'),
]
