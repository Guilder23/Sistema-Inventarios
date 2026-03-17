# Conversión de Monedas - Documentación Técnica

## Fórmula Correcta: Bs → USD

```
USD = Bs / tipo_cambio

Ejemplo:
- Bs. 100
- Tipo de cambio: 6.93 (1 USD = 6.93 Bs)
- USD = 100 / 6.93 = 14.43 USD (CORRECTO)
```

## Implementación

### ✅ CORRECTO (Frontend - nueva_venta.js):
```javascript
const totalDisplay = moneda === 'USD' 
    ? (totalPrecio / tipoCambio).toFixed(2)  // ✅ DIVIDIR
    : totalPrecio.toFixed(2);
```

### Backend (views.py - guardar_venta):
- Se recibe: `moneda`, `tipo_cambio`, `items` con `precio_unitario`
- Los precios unitarios están en la moneda seleccionada (BOB o USD)
- El backend NO realiza conversión automática
- Solo almacena el tipo de cambio registrado para auditoría

### ⚠️ ERRORES A EVITAR:
```javascript
// ❌ INCORRECTO: Multiplicar en lugar de dividir
const totalDisplay = totalPrecio * tipoCambio;  // Esto da 693 para 100 Bs

// ❌ INCORRECTO: Invertir la lógica
const totalDisplay = tipoCambio * totalPrecio / 100;  // Esto da 6.93 para 100 Bs
```

## Campos en Modelo Venta:
- `moneda`: 'BOB' o 'USD' (moneda en que se realizó la venta)
- `tipo_cambio`: Decimal - conserva el tipo de cambio al momento de la venta
- `subtotal`: Total antes de descuentos (en la moneda indicada)
- `total`: Total final (en la moneda indicada)

## Notas Importantes:
1. El tipo de cambio se guarda solo para auditoría/referencia
2. Los precios en detalles de venta están en la moneda elegida
3. NO hay conversión automática de precios entre monedas
4. El usuario elige moneda ANTES de agregar productos
5. Todos los cálculos de subtotal y total usan la misma moneda

## Búsqueda de Errores:
Si en visualización se muestra USD incorrecto:
1. ✅ Verificar formula en `static/js/ventas/nueva_venta.js` línea 436
2. ✅ Verificar que tipo_cambio venga correctamente desde API
3. ✅ Verificar en template que `inputMoneda` tenga valor correcto
4. ✅ Verificar en console del navegador (F12) los valores reales

### Valores a monitorear en Console:
```javascript
console.log('Moneda:', document.getElementById('inputMoneda').value);
console.log('Tipo Cambio:', document.getElementById('tipoCambioActual').value);
console.log('Total Bs:', totalPrecio);
console.log('Total USD:', (totalPrecio / tipoCambio).toFixed(2));
```

