from django.shortcuts import render, redirect, get_object_or_404
from .models import TipoCambio
from django.http import JsonResponse
from django.contrib import messages


def listar_monedas(request):
    estado = request.GET.get('estado')

    monedas = TipoCambio.objects.all().order_by('-fecha', '-id')

    if estado == 'activo':
        monedas = monedas.filter(activo=True)
    elif estado == 'inactivo':
        monedas = monedas.filter(activo=False)

    # SISTEMA GENERAL
    moneda_actual_general = TipoCambio.objects.filter(
        contexto='general',
        activo=True
    ).order_by('-fecha', '-id').first()

    if moneda_actual_general is None:
        moneda_actual_general = TipoCambio.objects.filter(
            contexto='general'
        ).order_by('-fecha', '-id').first()

    moneda_anterior_general = None
    if moneda_actual_general is not None:
        moneda_anterior_general = TipoCambio.objects.filter(
            contexto='general'
        ).exclude(
            pk=moneda_actual_general.pk
        ).order_by('-fecha', '-id').first()

    # TIENDA PRINCIPAL
    moneda_actual_tienda = TipoCambio.objects.filter(
        contexto='tienda_principal',
        activo=True
    ).order_by('-fecha', '-id').first()

    if moneda_actual_tienda is None:
        moneda_actual_tienda = TipoCambio.objects.filter(
            contexto='tienda_principal'
        ).order_by('-fecha', '-id').first()

    moneda_anterior_tienda = None
    if moneda_actual_tienda is not None:
        moneda_anterior_tienda = TipoCambio.objects.filter(
            contexto='tienda_principal'
        ).exclude(
            pk=moneda_actual_tienda.pk
        ).order_by('-fecha', '-id').first()

    return render(request, 'moneda/monedas.html', {
        'monedas': monedas,
        'estado': estado,
        'moneda_actual_general': moneda_actual_general,
        'moneda_anterior_general': moneda_anterior_general,
        'moneda_actual_tienda': moneda_actual_tienda,
        'moneda_anterior_tienda': moneda_anterior_tienda,
    })


def crear_moneda(request):
    if request.method == 'POST':
        moneda_code = request.POST.get('moneda')
        contexto = request.POST.get('contexto')
        valor = request.POST.get('valor')

        if not moneda_code or not contexto or not valor:
            messages.error(request, 'Todos los campos son obligatorios.')
            return redirect('listar_monedas')

        # Solo desactiva los del mismo contexto y misma moneda
        TipoCambio.objects.filter(
            moneda=moneda_code,
            contexto=contexto,
            activo=True
        ).update(activo=False)

        TipoCambio.objects.create(
            moneda=moneda_code,
            contexto=contexto,
            valor=valor,
            activo=True
        )

        messages.success(request, 'Tipo de cambio registrado correctamente.')

    return redirect('listar_monedas')


def editar_moneda(request, pk):
    moneda = get_object_or_404(TipoCambio, pk=pk)

    if request.method == 'POST':
        moneda_code = request.POST.get('moneda')
        contexto = request.POST.get('contexto')
        valor = request.POST.get('valor')

        if not moneda_code or not contexto or not valor:
            messages.error(request, 'Todos los campos son obligatorios.')
            return redirect('listar_monedas')

        moneda.moneda = moneda_code
        moneda.contexto = contexto
        moneda.valor = valor

        # Solo desactiva otros activos de la misma moneda y contexto
        TipoCambio.objects.filter(
            moneda=moneda.moneda,
            contexto=moneda.contexto,
            activo=True
        ).exclude(pk=moneda.pk).update(activo=False)

        moneda.activo = True
        moneda.save()

        messages.success(request, 'Tipo de cambio actualizado correctamente.')
        return redirect('listar_monedas')

    return JsonResponse({
        'moneda': moneda.moneda,
        'contexto': moneda.contexto,
        'valor': str(moneda.valor),
        'activo': moneda.activo
    })


def eliminar_moneda(request, pk):
    if request.method == 'POST':
        moneda = get_object_or_404(TipoCambio, pk=pk)
        moneda.activo = not moneda.activo
        moneda.save()
        return JsonResponse({'status': 'success'})

    return JsonResponse({'status': 'error'}, status=400)