from django.urls import path
from . import views

app_name = 'depositos'

urlpatterns = [
    path('', views.listar_depositos, name='listar'),
    path('crear/', views.crear_deposito, name='crear'),
    path('<int:pk>/obtener/', views.obtener_deposito, name='obtener'),
    path('<int:pk>/editar/', views.editar_deposito, name='editar'),
    path('<int:pk>/cambiar-estado/', views.cambiar_estado_deposito, name='cambiar_estado'),
]
