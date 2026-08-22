from .models import SesionCaja


def caja_status(request):
    """Context processor que expone el estado de la caja del usuario para la navbar/sidebar.

    Variables expuestas:
    - navbar_caja_abierta: bool
    - navbar_caja_estado: 'ABIERTA'|'CERRADA'|None
    - navbar_sesion_caja: SesionCaja instance or None
    """
    user = getattr(request, 'user', None)
    sesion = None
    abierta = False
    estado = None

    if user and getattr(user, 'is_authenticated', False):
        sesion = SesionCaja.objects.filter(cajero=user).order_by('-fecha_apertura').first()
        if sesion:
            estado = sesion.estado
            abierta = sesion.estado == 'ABIERTA'

    return {
        'navbar_caja_abierta': abierta,
        'navbar_caja_estado': estado,
        'navbar_sesion_caja': sesion,
    }
