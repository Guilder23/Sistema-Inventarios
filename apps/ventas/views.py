import json
from decimal import Decimal
from io import BytesIO

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpResponse, FileResponse, HttpResponseForbidden
from django.db import transaction
from django.db.models import Q, Sum
from django.utils import timezone
from django.contrib import messages
from django.urls import reverse
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from datetime import datetime

from apps.ventas.models import Venta, DetalleVenta, AmortizacionCredito, SolicitudAnulacionVenta
from apps.productos.models import Producto, ProductoContenedor
from apps.servicios.tipos_cambios import obtener_tipo_cambio_usd
from apps.inventario.models import Inventario
from apps.vendedores.models import Vendedor
from apps.tiendas.models import Tienda
from apps.usuarios.models import PerfilUsuario

def convertir_monto_para_mostrar(venta, monto):
    """Devuelve el monto tal como fue guardado en la moneda de la venta."""
    valor = Decimal(str(monto or '0'))
    return valor.quantize(Decimal('0.01'))


def obtener_simbolo_moneda(moneda):
    return '$' if moneda == 'USD' else 'Bs.'


def obtener_descripcion_moneda(moneda):
    return 'USD ($)' if moneda == 'USD' else 'BOB (Bs.)'


def convertir_bs_a_moneda_venta(monto_bs, moneda, tipo_cambio):
    valor = Decimal(str(monto_bs or '0'))
    tc = Decimal(str(tipo_cambio or '1'))

    if moneda == 'USD' and tc > 0:
        return (valor / tc).quantize(Decimal('0.01'))

    return valor.quantize(Decimal('0.01'))


def obtener_precio_base_producto(producto, modalidad):
    unidades_por_caja = int(producto.unidades_por_caja or 1)
    precio_unidad = Decimal(str(producto.precio_unidad or 0))
    precio_caja = Decimal(str(producto.precio_caja or 0))
    precio_mayor = Decimal(str(producto.precio_mayor or 0))

    if modalidad == 'caja':
        if precio_caja > 0:
            return precio_caja
        return (precio_unidad * Decimal(str(unidades_por_caja))).quantize(Decimal('0.01'))

    if modalidad == 'mayor':
        return precio_mayor if precio_mayor > 0 else precio_unidad

    return precio_unidad


def normalizar_tipo_vendedor(valor, fallback=''):
    tipo = (valor or fallback or '').strip().lower()
    if tipo in {'deposito', 'depósito'}:
        return 'deposito'
    if tipo in {'tienda', 'almacen', 'almacén'}:
        return 'almacen' if tipo in {'almacen', 'almacén'} else 'tienda'
    return fallback or ''


def obtener_label_tipo_vendedor(tipo):
    etiquetas = {
        'almacen': 'Almacén',
        'tienda': 'Tienda',
        'deposito': 'Depósito',
        'mixto': 'Mixta',
    }
    return etiquetas.get(tipo or '', 'Sin especificar')


def normalizar_modalidad(valor, fallback='unidad'):
    modalidad = (valor or fallback or 'unidad').strip().lower()
    return modalidad if modalidad in {'unidad', 'caja', 'mayor'} else fallback


def obtener_label_modalidad(modalidad):
    etiquetas = {
        'unidad': 'Unidad',
        'caja': 'Caja',
        'mayor': 'Mayor',
    }
    return etiquetas.get(normalizar_modalidad(modalidad), 'Unidad')


def obtener_tipo_vendedor_fallback_venta(venta):
    if getattr(venta.ubicacion, 'rol', '') == 'tienda':
        return 'tienda'
    return 'almacen'


def obtener_tipo_vendedor_detalle(detalle):
    tipo = normalizar_tipo_vendedor(getattr(detalle, 'tipo_vendedor', ''), '')
    if tipo:
        return tipo
    return obtener_tipo_vendedor_fallback_venta(detalle.venta)


def obtener_modalidad_detalle(detalle):
    return normalizar_modalidad(getattr(detalle, 'modalidad', ''), 'unidad')


