from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from apps.productos.models import Producto
from apps.inventario.models import Inventario, MovimientoInventario
from apps.traspasos.models import Traspaso
from apps.pedidos.models import Pedido
from apps.ventas.models import Venta, DetalleVenta
from apps.usuarios.models import Usuario
from django.db.models import Sum, Count, Q, F
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal


@login_required(login_url='index')
def dashboard(request):
    """Vista principal del dashboard - Muestra métricas clave del sistema"""
    
    # ======= PRODUCTOS Y STOCK =======
    # Total de productos activos registrados
    total_productos = Producto.objects.filter(activo=True).count()
    
    # Productos con stock disponible en todas las ubicaciones
    productos_en_stock = Inventario.objects.filter(cantidad__gt=0).values('producto').distinct().count()
    
    # Stock crítico: productos bajo mínimo requerido
    inventario_critico = Inventario.objects.select_related('producto', 'ubicacion').filter(
        cantidad__lte=F('producto__stock_critico')
    ).count()
    
    # Stock bajo: productos cerca del mínimo
    inventario_bajo = Inventario.objects.select_related('producto', 'ubicacion').filter(
        cantidad__lte=F('producto__stock_bajo'),
        cantidad__gt=F('producto__stock_critico')
    ).count()
    
    # ======= VENTAS =======
    # Fecha de inicio del mes actual
    inicio_mes = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Total vendido en el mes actual (todas las monedas)
    ventas_mes = Venta.objects.filter(
        fecha_elaboracion__gte=inicio_mes,
        estado='completada'
    )
    total_ventas_mes_bob = ventas_mes.filter(moneda='BOB').aggregate(total=Sum('total'))['total'] or Decimal('0')
    total_ventas_mes_usd = ventas_mes.filter(moneda='USD').aggregate(total=Sum('total'))['total'] or Decimal('0')
    cantidad_ventas_mes = ventas_mes.count()
    
    # Ventas del día
    hoy = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
    ventas_hoy = Venta.objects.filter(fecha_elaboracion__gte=hoy, estado='completada').count()
    
    # Ventas pendientes
    ventas_pendientes = Venta.objects.filter(estado='pendiente').count()
    
    # ======= TRASPASOS Y PEDIDOS =======
    # Traspasos pendientes de atención
    traspasos_pendientes = Traspaso.objects.filter(estado='PENDIENTE').count()
    
    # Pedidos pendientes de completar
    pedidos_pendientes = Pedido.objects.filter(estado='PENDIENTE').count()
    
    # ======= MOVIMIENTOS RECIENTES =======
    # Últimos 10 movimientos de inventario
    ultimos_movimientos = MovimientoInventario.objects.select_related(
        'producto', 'ubicacion'
    ).order_by('-fecha')[:10]
    
    # ======= ÚLTIMAS VENTAS =======
    # Últimas 10 ventas registradas
    ultimas_ventas = Venta.objects.select_related(
        'ubicacion', 'vendedor'
    ).order_by('-fecha_elaboracion')[:10]
    
    # ======= PRODUCTOS MÁS VENDIDOS DEL MES =======
    # Top 5 productos más vendidos este mes
    productos_mas_vendidos = DetalleVenta.objects.filter(
        venta__fecha_elaboracion__gte=inicio_mes,
        venta__estado='completada'
    ).values(
        'producto__id',
        'producto__codigo',
        'producto__nombre'
    ).annotate(
        total_vendido=Sum('cantidad')
    ).order_by('-total_vendido')[:5]
    
    # ======= STOCK CRÍTICO DETALLADO =======
    # Productos en estado crítico para alertas
    productos_stock_critico = Inventario.objects.select_related(
        'producto', 'ubicacion'
    ).filter(
        cantidad__lte=F('producto__stock_critico')
    ).order_by('cantidad')[:10]
    
    context = {
        # Productos y stock
        'total_productos': total_productos,
        'productos_en_stock': productos_en_stock,
        'inventario_critico': inventario_critico,
        'inventario_bajo': inventario_bajo,
        
        # Ventas
        'total_ventas_mes_bob': total_ventas_mes_bob,
        'total_ventas_mes_usd': total_ventas_mes_usd,
        'cantidad_ventas_mes': cantidad_ventas_mes,
        'ventas_hoy': ventas_hoy,
        'ventas_pendientes': ventas_pendientes,
        
        # Traspasos y pedidos
        'traspasos_pendientes': traspasos_pendientes,
        'pedidos_pendientes': pedidos_pendientes,
        
        # Actividad reciente
        'ultimos_movimientos': ultimos_movimientos,
        'ultimas_ventas': ultimas_ventas,
        'productos_mas_vendidos': productos_mas_vendidos,
        'productos_stock_critico': productos_stock_critico,
    }
    
    return render(request, 'dashboard/admin_dashboard.html', context)


def index(request):
    """Página principal con modal de login"""
    if request.user.is_authenticated:
        return redirect('dashboard')
    
    context = {
        'roles': Usuario.ROLES_CHOICES if hasattr(Usuario, 'ROLES_CHOICES') else []
    }
    return render(request, 'index.html', context)
