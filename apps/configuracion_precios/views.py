from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_POST

from .forms import ConfiguracionPreciosForm
from .models import ConfiguracionPrecios


def _redirect_after_save(request):
    return redirect(request.POST.get('next') or 'listar_configuraciones_precios')


@login_required
def listar_configuraciones_precios(request):
    configuracion = ConfiguracionPrecios.objects.order_by('id').first()
    configuraciones = ConfiguracionPrecios.objects.filter(pk=configuracion.pk) if configuracion else ConfiguracionPrecios.objects.none()
    form = ConfiguracionPreciosForm(instance=configuracion)

    return render(request, 'configuracion_precios/configuraciones.html', {
        'configuraciones': configuraciones,
        'form': form,
    })


@login_required
@require_POST
def crear_configuracion_precios(request):
    configuracion = ConfiguracionPrecios.objects.order_by('id').first()
    form = ConfiguracionPreciosForm(request.POST, instance=configuracion)

    if form.is_valid():
        form.save()
        messages.success(request, 'Configuración de precios guardada correctamente.')
    else:
        messages.error(request, 'Revise los datos ingresados.')

    return _redirect_after_save(request)


@login_required
def obtener_configuracion_precios(request, pk):
    configuracion = get_object_or_404(ConfiguracionPrecios, pk=pk)

    return JsonResponse({
        'id': configuracion.id,
        'aumento_mayor': str(configuracion.aumento_mayor),
        'aumento_unidad': str(configuracion.aumento_unidad),
    })


@login_required
@require_POST
def editar_configuracion_precios(request, pk):
    configuracion = get_object_or_404(ConfiguracionPrecios, pk=pk)
    form = ConfiguracionPreciosForm(request.POST, instance=configuracion)

    if form.is_valid():
        form.save()
        messages.success(request, 'Configuración de precios actualizada correctamente.')
    else:
        messages.error(request, 'Revise los datos ingresados.')

    return _redirect_after_save(request)


@login_required
@require_POST
def eliminar_configuracion_precios(request, pk):
    configuracion = get_object_or_404(ConfiguracionPrecios, pk=pk)
    configuracion.delete()
    messages.success(request, 'Configuración de precios eliminada correctamente.')

    return _redirect_after_save(request)