def obtener_cantidad_cajas_detalle(detalle):
    cajas_guardadas = int(getattr(detalle, 'cantidad_cajas', 0) or 0)
    if cajas_guardadas > 0:
        return cajas_guardadas

    modalidad = obtener_modalidad_detalle(detalle)
    unidades_por_caja = int(getattr(detalle.producto, 'unidades_por_caja', 1) or 1)
    cantidad = int(getattr(detalle, 'cantidad', 0) or 0)

    if modalidad == 'caja' and unidades_por_caja > 0 and cantidad > 0:
        return max(cantidad // unidades_por_caja, 0)

    return 0


def obtener_resumen_tipos_vendedor_venta(venta):
    tipos = []
    for detalle in venta.detalles.all():
        tipo = obtener_tipo_vendedor_detalle(detalle)
        if tipo and tipo not in tipos:
            tipos.append(tipo)

    if not tipos:
        tipo = obtener_tipo_vendedor_fallback_venta(venta)
        return {'codigo': tipo, 'label': obtener_label_tipo_vendedor(tipo)}

    if len(tipos) == 1:
        return {'codigo': tipos[0], 'label': obtener_label_tipo_vendedor(tipos[0])}

    return {'codigo': 'mixto', 'label': 'Mixta'}


def obtener_info_descuento(venta):
    monto_descuento = convertir_monto_para_mostrar(venta, getattr(venta, 'descuento', Decimal('0.00')) or Decimal('0.00'))
    tipo_descuento = (getattr(venta, 'descuento_tipo', '') or '').strip().lower()
    valor_descuento = Decimal(str(getattr(venta, 'descuento_valor', Decimal('0.00')) or Decimal('0.00'))).quantize(Decimal('0.01'))

    if monto_descuento <= 0:
        return {
            'aplica': False,
            'tipo': 'ninguno',
            'tipo_label': 'Sin descuento',
            'valor': Decimal('0.00'),
            'valor_display': '0.00',
            'monto': Decimal('0.00'),
            'monto_display': '0.00',
            'resumen': 'Sin descuento',
        }

    if tipo_descuento == 'porcentaje' and valor_descuento > 0:
        valor_porcentaje = f'{valor_descuento:f}'.rstrip('0').rstrip('.')
        resumen = f'{valor_porcentaje}% ({obtener_simbolo_moneda(venta.moneda)} {monto_descuento:.2f})'
        valor_display = f'{valor_porcentaje}%'
        tipo_label = 'Porcentaje'
    else:
        tipo_descuento = 'fijo'
        if valor_descuento <= 0:
            valor_descuento = monto_descuento
        resumen = f'{obtener_simbolo_moneda(venta.moneda)} {valor_descuento:.2f}'
        valor_display = f'{obtener_simbolo_moneda(venta.moneda)} {valor_descuento:.2f}'
        tipo_label = 'Monto fijo'

    return {
        'aplica': True,
        'tipo': tipo_descuento,
        'tipo_label': tipo_label,
        'valor': valor_descuento,
        'valor_display': valor_display,
        'monto': monto_descuento,
        'monto_display': f'{monto_descuento:.2f}',
        'resumen': resumen,
    }


def serializar_detalle_venta(venta, detalle):
    tipo_vendedor = obtener_tipo_vendedor_detalle(detalle)
    modalidad = obtener_modalidad_detalle(detalle)
    cantidad_cajas = obtener_cantidad_cajas_detalle(detalle)

    return {
        'codigo': detalle.producto.codigo,
        'producto': detalle.producto.nombre,
        'cantidad': detalle.cantidad,
        'cantidad_cajas': cantidad_cajas,
        'precio_unitario': str(convertir_monto_para_mostrar(venta, detalle.precio_unitario)),
        'subtotal': str(convertir_monto_para_mostrar(venta, detalle.subtotal)),
        'tipo_vendedor': tipo_vendedor,
        'tipo_vendedor_label': obtener_label_tipo_vendedor(tipo_vendedor),
        'modalidad': modalidad,
        'modalidad_label': obtener_label_modalidad(modalidad),
    }


def es_tienda_principal_usuario(user):
    if not hasattr(user, 'perfil') or user.perfil.rol != 'tienda':
        return False

    return bool(
        hasattr(user.perfil, 'tienda')
        and user.perfil.tienda
        and user.perfil.tienda.tipo == 'principal'
    )


def puede_ver_amortizaciones(user, venta=None):
    if getattr(user, 'is_staff', False) or getattr(user, 'is_superuser', False):
        return True

    if not hasattr(user, 'perfil'):
        return False

    if user.perfil.rol == 'almacen':
        return True

    if es_tienda_principal_usuario(user):
        if venta is None:
            return True
        return venta.vendedor == user or venta.ubicacion == user.perfil

    return False


def puede_registrar_amortizaciones_almacen(user):
    if getattr(user, 'is_staff', False) or getattr(user, 'is_superuser', False):
        return True

    return bool(
        hasattr(user, 'perfil')
        and user.perfil
        and user.perfil.rol == 'almacen'
    )

def descontar_stock_desde_inventario(producto, cantidad, tipo_venta):
    """
    Descuenta stock de un producto desde la tabla Inventario según el rol de ubicación.
    
    Args:
        producto: Instancia de Producto
        cantidad: Cantidad a descontar
        tipo_venta: 'tienda' o 'deposito' (rol de ubicación)
    
    Raises:
        ValueError: Si no hay suficiente stock
    """
    if tipo_venta not in ['tienda', 'deposito']:
        raise ValueError(f"tipo_venta inválido: {tipo_venta}")
    
    # Obtener inventarios del tipo de ubicación solicitado, ORDENADOS ANTES de select_for_update
    inventarios = list(Inventario.objects.filter(
        producto=producto,
        ubicacion__rol=tipo_venta
    ).order_by('fecha_actualizacion').select_for_update())
    
    # Calcular stock total disponible
    stock_total = sum(inv.cantidad for inv in inventarios)
    
    if stock_total < cantidad:
        raise ValueError(
            f'Stock insuficiente en {tipo_venta} para "{producto.nombre}". '
            f'Disponible: {stock_total}, Solicitado: {cantidad}.'
        )
    
    # Descontar del primero que tenga stock (FIFO)
    cantidad_a_descontar = cantidad
    for inv in inventarios:
        if cantidad_a_descontar <= 0:
            break
        
        if inv.cantidad >= cantidad_a_descontar:
            inv.cantidad -= cantidad_a_descontar
            inv.save()
            cantidad_a_descontar = 0
        else:
            cantidad_a_descontar -= inv.cantidad
            inv.cantidad = 0
            inv.save()


def obtener_inventarios_venta_tienda(producto, perfil, tipo_venta, bloquear=False):
    """
    Obtiene el inventario válido para una venta de tienda según la tienda actual.

    - tienda: solo stock de la tienda actual.
    - deposito: solo stock de los depósitos vinculados a la misma tienda.

    Args:
        producto: instancia de Producto.
        perfil: perfil del usuario que vende.
        tipo_venta: 'tienda' o 'deposito'.
        bloquear: si es True, aplica select_for_update para uso dentro de una transacción.
    """
    if tipo_venta not in ['tienda', 'deposito']:
        return Inventario.objects.none()

    tienda_id = getattr(perfil, 'tienda_id', None)
    if not tienda_id:
        return Inventario.objects.none()

    filtros = {
        'producto': producto,
        'ubicacion__tienda_id': tienda_id,
    }

    if tipo_venta == 'tienda':
        filtros['ubicacion__rol'] = 'tienda'
    else:
        filtros['ubicacion__rol'] = 'deposito'

    qs = Inventario.objects.filter(**filtros).order_by('fecha_actualizacion')
    if bloquear:
        qs = qs.select_for_update()
    return qs


def descontar_stock_desde_inventario_tienda(producto, cantidad, perfil, tipo_venta):
    """
    Descuenta stock del inventario correspondiente a la tienda actual.
    Usa FIFO sobre las ubicaciones válidas de la misma tienda.
    """
    inventarios = list(
        obtener_inventarios_venta_tienda(
            producto=producto,
            perfil=perfil,
            tipo_venta=tipo_venta,
            bloquear=True,
        )
    )

    stock_total = sum(inv.cantidad for inv in inventarios)
    if stock_total < cantidad:
        raise ValueError(
            f'Stock insuficiente en {tipo_venta} para "{producto.nombre}". '
            f'Disponible: {stock_total}, Solicitado: {cantidad}.'
        )

    cantidad_a_descontar = cantidad
    for inv in inventarios:
        if cantidad_a_descontar <= 0:
            break

        if inv.cantidad >= cantidad_a_descontar:
            inv.cantidad -= cantidad_a_descontar
            inv.save()
            cantidad_a_descontar = 0
        else:
            cantidad_a_descontar -= inv.cantidad
            inv.cantidad = 0
            inv.save()


def descontar_stock_desde_contenedores(producto, cantidad):
    """
    Descuenta stock de un producto restando la cantidad desde ProductoContenedor.
    Usa estrategia FIFO: descuenta del contenedor más antiguo primero.
    
    Args:
        producto: Instancia de Producto
        cantidad: Cantidad a descontar
    
    Raises:
        ValueError: Si no hay suficiente stock
    """
    stock_actual = producto.stock
    if stock_actual < cantidad:
        raise ValueError(
            f'Stock insuficiente para "{producto.nombre}". '
            f'Disponible: {stock_actual}, Solicitado: {cantidad}.'
        )
    
    # Obtener ProductoContenedor ordenados por fecha (FIFO)
    contenedores = ProductoContenedor.objects.filter(
        producto=producto,
        cantidad__gt=0
    ).order_by('fecha_creacion').select_for_update()
    
    cantidad_a_descontar = cantidad
    for pc in contenedores:
        if cantidad_a_descontar <= 0:
            break
        
        if pc.cantidad >= cantidad_a_descontar:
            # Este contenedor tiene suficiente, descontar todo aquí
            pc.cantidad -= cantidad_a_descontar
            pc.save()
            cantidad_a_descontar = 0
        else:
            # Este contenedor no tiene suficiente, descontar todo
            cantidad_a_descontar -= pc.cantidad
            pc.cantidad = 0
            pc.save()


def restaurar_stock_a_contenedores(producto, cantidad):
    """
    Restaura stock de un producto sumando la cantidad al ProductoContenedor.
    Agrega al contenedor más reciente (LIFO para devoluciones).
    
    Args:
        producto: Instancia de Producto
        cantidad: Cantidad a restaurar
    """
    # Obtener el contenedor más reciente del producto
    # Si no existe, crear uno por defecto
    contenedor_pc = ProductoContenedor.objects.filter(
        producto=producto
    ).order_by('-fecha_creacion').first()
    
    if contenedor_pc:
        # Sumar al contenedor más reciente
        contenedor_pc.cantidad += cantidad
        contenedor_pc.save()
    else:
        # Si no hay contenedores, no podemos restaurar sin un contenedor
        # Esto no debería suceder en un estado coherente, pero lo documentamos
        raise ValueError(
            f'No hay contenedores registrados para el producto "{producto.nombre}". '
            f'No se puede restaurar stock.'
        )

def generar_codigo_venta():
    """Genera un código único para la venta: VTA-0001, VTA-0002, etc."""
    ultima = Venta.objects.order_by('-id').first()
    if ultima and ultima.codigo:
        try:
            numero = int(ultima.codigo.split('-')[1]) + 1
        except (IndexError, ValueError):
            numero = Venta.objects.count() + 1
    else:
        numero = 1
    return f"VTA-{numero:04d}"

def es_almacen(request):
    """Verifica si el usuario tiene rol de almacén."""
    return hasattr(request.user, 'perfil') and request.user.perfil.rol == 'almacen'

def es_administrador(request):
    """Verifica si el usuario es administrador."""
    return request.user.is_superuser or request.user.is_staff

def verificar_permiso_ventas(request):
    """Verifica que el usuario tenga permiso para ver/gestionar ventas."""
    if not request.user.is_authenticated:
        return False
    # Verificar que el usuario tenga un perfil asociado
    try:
        perfil = request.user.perfil
    except:
        return False
    if es_administrador(request):
        return True
    if es_almacen(request):
        return True
    # NUEVA LÍNEA: Permitir a tiendas
    if hasattr(request.user, 'perfil') and request.user.perfil.rol == 'tienda':
        return True
    return False


#Listado de ventas (Tabs: CONTADO - CRÉDITO)
@login_required
def listar_ventas(request):
    if not verificar_permiso_ventas(request):
        return redirect('dashboard')

    try:
        perfil = request.user.perfil
    except:
        messages.error(request, 'Error: El usuario no tiene un perfil asignado. Contacte al administrador.')
        return redirect('dashboard')

    # Se filtran ventas por la ubicación/almacén del usuario
    ventas = Venta.objects.filter(
        ubicacion=perfil
    ).select_related('ubicacion', 'vendedor').prefetch_related('detalles__producto').order_by('-fecha_elaboracion')

    # Filtros GET
    fecha_desde = request.GET.get('fecha_desde')
    fecha_hasta = request.GET.get('fecha_hasta')
    cliente_filtro = request.GET.get('cliente', '').strip()

    if fecha_desde:
        try:
            from datetime import datetime
            fecha_desde_obj = datetime.strptime(fecha_desde, '%Y-%m-%d').date()
            ventas = ventas.filter(fecha_elaboracion__date__gte=fecha_desde_obj)
        except:
            pass

    if fecha_hasta:
        try:
            from datetime import datetime
            fecha_hasta_obj = datetime.strptime(fecha_hasta, '%Y-%m-%d').date()
            ventas = ventas.filter(fecha_elaboracion__date__lte=fecha_hasta_obj)
        except:
            pass

    if cliente_filtro:
        ventas = ventas.filter(cliente__icontains=cliente_filtro)

    # Por tipo de pago
    ventas_contado_qs = ventas.filter(tipo_pago='contado')
    ventas_credito_qs = ventas.filter(tipo_pago='credito')

    # Verificar si se solicita PDF
    pdf = request.GET.get('pdf')
    if pdf:
        tipo_pago = request.GET.get('tipo_pago', 'contado')
        if tipo_pago == 'contado':
            ventas_filtradas = ventas_contado_qs
        else:
            ventas_filtradas = ventas_credito_qs
        return generar_pdf_lista(ventas_filtradas, tipo_pago)

    # Stats rápidas
    ventas_contado = list(ventas_contado_qs)
    ventas_credito = list(ventas_credito_qs)
    for venta in ventas_contado:
        venta.total_display = convertir_monto_para_mostrar(venta, venta.total)
        venta.resumen_tipos_vendedor = obtener_resumen_tipos_vendedor_venta(venta)
        venta.descuento_info = obtener_info_descuento(venta)

    for venta in ventas_credito:
        venta.total_display = convertir_monto_para_mostrar(venta, venta.total)
        venta.resumen_tipos_vendedor = obtener_resumen_tipos_vendedor_venta(venta)
        venta.descuento_info = obtener_info_descuento(venta)

    total_ventas = ventas.count()
    total_contado = ventas_contado_qs.aggregate(total=Sum('total'))['total'] or Decimal('0.00')
    total_credito = ventas_credito_qs.aggregate(total=Sum('total'))['total'] or Decimal('0.00')
    total_general = total_contado + total_credito

    # Ventas de crédito pendientes
    creditos_pendientes = ventas_credito_qs.filter(estado='pendiente').count()

    context = {
        'ventas_contado': ventas_contado,
        'ventas_credito': ventas_credito,
        'total_ventas': total_ventas,
        'total_contado': total_contado,
        'total_credito': total_credito,
        'total_general': total_general,
        'creditos_pendientes': creditos_pendientes,
        'perfil': perfil,
        'es_almacen': es_almacen(request),
        'es_administrador': es_administrador(request),
        # Mantener filtros en el contexto
        'fecha_desde': fecha_desde,
        'fecha_hasta': fecha_hasta,
        'cliente_filtro': cliente_filtro,
    }
    return render(request, 'ventas/ventas_almacen.html', context)

@login_required
def crear_venta(request):
    """
    GET: Renderiza la página de nueva venta con el carrito.
    URL: /ventas/crear/
    """
    if not verificar_permiso_ventas(request):
        return redirect('dashboard')
    
    try:
        perfil = request.user.perfil
    except:
        messages.error(request, 'Error: El usuario no tiene un perfil asignado. Contacte al administrador.')
        return redirect('dashboard')
    
    codigo_sugerido = generar_codigo_venta()
    
    # ═══════════════════════════════════════════════════════════
    # TIPO DE CAMBIO: DINÁMICO - Obtenido de la BD
    # El admin/almacén puede cambiar este valor a su discreción
    # ═══════════════════════════════════════════════════════════
    tipo_cambio_actual = float(obtener_tipo_cambio_usd() or 1)
    
    context = {
        'codigo_sugerido': codigo_sugerido,
        'perfil': perfil,
        'tipo_cambio_actual': tipo_cambio_actual,
    }
    return render(request, 'ventas/nueva_venta.html', context)




#Guardar venta (Post AJAX, es decir; recibe el JSON del carrito y crea la Venta + DetalleVenta.
#descuenta stock de los productos
#URL: /ventas/guardar/)

@login_required
def guardar_venta(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Método no permitido.'}, status=405)

    if not verificar_permiso_ventas(request):
        return JsonResponse({'success': False, 'error': 'Sin permisos.'}, status=403)

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'JSON inválido.'}, status=400)

    cliente = data.get('cliente', '').strip()
    telefono = data.get('telefono', '').strip()
    razon_social = data.get('razon_social', '').strip()
    direccion = data.get('direccion', '').strip()
    tipo_pago = data.get('tipo_pago', 'contado')
    moneda = data.get('moneda', 'BOB').upper()
    tipo_cambio = Decimal(str(data.get('tipo_cambio', obtener_tipo_cambio_usd() or 1)))
    vendedor_id = data.get('vendedor_id', None)  # Para vendedores de almacén
    items = data.get('items', [])

