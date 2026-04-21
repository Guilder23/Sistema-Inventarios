from .models import TipoCambio


def moneda_actual(request):
    moneda_general = TipoCambio.objects.filter(
        contexto="general",
        activo=True,
    ).order_by("-fecha", "-id").first()
    if moneda_general is None:
        moneda_general = TipoCambio.objects.filter(
            contexto="general",
        ).order_by("-fecha", "-id").first()

    moneda_tienda_principal = TipoCambio.objects.filter(
        contexto="tienda_principal",
        activo=True,
    ).order_by("-fecha", "-id").first()
    if moneda_tienda_principal is None:
        moneda_tienda_principal = TipoCambio.objects.filter(
            contexto="tienda_principal",
        ).order_by("-fecha", "-id").first()

    moneda_actual = moneda_general
    user = getattr(request, "user", None)
    perfil = getattr(user, "perfil", None) if user else None
    tienda = getattr(perfil, "tienda", None) if perfil else None

    if (
        user
        and getattr(user, "is_authenticated", False)
        and perfil
        and getattr(perfil, "rol", "") == "tienda"
        and tienda
        and getattr(tienda, "tipo", "") == "principal"
    ):
        moneda_actual = moneda_tienda_principal or moneda_general

    return {
        "navbar_moneda_actual": moneda_actual,
        "navbar_moneda_general": moneda_general,
        "navbar_moneda_tienda_principal": moneda_tienda_principal,
    }
