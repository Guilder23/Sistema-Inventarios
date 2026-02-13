from django.urls import path
from . import views

app_name = 'tiendas'

urlpatterns = [
    path('', views.listar_tiendas, name='listar'),
    path('crear/', views.crear_tienda, name='crear'),
    path('<int:pk>/obtener/', views.obtener_tienda, name='obtener'),
    path('<int:pk>/editar/', views.editar_tienda, name='editar'),
    path('<int:pk>/cambiar-estado/', views.cambiar_estado_tienda, name='cambiar_estado'),
]
