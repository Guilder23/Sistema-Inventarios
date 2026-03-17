from .models import TipoCambio


def moneda_actual(request):
    moneda = TipoCambio.objects.filter(activo=True).order_by("-fecha", "-id").first()
    if moneda is None:
        moneda = TipoCambio.objects.order_by("-fecha", "-id").first()
    return {"navbar_moneda_actual": moneda}