#Validaciones
    if not cliente:
        return JsonResponse({'success': False, 'error': 'El nombre del cliente es obligatorio.'})
    if tipo_pago not in ['contado', 'credito']:
        return JsonResponse({'success': False, 'error': 'Tipo de pago inválido.'})
    if moneda not in ['BOB', 'USD']:
        return JsonResponse({'success': False, 'error': 'Moneda inválida.'})
    if tipo_cambio <= 0:
        return JsonResponse({'success': False, 'error': 'Tipo de cambio inválido.'})
    if not items:
        return JsonResponse({'success': False, 'error': 'Debe agregar al menos un producto.'})

    try:
        perfil = request.user.perfil
    except:
        return JsonResponse({'success': False, 'error': 'El usuario no tiene un perfil asignado.'}, status=403)
    
    # Obtener el vendedor a usar
    vendedor_user = request.user
    if vendedor_id:
        try:
            # Si se proporciona vendedor_id, obtener al vendedor
            vendedor_obj = Vendedor.objects.get(id=vendedor_id)
            # Obtener al usuario asociado al vendedor (no hay relación directa, tomar el actual)
            # En caso de que necesites relacionar con un User, aquí puedes hacerlo
            vendedor_user = request.user  # Mantener el usuario actual como quien registra
        except Vendedor.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Vendedor no encontrado.'})

    try:
        with transaction.atomic():
            venta = Venta.objects.create(
                codigo=generar_codigo_venta(),
                ubicacion=perfil,
                cliente=cliente,
                telefono=telefono if telefono else None,
                razon_social=razon_social if razon_social else None,
                direccion=direccion if direccion else None,
                tipo_pago=tipo_pago,
                moneda=moneda,
                tipo_cambio=tipo_cambio,
                estado='completada' if tipo_pago == 'contado' else 'pendiente',
                vendedor=vendedor_user,
                subtotal=Decimal('0.00'),
                total=Decimal('0.00'),
            )
            
            # Si se proporcionó vendedor_id, guardar referencia personalizada
            if vendedor_id:
                venta.vendedor_id_almacen = vendedor_id  # Guardar para referencia

            total_venta = Decimal('0.00')

            for item in items:
                producto_id = item.get('producto_id')
                precio_unitario = Decimal(str(item.get('precio_unitario', '0')))
                producto = Producto.objects.get(id=producto_id)
                unidades_por_caja = int(producto.unidades_por_caja or 1)
                cantidad_cajas = int(item.get('cantidad_cajas', 0) or 0)
                modalidad = normalizar_modalidad(item.get('modalidad'), 'unidad')
                tipo_vendedor = normalizar_tipo_vendedor(item.get('tipo_vendedor'), 'almacen') or 'almacen'

                if cantidad_cajas > 0:
                    cantidad = cantidad_cajas * unidades_por_caja
                    modalidad = 'caja'
                else:
                    cantidad = int(item.get('cantidad', 0))
                    if modalidad == 'caja' and unidades_por_caja > 0 and cantidad > 0:
                        cantidad_cajas = max(cantidad // unidades_por_caja, 0)

                if cantidad <= 0:
                    raise ValueError(f'Cantidad inválida para el producto ID {producto_id}.')
                
                # Validar stock usando ProductoContenedor
                stock_disponible = producto.stock
                if stock_disponible < cantidad:
                    raise ValueError(
                        f'Stock insuficiente para "{producto.nombre}". '
                        f'Disponible: {stock_disponible}, Solicitado: {cantidad}.'
                    )
                
                # Ahora bloquear el producto para la actualización
                producto = Producto.objects.select_for_update().get(id=producto_id)

                subtotal_item = precio_unitario * cantidad

                DetalleVenta.objects.create(
                    venta=venta,
                    producto=producto,
                    cantidad=cantidad,
                    cantidad_cajas=cantidad_cajas,
                    tipo_vendedor=tipo_vendedor,
                    modalidad=modalidad,
                    precio_unitario=precio_unitario,
                    subtotal=subtotal_item,
                )
                # También descontar del stock universal (ProductoContenedor)
                descontar_stock_desde_contenedores(producto, cantidad)

                total_venta += subtotal_item

# Actualizar totales de la venta
            venta.subtotal = total_venta
            venta.total = total_venta
            venta.save()

        return JsonResponse({
            'success': True,
            'venta_id': venta.id,
            'venta_codigo': venta.codigo,
            'total': str(venta.total),
            'message': f'Venta {venta.codigo} registrada exitosamente.',
            'redireccionar_a': reverse('ventas:listar_ventas'),
        })

    except Producto.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Producto no encontrado.'})
    except ValueError as e:
        return JsonResponse({'success': False, 'error': str(e)})
    except Exception as e:
        return JsonResponse({'success': False, 'error': f'Error al guardar: {str(e)}'})


# API para buscar productos (con AJAX autocompletado).-
@login_required
def buscar_productos(request):
    """
    API AJAX para buscar productos con respecto a disponibilidad de stock.
    Parámetros GET:
    - q: string de búsqueda
    - tipo_venta: 'tienda' o 'deposito'
    - sin_filtro: si está presente, no filtra por stock (solo para debug)
    """
    query = request.GET.get('q', '').strip()
    tipo_venta = request.GET.get('tipo_venta', '').strip().lower()  # 'tienda' o 'deposito'
    sin_filtro = request.GET.get('sin_filtro', '')
    
    if len(query) < 2:
        return JsonResponse({
            'productos': [],
            'debug': {
                'error': 'Query muy corta (< 2 caracteres)',
                'query': query,
            }
        })

    try:
        # Obtener el usuario actual y su perfil
        user = request.user
        try:
            user_perfil = user.perfil
        except:
            return JsonResponse({'error': 'No hay perfil', 'productos': []})
        
        # Buscar productos por nombre o código, activos
        productos = Producto.objects.filter(
            Q(nombre__icontains=query) | Q(codigo__icontains=query),
            activo=True,
        ).select_related('categoria')[:20]

        resultado = []
        
        for p in productos:
            # Obtener stock basado en tipo_venta
            stock = None
            
            if tipo_venta in ['tienda', 'deposito']:
                # BÚSQUEDA POR TIPO DE UBICACIÓN: filtrar Inventario por rol
                try:
                    # Filtrar directo por rol de ubicación (tienda o deposito)
                    inventarios = obtener_inventarios_venta_tienda(
                        producto=p,
                        perfil=user_perfil,
                        tipo_venta=tipo_venta
                    )
                    
                    stock = sum(inv.cantidad for inv in inventarios)
                
                except Exception as e:
                    stock = None
            
            # Si no se usó ubicación específica o hubo error, usar stock universal
            if stock is None:
                try:
                    stock = p.stock if p.stock else 0
                except Exception as e:
                    stock = 0
            
            # Asegurar que stock es entero y >= 0
            stock = max(0, int(stock))
            
            # Filtrar solo productos con stock disponible
            if stock < 1:
                continue
                
            resultado.append({
                'id': p.id,
                'codigo': p.codigo,
                'nombre': p.nombre,
                'categoria': p.categoria.nombre if p.categoria else 'Sin categoría',
                'stock': stock,
                'unidades_por_caja': int(p.unidades_por_caja) if p.unidades_por_caja else 1,
                'precio_unidad': float(p.precio_unidad or 0),
                'precio_mayor': float(p.precio_mayor or 0),
                'precio_caja': float(p.precio_caja or 0),
                'precio_compra': float(p.precio_compra or 0),
                'poliza': float(p.poliza or 0),
                'gastos': float(p.gastos or 0),
            })

        return JsonResponse({'productos': resultado})
        
    except Exception as e:
        return JsonResponse({'error': f'Error al buscar: {str(e)}'}, status=500)


@login_required
def obtener_vendedores_almacen(request):
    """
    API: retorna vendedores activos asociados al almacén/tienda indicado o inferido
    desde el perfil del usuario. Parámetros GET opcionales: `almacen_id`, `tienda_id`.
    """
    try:
        almacen_id = request.GET.get('almacen_id')
        tienda_id = request.GET.get('tienda_id')

        qs = Vendedor.objects.all()

        if almacen_id:
            qs = qs.filter(almacen_id=almacen_id)
        elif tienda_id:
            qs = qs.filter(tienda_id=tienda_id)
        # Si no se pasan parámetros, retornar todos los vendedores del sistema

        vendedores = [
            {
                'id': v.id,
                'nombre_completo': f"{v.nombre} {v.apellido}".strip(),
                'lugar': v.almacen.nombre if v.almacen else (v.tienda.nombre if v.tienda else 'Sin ubicación'),
                'almacen_id': v.almacen_id,
                'tienda_id': v.tienda_id,
            }
            for v in qs.order_by('almacen_id', 'tienda_id', '-fecha_creacion')
        ]

        return JsonResponse({'vendedores': vendedores})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@login_required
def obtener_detalle_venta(request, id):
    """
    API AJAX para obtener detalles de una venta en formato JSON
    """
    # Validar autenticación (sin redirigir, retornar JSON)
    if not request.user.is_authenticated:
        return JsonResponse({'success': False, 'error': 'No autenticado'}, status=401)
    
    try:
        venta = Venta.objects.get(id=id)
        detalles = DetalleVenta.objects.filter(venta=venta).select_related('producto')
        
        # Amortizaciones (solo almacén y tienda principal)
        amortizaciones = []
        total_amortizado = Decimal('0.00')
        mostrar_amortizaciones = venta.tipo_pago == 'credito' and puede_ver_amortizaciones(request.user, venta)
        
        if mostrar_amortizaciones:
            amorts = AmortizacionCredito.objects.filter(venta=venta).order_by('-fecha')
            for a in amorts:
                amortizaciones.append({
                    'id': a.id,
                    'monto': str(convertir_monto_para_mostrar(venta, a.monto)),
                    'moneda': a.moneda or venta.moneda,
                    'moneda_simbolo': obtener_simbolo_moneda(a.moneda or venta.moneda),
                    'moneda_descripcion': obtener_descripcion_moneda(a.moneda or venta.moneda),
                    'fecha': a.fecha.strftime('%d/%m/%Y %H:%M') if a.fecha else '',
                    'observaciones': a.observaciones or '',
                    'comprobante': a.comprobante.url if a.comprobante else None,
                })
                total_amortizado += a.monto
        
        saldo_pendiente = venta.total - total_amortizado
        descuento_info = obtener_info_descuento(venta)
        resumen_tipos_vendedor = obtener_resumen_tipos_vendedor_venta(venta)
        
        datos = {
            'venta_id': venta.id,
            'venta_codigo': venta.codigo,
            'cliente': venta.cliente,
            'tipo_pago': venta.tipo_pago,
            'estado': venta.estado,
            'moneda': venta.moneda,
            'moneda_simbolo': obtener_simbolo_moneda(venta.moneda),
            'moneda_descripcion': obtener_descripcion_moneda(venta.moneda),
            'subtotal': str(convertir_monto_para_mostrar(venta, venta.subtotal)),
            'descuento': str(convertir_monto_para_mostrar(venta, venta.descuento if hasattr(venta, 'descuento') else Decimal('0.00'))),
            'descuento_info': {
                'aplica': descuento_info['aplica'],
                'tipo': descuento_info['tipo'],
                'tipo_label': descuento_info['tipo_label'],
                'valor_display': descuento_info['valor_display'],
                'monto_display': descuento_info['monto_display'],
                'resumen': descuento_info['resumen'],
            },
            'total': str(convertir_monto_para_mostrar(venta, venta.total)),
            'resumen_tipos_vendedor': resumen_tipos_vendedor,
            'detalles': [serializar_detalle_venta(venta, d) for d in detalles],
            'mostrar_amortizaciones': mostrar_amortizaciones,
            'amortizaciones': amortizaciones,
            'total_amortizado': str(convertir_monto_para_mostrar(venta, total_amortizado)),
            'saldo_pendiente': str(convertir_monto_para_mostrar(venta, saldo_pendiente)),
        }
        
        return JsonResponse({'success': True, 'data': datos})
    
    except Venta.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Venta no encontrada'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'error': f'Error: {str(e)}'}, status=500)
@login_required
def ver_venta(request, id):
    venta = get_object_or_404(Venta, id=id)
    detalles = DetalleVenta.objects.filter(venta=venta).select_related('producto')

    # Amortizaciones (si es con crédito)
    amortizaciones = []
    total_amortizado = Decimal('0.00')
    saldo_pendiente = Decimal('0.00')

    mostrar_amortizaciones = venta.tipo_pago == 'credito' and puede_ver_amortizaciones(request.user, venta)

    if mostrar_amortizaciones:
        amorts = AmortizacionCredito.objects.filter(venta=venta).order_by('-fecha')
        for a in amorts:
            amortizaciones.append({
                'id': a.id,
                'monto': str(convertir_monto_para_mostrar(venta, a.monto)),
                'moneda': a.moneda or venta.moneda,
                'moneda_simbolo': obtener_simbolo_moneda(a.moneda or venta.moneda),
                'moneda_descripcion': obtener_descripcion_moneda(a.moneda or venta.moneda),
                'fecha': a.fecha.strftime('%d/%m/%Y %H:%M') if a.fecha else '',
                'observaciones': a.observaciones or '',
                'comprobante': a.comprobante.url if a.comprobante else None,
            })
            total_amortizado += a.monto
        saldo_pendiente = venta.total - total_amortizado
    
    # Si es AJAX, retornar JSON
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return JsonResponse({
            'id': venta.id,
            'codigo': venta.codigo,
            'moneda': venta.moneda,
            'moneda_simbolo': obtener_simbolo_moneda(venta.moneda),
            'moneda_descripcion': obtener_descripcion_moneda(venta.moneda),
            'tipo_cambio': str(venta.tipo_cambio),
            'total': str(convertir_monto_para_mostrar(venta, venta.total)),
            'tipo_pago': venta.tipo_pago,
            'mostrar_amortizaciones': mostrar_amortizaciones,
            'total_amortizado': str(convertir_monto_para_mostrar(venta, total_amortizado)),
            'saldo_pendiente': str(convertir_monto_para_mostrar(venta, saldo_pendiente)),
        })

    context = {
        'venta': venta,
        'detalles_display': [
            {
                **serializar_detalle_venta(venta, d),
                'precio_unitario': convertir_monto_para_mostrar(venta, d.precio_unitario),
                'subtotal': convertir_monto_para_mostrar(venta, d.subtotal),
            }
            for d in detalles
        ],
        'subtotal_display': convertir_monto_para_mostrar(venta, venta.subtotal),
        'descuento_display': convertir_monto_para_mostrar(venta, venta.descuento),
        'descuento_info': obtener_info_descuento(venta),
        'total_display': convertir_monto_para_mostrar(venta, venta.total),
        'resumen_tipos_vendedor': obtener_resumen_tipos_vendedor_venta(venta),
        'mostrar_amortizaciones': mostrar_amortizaciones,
        'amortizaciones': amortizaciones,
        'total_amortizado': convertir_monto_para_mostrar(venta, total_amortizado),
        'saldo_pendiente': convertir_monto_para_mostrar(venta, saldo_pendiente),
    }

    return render(request, 'ventas/ver.html', context)

@login_required
def generar_pdf_venta(request, id):
    """
    Descarga PDF de una venta.

    Args:
        request: HttpRequest
        id: ID de la venta
    
    Returns:
        PDF descargable
    """
    try:
        from .pdf_generator import generar_pdf_venta_completo
        
        venta = get_object_or_404(Venta, id=id)
        
        # Validar permisos: solo vendedor, admin o staff
        if venta.vendedor != request.user and not (request.user.is_staff or request.user.is_superuser):
            messages.error(request, 'No tiene permiso para ver este PDF')
            return redirect('ventas:listar_ventas')
        
        # Generar PDF
        buffer = generar_pdf_venta_completo(venta)
        
        # Preparar respuesta - nombre con código de venta
        codigo_venta_str = getattr(venta, 'codigo', f'VENTA-{venta.id}').replace("/", "-")
        nombre_archivo = f'{codigo_venta_str}.pdf'
        
        response = FileResponse(
            buffer,
            as_attachment=True,
            filename=nombre_archivo,
            content_type='application/pdf'
        )
        
        return response
        
    except Venta.DoesNotExist:
        messages.error(request, 'Venta no encontrada')
        return redirect('ventas:listar_ventas')
    except Exception as e:
        messages.error(request, f'Error al generar PDF: {str(e)}')
        return redirect('ventas:listar_ventas')

def generar_pdf_lista(ventas, tipo_pago='contado'):
    """Genera PDF detallado con información completa de cada venta."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.75*inch, bottomMargin=0.75*inch)
    styles = getSampleStyleSheet()
    elements = []
    
    # Estilo personalizado para títulos
    titulo_style = ParagraphStyle(
        'TituloVenta',
        parent=styles['Heading2'],
        fontSize=14,
        textColor='#1e3a8a',
        spaceAfter=12,
        borderColor='#1e3a8a',
        borderWidth=2,
        borderPadding=10,
    )
    
    info_style = ParagraphStyle(
        'Info',
        parent=styles['Normal'],
        fontSize=9,
        spaceAfter=4,
    )
    
    # Título principal
    tipo_display = "AL CONTADO" if tipo_pago == 'contado' else "A CRÉDITO"
    title = Paragraph(f"<b>LISTADO DE VENTAS - {tipo_display}</b>", styles['Title'])
    elements.append(title)
    elements.append(Spacer(1, 0.2*inch))
    
    # Procesar cada venta
    for idx, venta in enumerate(ventas):
        if idx > 0:
            elements.append(PageBreak())
        
        # Encabezado de la venta
        encabezado = Paragraph(f"<b>Venta: {venta.codigo}</b>", titulo_style)
        elements.append(encabezado)
        elements.append(Spacer(1, 0.1*inch))
        
        # Información de la venta en 2 columnas
        info_data = [
            ['Cliente', venta.cliente, 'Tipo de Pago', venta.get_tipo_pago_display()],
            ['Teléfono', venta.telefono or '-', 'Fecha', venta.fecha_elaboracion.strftime('%d/%m/%Y %H:%M')],
            ['Razón Social', venta.razon_social or '-', 'Estado', venta.get_estado_display()],
            ['Dirección', venta.direccion or '-', 'Vendedor', venta.vendedor.get_full_name() if venta.vendedor else '-'],
            ['Origen', obtener_resumen_tipos_vendedor_venta(venta)['label'], 'Descuento', obtener_info_descuento(venta)['resumen']],
        ]
        
        info_table = Table(info_data, colWidths=[1.2*inch, 2*inch, 1.2*inch, 2*inch])
        info_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(info_table)
        elements.append(Spacer(1, 0.15*inch))
        
        # Tabla de productos
        productos_titulo = Paragraph("<b>Productos Vendidos</b>", styles['Heading3'])
        elements.append(productos_titulo)
        elements.append(Spacer(1, 0.08*inch))
        
        productos_data = [['Producto', 'Cant.', 'P. Unit.', 'Subtotal']]
        total_items = Decimal('0.00')
        
        for detalle in venta.detalles.all():
            tipo_vendedor = obtener_label_tipo_vendedor(obtener_tipo_vendedor_detalle(detalle))
            modalidad = obtener_label_modalidad(obtener_modalidad_detalle(detalle))
            cantidad_cajas = obtener_cantidad_cajas_detalle(detalle)
            descripcion_detalle = f'{tipo_vendedor} | {modalidad}'
            if cantidad_cajas > 0:
                descripcion_detalle += f' | {cantidad_cajas} caja(s)'

            productos_data.append([
                f'{detalle.producto.nombre}\n{descripcion_detalle}',
                str(detalle.cantidad),
                f"Bs. {detalle.precio_unitario:.2f}",
                f"Bs. {detalle.subtotal:.2f}"
            ])
            total_items += detalle.subtotal
        
        productos_data.append(['', '', 'TOTAL:', f"Bs. {total_items:.2f}"])
        
        productos_table = Table(productos_data, colWidths=[2.5*inch, 0.8*inch, 1*inch, 1.2*inch])
        productos_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), '#1e3a8a'),
            ('TEXTCOLOR', (0, 0), (-1, 0), 'white'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('BACKGROUND', (0, -1), (-1, -1), '#e9ecef'),
            ('GRID', (0, 0), (-1, -1), 1, '#d1d5db'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -2), ['#ffffff', '#f8f9fc']),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(productos_table)
        elements.append(Spacer(1, 0.15*inch))
        
        # Si es crédito, mostrar amortizaciones
        if tipo_pago == 'credito':
            amortizaciones = venta.amortizaciones.all().order_by('-fecha')
            
            amort_titulo = Paragraph("<b>Amortizaciones</b>", styles['Heading3'])
            elements.append(amort_titulo)
            elements.append(Spacer(1, 0.08*inch))
            
            if amortizaciones.exists():
                amort_data = [['Fecha', 'Monto', 'Observaciones']]
                total_amortizado = Decimal('0.00')
                
                for amort in amortizaciones:
                    amort_data.append([
                        amort.fecha.strftime('%d/%m/%Y %H:%M'),
                        f"Bs. {amort.monto:.2f}",
                        amort.observaciones or '-'
                    ])
                    total_amortizado += amort.monto
                
                saldo_pendiente = venta.total - total_amortizado
                
                amort_table = Table(amort_data, colWidths=[1.5*inch, 1.2*inch, 3.3*inch])
                amort_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), '#1e3a8a'),
                    ('TEXTCOLOR', (0, 0), (-1, 0), 'white'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 9),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
                    ('GRID', (0, 0), (-1, -1), 1, '#d1d5db'),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), ['#ffffff', '#f8f9fc']),
                    ('TOPPADDING', (0, 0), (-1, -1), 6),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ]))
                elements.append(amort_table)
                elements.append(Spacer(1, 0.1*inch))
                
                # Resumen de crédito
                resumen_data = [
                    ['Total amortizado:', f"Bs. {total_amortizado:.2f}"],
                    ['Saldo pendiente:', f"Bs. {saldo_pendiente:.2f}"],
                ]
                resumen_table = Table(resumen_data, colWidths=[2.5*inch, 1.5*inch])
                resumen_table.setStyle(TableStyle([
                    ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, -1), 10),
                    ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
                    ('TOPPADDING', (0, 0), (-1, -1), 6),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ]))
                elements.append(resumen_table)
            else:
                elements.append(Paragraph("<i>Sin amortizaciones registradas</i>", info_style))
    
        doc.build(elements)
    
    buffer.seek(0)
    # Nombre archivo con fecha y hora del sistema
    nombre_archivo = f'Ventas_{tipo_pago}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.pdf'
    response = HttpResponse(buffer, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{nombre_archivo}"'
    
    return response

@login_required
def registrar_amortizacion(request, venta_id):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Método no permitido.'}, status=405)

    if not puede_registrar_amortizaciones_almacen(request.user):
        return JsonResponse({
            'success': False,
            'error': 'Solo usuarios de almacén pueden registrar amortizaciones desde este módulo.'
        }, status=403)

    venta = get_object_or_404(Venta, id=venta_id)

    if venta.tipo_pago != 'credito':
        return JsonResponse({'success': False, 'error': 'Esta venta no es a crédito.'})

    if venta.estado in ['cancelada', 'anulada']:
        return JsonResponse({'success': False, 'error': 'No se puede abonar a una venta cancelada.'})

    # Procesar FormData en lugar de JSON
    monto_str = request.POST.get('monto', '0')
    observaciones = request.POST.get('observaciones', '').strip()
    comprobante = request.FILES.get('comprobante')

    # Validar campos requeridos
    if not monto_str:
        return JsonResponse({'success': False, 'error': 'El monto es requerido.'})
    
    if not comprobante:
        return JsonResponse({'success': False, 'error': 'La fotografía de comprobante es obligatoria.'})

    try:
        monto = Decimal(str(monto_str))
    except:
        return JsonResponse({'success': False, 'error': 'El monto debe ser un número válido.'})

    if monto <= 0:
        return JsonResponse({'success': False, 'error': 'El monto debe ser mayor a 0.'})

    # Calculamos saldo pendiente
    total_amortizado = AmortizacionCredito.objects.filter(
        venta=venta
    ).aggregate(total=Sum('monto'))['total'] or Decimal('0.00')

    saldo_pendiente = max(venta.total - total_amortizado, Decimal('0.00'))

    if saldo_pendiente <= 0:
        return JsonResponse({
            'success': False,
            'error': 'Esta venta ya no tiene saldo pendiente.'
        })

    if monto > saldo_pendiente:
        return JsonResponse({
            'success': False,
            'error': (
                f'El monto ({obtener_descripcion_moneda(venta.moneda)} {monto:.2f}) '
                f'excede el saldo pendiente ({obtener_descripcion_moneda(venta.moneda)} {saldo_pendiente:.2f}).'
            )
        })

    try:
        with transaction.atomic():
            # Crear amortización con el comprobante (archivo)
            amortizacion = AmortizacionCredito(
                venta=venta,
                monto=monto,
                moneda=venta.moneda,
                observaciones=observaciones,
                registrado_por=request.user,
                comprobante=comprobante,  # Guardar archivo
            )
            amortizacion.save()

            nuevo_total_amortizado = total_amortizado + monto
            if nuevo_total_amortizado >= venta.total:
                venta.estado = 'completada'
                venta.save()

        return JsonResponse({
            'success': True,
            'message': 'Amortización registrada exitosamente.',
            'nuevo_saldo': str(venta.total - nuevo_total_amortizado),
            'moneda_codigo': venta.moneda,
            'moneda_simbolo': obtener_simbolo_moneda(venta.moneda),
            'venta_completada': nuevo_total_amortizado >= venta.total,
        })

    except Exception as e:
        return JsonResponse({'success': False, 'error': f'Error: {str(e)}'})


@login_required
def anular_venta(request, id):
    """
    Anular una venta.
    - ALMACÉN: Anula directamente (requiere comentario)
    - TIENDA: Envía solicitud de anulación a almacén
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Método no permitido.'}, status=405)

    if not verificar_permiso_ventas(request):
        return JsonResponse({'success': False, 'error': 'Sin permisos.'}, status=403)

    venta = get_object_or_404(Venta, id=id)

    if venta.estado == 'anulada':
        return JsonResponse({'success': False, 'error': 'La venta ya está anulada.'})

    try:
        comentario = request.POST.get('comentario', '').strip()
        if not comentario:
            return JsonResponse({'success': False, 'error': 'El comentario es obligatorio.'}, status=400)

        # Verificar si es almacén
        es_almacen_user = hasattr(request.user, 'perfil') and request.user.perfil.rol == 'almacen'

        if es_almacen_user:
            # ALMACÉN: Anula directamente
            with transaction.atomic():
                # Devolver stock
                detalles = DetalleVenta.objects.filter(venta=venta).select_related('producto')
                for detalle in detalles:
                    producto = Producto.objects.select_for_update().get(id=detalle.producto.id)
                    restaurar_stock_a_contenedores(producto, detalle.cantidad)

                venta.estado = 'anulada'
                venta.save()

            return JsonResponse({
                'success': True,
                'message': f'Venta {venta.codigo} anulada. Stock devuelto.',
            })
        else:
            # TIENDA: Envía solicitud
            solicitud_existente = SolicitudAnulacionVenta.objects.filter(
                venta=venta,
                estado='pendiente'
            ).exists()

            if solicitud_existente:
                return JsonResponse({
                    'success': False,
                    'error': 'Ya existe una solicitud de anulación pendiente para esta venta.'
                })

            solicitud = SolicitudAnulacionVenta.objects.create(
                venta=venta,
                solicitado_por=request.user,
                comentario=comentario,
                estado='pendiente'
            )

            return JsonResponse({
                'success': True,
                'message': f'Solicitud de anulación enviada al almacén. ID: {solicitud.id}',
            })

    except Exception as e:
        return JsonResponse({'success': False, 'error': f'Error al anular venta: {str(e)}'})


@login_required
def validar_solicitudes_anulacion(request):
    """
    Panel para que ALMACÉN valide solicitudes de anulación enviadas por TIENDA
    """
    if not es_almacen(request):
        return HttpResponseForbidden()

    solicitudes = SolicitudAnulacionVenta.objects.select_related(
        'venta', 'solicitado_por', 'respondido_por'
    ).order_by('-fecha_solicitud')

    # Filtro por estado
    estado = request.GET.get('estado', '')
    if estado:
        solicitudes = solicitudes.filter(estado=estado)

    return render(request, 'ventas/solicitudes_anulacion.html', {
        'solicitudes': solicitudes,
        'estado_filtro': estado,
    })


@login_required
def detalle_solicitud_anulacion(request, id):
    """
    Ver detalle de una solicitud de anulación
    """
    if not es_almacen(request):
        return JsonResponse({'success': False, 'error': 'Sin permisos'}, status=403)
    
    try:
        solicitud = SolicitudAnulacionVenta.objects.get(id=id)
    except SolicitudAnulacionVenta.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Solicitud no encontrada'}, status=404)
    
    venta = solicitud.venta
    detalles = DetalleVenta.objects.filter(venta=venta).select_related('producto')
    amortizaciones = AmortizacionCredito.objects.filter(venta=venta)

    datos = {
        'solicitud_id': solicitud.id,
        'venta_codigo': venta.codigo,
        'cliente': venta.cliente,
        'estado_venta': venta.estado,
        'tipo_pago': venta.tipo_pago,
        'moneda': venta.moneda,
        'moneda_simbolo': obtener_simbolo_moneda(venta.moneda),
        'moneda_descripcion': obtener_descripcion_moneda(venta.moneda),
        'total': str(venta.total),
        'solicitado_por': solicitud.solicitado_por.get_full_name() or solicitud.solicitado_por.username,
        'fecha_solicitud': solicitud.fecha_solicitud.strftime('%d/%m/%Y %H:%M'),
        'comentario': solicitud.comentario,
        'estado_solicitud': solicitud.get_estado_display(),
        'comentario_respuesta': solicitud.comentario_respuesta or '',
        'respondido_por': (
            solicitud.respondido_por.get_full_name() or solicitud.respondido_por.username
            if solicitud.respondido_por else ''
        ),
        'fecha_respuesta': (
            solicitud.fecha_respuesta.strftime('%d/%m/%Y %H:%M')
            if solicitud.fecha_respuesta else ''
        ),
        'detalles': [
            {
                'producto': d.producto.nombre,
                'cantidad': d.cantidad,
                'precio': str(d.precio_unitario),
                'subtotal': str(d.subtotal)
            }
            for d in detalles
        ],
        'amortizaciones': [
            {
                'monto': str(a.monto),
                'moneda': a.moneda or venta.moneda,
                'moneda_simbolo': obtener_simbolo_moneda(a.moneda or venta.moneda),
                'moneda_descripcion': obtener_descripcion_moneda(a.moneda or venta.moneda),
                'fecha': a.fecha.strftime('%d/%m/%Y'),
                'comprobante': a.comprobante.url if a.comprobante else None,
                'observaciones': a.observaciones or '',
            }
            for a in amortizaciones
        ]
    }

    return JsonResponse(datos)


@login_required
def responder_solicitud_anulacion(request, id):
    """
    Almacén responde (acepta o rechaza) una solicitud de anulación
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)

    if not es_almacen(request):
        return JsonResponse({'success': False, 'error': 'Sin permisos'}, status=403)

    accion = request.POST.get('accion')  # 'aceptar' o 'rechazar'
    comentario_respuesta = request.POST.get('comentario_respuesta', '').strip()

    if accion not in ['aceptar', 'rechazar']:
        return JsonResponse({'success': False, 'error': 'Acción inválida'})

    try:
        with transaction.atomic():
            solicitud = SolicitudAnulacionVenta.objects.select_for_update().select_related('venta').get(id=id)

            if solicitud.estado != 'pendiente':
                estado_esperado = 'aceptada' if accion == 'aceptar' else 'rechazada'
                if solicitud.estado == estado_esperado and solicitud.respondido_por == request.user:
                    return JsonResponse({
                        'success': True,
                        'message': f'La solicitud ya estaba {solicitud.get_estado_display().lower()}.',
                        'nuevo_estado': solicitud.get_estado_display(),
                        'ya_procesada': True,
                    })

                return JsonResponse({
                    'success': False,
                    'error': 'Esta solicitud ya fue procesada previamente.'
                }, status=409)

            solicitud.estado = 'aceptada' if accion == 'aceptar' else 'rechazada'
            solicitud.respondido_por = request.user
            solicitud.fecha_respuesta = timezone.now()
            solicitud.comentario_respuesta = comentario_respuesta
            solicitud.save()

            # Si se acepta, anular la venta
            if accion == 'aceptar':
                venta = solicitud.venta
                detalles = DetalleVenta.objects.filter(venta=venta).select_related('producto')
                for detalle in detalles:
                    producto = Producto.objects.select_for_update().get(id=detalle.producto.id)
                    restaurar_stock_a_contenedores(producto, detalle.cantidad)

                if venta.estado != 'anulada':
                    venta.estado = 'anulada'
                    venta.save(update_fields=['estado'])

        return JsonResponse({
            'success': True,
            'message': f'Solicitud {solicitud.get_estado_display().lower()} correctamente.',
            'nuevo_estado': solicitud.get_estado_display()
        })

    except SolicitudAnulacionVenta.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Solicitud no encontrada'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'error': f'Error: {str(e)}'})



# ============================================
# FUNCIONES PARA VENTAS TIENDA
# ============================================

@login_required
def listar_ventas_tienda(request):
    """
    Listado de ventas para usuarios con rol TIENDA.
    Similar a listar_ventas pero filtrado y con lógica específica de tienda.
    """
    if not hasattr(request.user, 'perfil') or request.user.perfil.rol != 'tienda':
        messages.error(request, 'Solo usuarios con rol tienda pueden acceder.')
        return redirect('dashboard')

    perfil = request.user.perfil

    # Se filtran ventas por la ubicación/tienda del usuario
    ventas = Venta.objects.filter(
        ubicacion=perfil,
        vendedor=request.user
    ).select_related('ubicacion', 'vendedor').prefetch_related('detalles__producto').order_by('-fecha_elaboracion')

    # Filtros GET
    fecha_desde = request.GET.get('fecha_desde')
    fecha_hasta = request.GET.get('fecha_hasta')
    cliente_filtro = request.GET.get('cliente', '').strip()

    if fecha_desde:
        try:
            from datetime import datetime
            fecha_desde_obj = datetime.strptime(fecha_desde, '%Y-%m-%d').date()
            ventas = ventas.filter(fecha_elaboracion__date__gte=fecha_desde_obj)
        except:
            pass

    if fecha_hasta:
        try:
            from datetime import datetime
            fecha_hasta_obj = datetime.strptime(fecha_hasta, '%Y-%m-%d').date()
            ventas = ventas.filter(fecha_elaboracion__date__lte=fecha_hasta_obj)
        except:
            pass

    if cliente_filtro:
        ventas = ventas.filter(cliente__icontains=cliente_filtro)

    # Por tipo de pago
    ventas_contado_qs = ventas.filter(tipo_pago='contado')
    ventas_credito_qs = ventas.filter(tipo_pago='credito')

    ventas_contado = list(ventas_contado_qs)
    ventas_credito = list(ventas_credito_qs)

    # Stats rápidas
    total_ventas = ventas.count()
    total_contado = ventas_contado_qs.aggregate(total=Sum('total'))['total'] or Decimal('0.00')
    total_credito = ventas_credito_qs.aggregate(total=Sum('total'))['total'] or Decimal('0.00')
    total_general = total_contado + total_credito
    
    # Promedio y completadas
    promedio = total_general / total_ventas if total_ventas > 0 else Decimal('0.00')
    ventas_completadas = ventas.filter(estado='completada').count()

    # Verificar si se solicita PDF
    pdf = request.GET.get('pdf')
    if pdf:
        return generar_pdf_lista(ventas_contado, 'contado')

    # Obtener tipo de tienda (principal o sucursal)
    es_tienda_principal = es_tienda_principal_usuario(request.user)

    for venta in ventas_contado:
        venta.total_display = convertir_monto_para_mostrar(venta, venta.total)
        venta.resumen_tipos_vendedor = obtener_resumen_tipos_vendedor_venta(venta)
        venta.descuento_info = obtener_info_descuento(venta)

    for venta in ventas_credito:
        total_amortizado = AmortizacionCredito.objects.filter(
            venta=venta
        ).aggregate(total=Sum('monto'))['total'] or Decimal('0.00')
        saldo_pendiente = max(venta.total - total_amortizado, Decimal('0.00'))

        venta.total_display = convertir_monto_para_mostrar(venta, venta.total)
        venta.total_amortizado = convertir_monto_para_mostrar(venta, total_amortizado)
        venta.saldo_pendiente = convertir_monto_para_mostrar(venta, saldo_pendiente)
        venta.resumen_tipos_vendedor = obtener_resumen_tipos_vendedor_venta(venta)
        venta.descuento_info = obtener_info_descuento(venta)
        venta.mostrar_boton_amortizacion = (
            es_tienda_principal
            and venta.estado not in ['cancelada', 'anulada']
            and saldo_pendiente > 0
        )
    context = {
        'ventas_contado': ventas_contado,
        'ventas_credito': ventas_credito,
        'total_ventas': total_ventas,
        'total_contado': total_contado,
        'total_credito': total_credito,
        'total_general': total_general,
        'promedio': promedio,
        'ventas_completadas': ventas_completadas,
        'creditos_pendientes': sum(
            1 for venta in ventas_credito
            if getattr(venta, 'saldo_pendiente', Decimal('0.00')) > 0
        ),
        'perfil': perfil,
        'es_tienda': True,
        'es_tienda_principal': es_tienda_principal,
        # Mantener filtros en el contexto
        'fecha_desde': fecha_desde,
        'fecha_hasta': fecha_hasta,
        'cliente_filtro': cliente_filtro,
    }
    return render(request, 'ventas/listar_ventas_tienda.html', context)


@login_required
def crear_venta_tienda(request):
    """
    GET: Renderiza la página de nueva venta TIENDA con widget selector de modalidad.
    URL: /ventas/tienda/crear/
    """
    if not hasattr(request.user, 'perfil') or request.user.perfil.rol != 'tienda':
        return redirect('dashboard')
    
    perfil = request.user.perfil
    codigo_sugerido = generar_codigo_venta()
    
    # Obtener tipo de tienda (principal o sucursal)
    es_tienda_principal = False
    if hasattr(perfil, 'tienda') and perfil.tienda:
        es_tienda_principal = perfil.tienda.tipo == 'principal'
    
    # ═══════════════════════════════════════════════════════════
    # TIPO DE CAMBIO: DINÁMICO - Obtenido de la BD
    # El admin/almacén puede cambiar este valor a su discreción
    # ═══════════════════════════════════════════════════════════
    tipo_cambio_actual = float(obtener_tipo_cambio_usd() or 1)
    context = {
        'codigo_sugerido': codigo_sugerido,
        'perfil': perfil,
        'es_tienda': True,
        'es_tienda_principal': es_tienda_principal,
        'tipo_cambio_actual': tipo_cambio_actual,
    }
    return render(request, 'ventas/nueva_venta_tienda.html', context)


@login_required
def guardar_venta_tienda(request):
    """
    POST AJAX: Recibe carrito JSON con items de tienda.
    Valida modalidades (unidad/caja/mayor) y guarda Venta + DetalleVenta.
    Descuenta stock por cajas + unidades.
    
    URL: /ventas/tienda/guardar/
    
    RECIBE JSON:
    {
        "cliente": "Nombre cliente",
        "telefono": "1234567",
        "razon_social": "",
        "direccion": "Dir",
        "tipo_pago": "contado",
        "descuento": 0,
        "items": [
            {
                "producto_id": 1,
                "cantidad": 18,
                "modalidad": "mayor",  // "unidad" | "caja" | "mayor"
                "precio_unitario": 25.50
            }
        ]
    }
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Método no permitido.'}, status=405)

    if not hasattr(request.user, 'perfil') or request.user.perfil.rol != 'tienda':
        return JsonResponse({'success': False, 'error': 'Solo tienda puede crear ventas tienda.'}, status=403)

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'JSON inválido.'}, status=400)

    cliente = data.get('cliente', '').strip()
    telefono = data.get('telefono', '').strip()
    razon_social = data.get('razon_social', '').strip()
    direccion = data.get('direccion', '').strip()
    tipo_pago = data.get('tipo_pago', 'contado')
    tipo_venta = data.get('tipo_venta', '').strip().lower()  # compatibilidad con payload antiguo
    moneda = data.get('moneda', 'BOB').upper()
    tipo_cambio = Decimal(str(data.get('tipo_cambio', obtener_tipo_cambio_usd() or 1)))
    descuento_tipo = (data.get('descuento_tipo') or '').strip().lower()
    descuento_valor = Decimal(str(data.get('descuento_valor', data.get('descuento', '0')) or '0'))
    items = data.get('items', [])

    # Validaciones
    if not cliente:
        return JsonResponse({'success': False, 'error': 'El nombre del cliente es obligatorio.'})
    if tipo_pago not in ['contado', 'credito']:
        return JsonResponse({'success': False, 'error': 'Tipo de pago inválido.'})
    if moneda not in ['BOB', 'USD']:
        return JsonResponse({'success': False, 'error': 'Moneda inválida.'})
    if tipo_cambio <= 0:
        return JsonResponse({'success': False, 'error': 'Tipo de cambio inválido.'})
    if descuento_tipo and descuento_tipo not in ['ninguno', 'fijo', 'porcentaje']:
        return JsonResponse({'success': False, 'error': 'Tipo de descuento inválido.'})
    
    # Validar tipo de tienda
    perfil = request.user.perfil
    es_tienda_sucursal = False
    if hasattr(perfil, 'tienda') and perfil.tienda:
        es_tienda_sucursal = perfil.tienda.tipo in ['sucursal', 'punto_venta']
    
    # Si es sucursal o punto de venta, solo permitir contado
    if es_tienda_sucursal and tipo_pago == 'credito':
        return JsonResponse({
            'success': False,
            'error': f'Sucursales y puntos de venta solo pueden hacer ventas al contado. Tipo de tienda: {perfil.tienda.get_tipo_display()}'
        })

    if tipo_pago != 'contado':
        descuento_tipo = 'ninguno'
        descuento_valor = Decimal('0.00')
    elif not descuento_tipo:
        descuento_tipo = 'fijo' if descuento_valor > 0 else 'ninguno'
    
    if not items:
        return JsonResponse({'success': False, 'error': 'Debe agregar al menos un producto.'})

    perfil = request.user.perfil

    try:
        with transaction.atomic():
            venta = Venta.objects.create(
                codigo=generar_codigo_venta(),
                ubicacion=perfil,
                cliente=cliente,
                telefono=telefono if telefono else None,
                razon_social=razon_social if razon_social else None,
                direccion=direccion if direccion else None,
                tipo_pago=tipo_pago,
                moneda=moneda,
                tipo_cambio=tipo_cambio,
                estado='completada' if tipo_pago == 'contado' else 'pendiente',
                vendedor=request.user,
                subtotal=Decimal('0.00'),
                total=Decimal('0.00'),
            )

            total_venta = Decimal('0.00')

            for item in items:
                producto_id = item.get('producto_id')
                cantidad = int(item.get('cantidad', 0))
                modalidad = (item.get('modalidad') or 'unidad').strip().lower()
                tipo_vendedor_item = normalizar_tipo_vendedor(item.get('tipo_vendedor'), tipo_venta or 'tienda') or 'tienda'

                if cantidad <= 0:
                    raise ValueError(f'Cantidad inválida para el producto ID {producto_id}.')
                if modalidad not in ['unidad', 'caja', 'mayor']:
                    raise ValueError(f'Modalidad inválida para el producto ID {producto_id}.')
                if tipo_vendedor_item not in ['tienda', 'deposito']:
                    raise ValueError(f'Tipo de vendedor inválido para el producto ID {producto_id}.')

                producto = Producto.objects.get(id=producto_id)
                unidades_por_caja = int(producto.unidades_por_caja or 1)

                if modalidad == 'caja':
                    unidades_a_descontar = cantidad * unidades_por_caja
                else:
                    unidades_a_descontar = cantidad

                precio_base_bs = obtener_precio_base_producto(producto, modalidad)
                if precio_base_bs <= 0:
                    raise ValueError(
                        f'El producto "{producto.nombre}" no tiene un precio configurado para la modalidad "{modalidad}".'
                    )

                precio_unitario = convertir_bs_a_moneda_venta(precio_base_bs, moneda, tipo_cambio)

                # VALIDAR MODALIDAD MATEMÁTICAMENTE (solo para tienda)
                # Para depósito, permitir cualquier cantidad entre 1 y stock disponible
                if tipo_vendedor_item == 'tienda':
                    if modalidad == 'mayor':
                        if cantidad < 3 or cantidad >= unidades_por_caja:
                            raise ValueError(
                                f'Venta por mayor debe estar entre 3 y {unidades_por_caja - 1} unidades. '
                                f'Recibido: {cantidad}.'
                            )
                    elif modalidad == 'caja':
                        if cantidad < 1:
                            raise ValueError(
                                'Venta por caja debe ser al menos 1 caja. '
                                f'Recibido: {cantidad}.'
                            )
                    elif modalidad == 'unidad' and cantidad > 2:
                        raise ValueError(
                            'Venta por unidad solo permite entre 1 y 2 unidades. '
                            f'Recibido: {cantidad}.'
                        )
                else:
                    # Para depósito: validación simple, cualquier cantidad >= 1
                    pass

                # Validar stock ANTES de bloquear
                # Para tienda/deposito: validar contra el inventario específico
                if tipo_vendedor_item in ['tienda', 'deposito']:
                    inventarios = obtener_inventarios_venta_tienda(
                        producto=producto,
                        perfil=perfil,
                        tipo_venta=tipo_vendedor_item
                    )
                    stock_disponible = sum(inv.cantidad for inv in inventarios)
                else:
                    # Fallback: usar stock universal
                    stock_disponible = producto.stock
                
                if stock_disponible < unidades_a_descontar:
                    raise ValueError(
                        f'Stock insuficiente en {tipo_vendedor_item} para "{producto.nombre}". '
                        f'Disponible: {stock_disponible}, Solicitado: {unidades_a_descontar}.'
                    )
                
                # Ahora bloquear el producto
                producto = Producto.objects.select_for_update().get(id=producto_id)

                subtotal_item = precio_unitario * cantidad
                cantidad_guardada = unidades_a_descontar
                precio_guardado = precio_unitario

                if modalidad == 'caja' and unidades_a_descontar > 0:
                    precio_guardado = (subtotal_item / Decimal(str(unidades_a_descontar))).quantize(Decimal('0.01'))

                # Guardar DetalleVenta (con cantidad total, sin desglose)
                DetalleVenta.objects.create(
                    venta=venta,
                    producto=producto,
                    cantidad=cantidad_guardada,
                    cantidad_cajas=cantidad if modalidad == 'caja' else 0,
                    tipo_vendedor=tipo_vendedor_item,
                    modalidad=modalidad,
                    precio_unitario=precio_guardado,
                    subtotal=subtotal_item,
                )

                # Si es venta tienda o deposito, descontar del Inventario según tipo_venta
                if tipo_vendedor_item in ['tienda', 'deposito']:
                    descontar_stock_desde_inventario_tienda(
                        producto=producto,
                        cantidad=unidades_a_descontar,
                        perfil=perfil,
                        tipo_venta=tipo_vendedor_item,
                    )
                # También descontar del stock universal (ProductoContenedor)
                descontar_stock_desde_contenedores(producto, unidades_a_descontar)

                total_venta += subtotal_item

            # Aplicar descuento
            actual_descuento = Decimal('0.00')
            descuento_tipo_guardado = 'ninguno'
            descuento_valor_guardado = Decimal('0.00')
            if tipo_pago == 'contado' and descuento_tipo in ['fijo', 'porcentaje'] and descuento_valor > 0:
                descuento_valor_guardado = descuento_valor.quantize(Decimal('0.01'))
                descuento_tipo_guardado = descuento_tipo
                if descuento_tipo == 'porcentaje':
                    porcentaje = min(descuento_valor_guardado, Decimal('100.00'))
                    actual_descuento = (total_venta * porcentaje / Decimal('100')).quantize(Decimal('0.01'))
                    descuento_valor_guardado = porcentaje
                else:
                    actual_descuento = min(descuento_valor_guardado, total_venta)
                    descuento_valor_guardado = actual_descuento
                actual_descuento = min(actual_descuento, total_venta)
            
            total_final = total_venta - actual_descuento

            venta.subtotal = total_venta
            venta.descuento = actual_descuento
            venta.descuento_tipo = descuento_tipo_guardado if actual_descuento > 0 else 'ninguno'
            venta.descuento_valor = descuento_valor_guardado if actual_descuento > 0 else Decimal('0.00')
            venta.total = total_final
            venta.save()

            return JsonResponse({
                'success': True,
                'message': f'Venta {venta.codigo} guardada exitosamente.',
                'venta_id': venta.id,
                'venta_codigo': venta.codigo,
                'redireccionar_a': reverse('ventas:listar_ventas_tienda')
            })

    except Venta.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Venta no encontrada'}, status=404)
    except Producto.DoesNotExist as e:
        return JsonResponse({'success': False, 'error': f'Producto no encontrado: {str(e)}'}, status=404)
    except ValueError as e:
        return JsonResponse({'success': False, 'error': str(e)})
    except Exception as e:
        return JsonResponse({'success': False, 'error': f'Error al guardar venta: {str(e)}'}, status=500)


