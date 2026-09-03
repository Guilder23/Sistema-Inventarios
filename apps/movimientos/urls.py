from django.urls import path
from . import views

app_name = 'movimientos'

urlpatterns = [
    path('', views.listar_movimientos, name='listar'),
    path('<int:pk>/', views.detalle_movimiento, name='detalle'),
    path('api/depositos/<int:tienda_id>/', views.api_depositos_por_tienda, name='api_depositos'),
]
