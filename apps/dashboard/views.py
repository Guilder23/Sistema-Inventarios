from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from apps.productos.models import Producto
from apps.inventario.models import Stock, Movimiento
from apps.traspasos.models import Traspaso
from apps.pedidos.models import Pedido
from apps.ventas.models import NotaVenta
from apps.usuarios.models import Usuario
from django.db.models import Sum, Count


@login_required(login_url='index')
def dashboard(request):
    """Vista principal del dashboard"""
    
    # Estadísticas generales
    total_productos = Producto.objects.filter(activo=True).count()
    total_movimientos = Movimiento.objects.count()
    
    # Stock crítico
    stocks_criticos = Stock.objects.filter(estado='ROJO').count()
    stocks_alerta = Stock.objects.filter(estado='NARANJA').count()
    
    # Últimos movimientos
    ultimos_movimientos = Movimiento.objects.select_related('producto', 'usuario')[:10]
    
    # Estadísticas de traspasos
    traspasos_pendientes = Traspaso.objects.filter(estado='PENDIENTE').count()
    
    # Estadísticas de pedidos
    pedidos_pendientes = Pedido.objects.filter(estado='PENDIENTE').count()
    
    # Últimas ventas
    ultimas_ventas = NotaVenta.objects.select_related('almacen', 'vendedor')[:10]
    
    # Total vendido
    total_vendido = NotaVenta.objects.aggregate(total=Sum('total'))['total'] or 0
    
    context = {
        'total_productos': total_productos,
        'total_movimientos': total_movimientos,
        'stocks_criticos': stocks_criticos,
        'stocks_alerta': stocks_alerta,
        'ultimos_movimientos': ultimos_movimientos,
        'traspasos_pendientes': traspasos_pendientes,
        'pedidos_pendientes': pedidos_pendientes,
        'ultimas_ventas': ultimas_ventas,
        'total_vendido': total_vendido,
    }
    
    return render(request, 'dashboard/dashboard.html', context)


def index(request):
    """Página principal con modal de login"""
    if request.user.is_authenticated:
        return redirect('dashboard')
    
    context = {
        'roles': Usuario.ROLES_CHOICES if hasattr(Usuario, 'ROLES_CHOICES') else []
    }
    return render(request, 'index.html', context)