@login_required
def obtener_saldo_pendiente(request, id):
    """
    Retorna el saldo pendiente de una venta a crédito en formato JSON.
    """
    try:
        venta = Venta.objects.get(id=id)

        if venta.tipo_pago != 'credito':
            return JsonResponse({
                'success': False,
                'error': 'Esta venta no es a crédito.'
            }, status=400)

        if not puede_ver_amortizaciones(request.user, venta):
            return JsonResponse({
                'success': False,
                'error': 'No tienes permisos para consultar esta amortización.'
            }, status=403)
        
        # Calcular total amortizado
        total_amortizado = AmortizacionCredito.objects.filter(
            venta=venta
        ).aggregate(total=Sum('monto'))['total'] or Decimal('0.00')
        
        saldo_pendiente = max(venta.total - total_amortizado, Decimal('0.00'))
        
        # Determinar símbolo de moneda
        moneda_simbolo = obtener_simbolo_moneda(venta.moneda)
        
        return JsonResponse({
            'success': True,
            'total_pagado': f"{moneda_simbolo} {convertir_monto_para_mostrar(venta, total_amortizado):.2f}",
            'saldo_pendiente': f"{convertir_monto_para_mostrar(venta, saldo_pendiente):.2f}",
            'saldo_pendiente_formateado': f"{moneda_simbolo} {convertir_monto_para_mostrar(venta, saldo_pendiente):.2f}",
            'venta_total': f"{moneda_simbolo} {convertir_monto_para_mostrar(venta, venta.total):.2f}",
            'moneda_simbolo': moneda_simbolo,
            'moneda_codigo': venta.moneda,
            'moneda_descripcion': obtener_descripcion_moneda(venta.moneda),
        })
    except Venta.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Venta no encontrada'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error: {str(e)}'
        }, status=500)


