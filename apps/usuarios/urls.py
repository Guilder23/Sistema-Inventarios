from django.urls import path
from django.contrib.auth import views as auth_views
from . import views

urlpatterns = [
    # Página de inicio / Índice (login para no autenticados)
    path('inicio/', views.index, name='index'),
    
    # Autenticación
    path('login/', auth_views.LoginView.as_view(template_name='inicio/modals/login.html'), name='login'),
    path('logout/', views.custom_logout, name='logout'),
    
    # Dashboard (solo autenticados)
    path('dashboard/', views.dashboard, name='dashboard'),
    
    # Gestión de usuarios (solo administrador)
    path('usuarios/', views.listar_usuarios, name='listar_usuarios'),
    path('usuarios/crear/', views.crear_usuario, name='crear_usuario'),
    path('usuarios/<int:id>/obtener/', views.obtener_usuario, name='obtener_usuario'),
    path('usuarios/<int:id>/editar/', views.editar_usuario, name='editar_usuario'),
    path('usuarios/<int:id>/eliminar/', views.bloquear_usuario, name='eliminar_usuario'),
    path('usuarios/<int:id>/bloquear/', views.bloquear_usuario, name='bloquear_usuario'),
]
