from django.shortcuts import render, redirect, get_object_or_404
from .models import TipoCambio
from django.http import JsonResponse
from django.contrib import messages  # <--- Agrega esta línea

def listar_monedas(request):
    # Capturamos filtros del HTML (si decides usarlos como en categorías)
    estado = request.GET.get('estado')
    
    monedas = TipoCambio.objects.all().order_by('-fecha', '-id')
    
    if estado == 'activo':
        monedas = monedas.filter(activo=True)
    elif estado == 'inactivo':
        monedas = monedas.filter(activo=False)
    
    moneda_actual = TipoCambio.objects.filter(activo=True).order_by('-fecha', '-id').first()
    if moneda_actual is None:
        moneda_actual = TipoCambio.objects.order_by('-fecha', '-id').first()

    moneda_anterior = None
    if moneda_actual is not None:
        moneda_anterior = TipoCambio.objects.exclude(pk=moneda_actual.pk).order_by('-fecha', '-id').first()

    return render(request, 'moneda/monedas.html', {
        'monedas': monedas,
        'estado': estado,
        'moneda_actual': moneda_actual,
        'moneda_anterior': moneda_anterior,
    })

def crear_moneda(request):
    if request.method == 'POST':
        moneda_code = request.POST.get('moneda')
        valor = request.POST.get('valor')
        TipoCambio.objects.update(activo=False)
        TipoCambio.objects.create(
            moneda=moneda_code,
            valor=valor,
            activo=True
        )
        messages.success(request, 'Tipo de cambio registrado correctamente.')
    return redirect('listar_monedas')

def editar_moneda(request, pk):
    moneda = get_object_or_404(TipoCambio, pk=pk)
    if request.method == 'POST':
        moneda.moneda = request.POST.get('moneda')
        moneda.valor = request.POST.get('valor')
        TipoCambio.objects.exclude(pk=moneda.pk).update(activo=False)
        moneda.activo = True
        moneda.save()
        messages.success(request, 'Tipo de cambio actualizado correctamente.')
        return redirect('listar_monedas')
    
    # Para AJAX: Retorna los datos actuales para llenar el modal
    return JsonResponse({
        'moneda': moneda.moneda,
        'valor': moneda.valor,
        'activo': moneda.activo
    })

def eliminar_moneda(request, pk):
    if request.method == 'POST':
        moneda = get_object_or_404(TipoCambio, pk=pk)
        moneda.activo = not moneda.activo
        moneda.save()
        # Importante: Esto es lo que recibe el AJAX
        return JsonResponse({'status': 'success'}) 
    return JsonResponse({'status': 'error'}, status=400)