@login_required
def registrar_amortizacion_tienda(request, id):
    """
    Registra una amortización (pago) para una venta a crédito de tienda.
    Similar a registrar_amortizacion pero específico para tiendas.
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Método no permitido.'}, status=405)

    if not es_tienda_principal_usuario(request.user):
        return JsonResponse({
            'success': False,
            'error': 'Solo la tienda principal puede registrar amortizaciones.'
        }, status=403)

    try:
        venta = Venta.objects.get(id=id)
        
        # Validar que sea del usuario
        if venta.vendedor != request.user:
            return JsonResponse({'success': False, 'error': 'No tienes permisos para esta venta.'}, status=403)
        
        if venta.tipo_pago != 'credito':
            return JsonResponse({'success': False, 'error': 'Esta venta no es a crédito.'})

        if venta.estado == 'cancelada' or venta.estado == 'anulada':
            return JsonResponse({'success': False, 'error': 'No se puede registrar pago a una venta cancelada/anulada.'})

        # Procesar FormData
        monto_str = request.POST.get('monto', '0')
        observaciones = request.POST.get('observaciones', '').strip()
        comprobante = request.FILES.get('comprobante')

        # Validar campos requeridos
        if not monto_str:
            return JsonResponse({'success': False, 'error': 'El monto es requerido.'})
        
        if not comprobante:
            return JsonResponse({'success': False, 'error': 'La fotografía de comprobante es obligatoria.'})

        try:
            monto = Decimal(str(monto_str))
        except:
            return JsonResponse({'success': False, 'error': 'El monto debe ser un número válido.'})

        if monto <= 0:
            return JsonResponse({'success': False, 'error': 'El monto debe ser mayor a 0.'})

        # Calcular saldo pendiente
        total_amortizado = AmortizacionCredito.objects.filter(
            venta=venta
        ).aggregate(total=Sum('monto'))['total'] or Decimal('0.00')

        saldo_pendiente = max(venta.total - total_amortizado, Decimal('0.00'))

        if saldo_pendiente <= 0:
            return JsonResponse({
                'success': False,
                'error': 'Esta venta ya no tiene saldo pendiente.'
            })

        if monto > saldo_pendiente:
            return JsonResponse({
                'success': False,
                'error': (
                    f'El monto excede el saldo pendiente '
                    f'({obtener_descripcion_moneda(venta.moneda)} {saldo_pendiente:.2f}).'
                )
            })

        with transaction.atomic():
            # Crear amortización
            amortizacion = AmortizacionCredito(
                venta=venta,
                monto=monto,
                moneda=venta.moneda,
                observaciones=observaciones,
                registrado_por=request.user,
                comprobante=comprobante,
            )
            amortizacion.save()

            nuevo_total_amortizado = total_amortizado + monto
            nuevo_saldo = venta.total - nuevo_total_amortizado
            
            # Marcar como completada si está totalmente pagada
            if nuevo_total_amortizado >= venta.total:
                venta.estado = 'completada'
                venta.save()

        return JsonResponse({
            'success': True,
            'message': 'Pago registrado exitosamente.',
            'nuevo_saldo': str(nuevo_saldo),
            'nuevo_saldo_formateado': (
                f"{obtener_simbolo_moneda(venta.moneda)} "
                f"{convertir_monto_para_mostrar(venta, nuevo_saldo):.2f}"
            ),
            'moneda_codigo': venta.moneda,
            'moneda_simbolo': obtener_simbolo_moneda(venta.moneda),
            'venta_completada': nuevo_total_amortizado >= venta.total,
        })

    except Venta.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Venta no encontrada'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'error': f'Error al registrar pago: {str(e)}'}, status=500)
