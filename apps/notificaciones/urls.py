from django.urls import path
from . import views

urlpatterns = [
    # Notificaciones
    path('', views.listar_notificaciones, name='listar_notificaciones'),
    path('obtener/', views.obtener_notificaciones, name='obtener_notificaciones'),
    path('contador/', views.contador_notificaciones, name='contador_notificaciones'),
    path('marcar-leida/<int:id>/', views.marcar_leida, name='marcar_notificacion_leida'),
    path('marcar-todas-leidas/', views.marcar_todas_leidas, name='marcar_todas_leidas'),
]
