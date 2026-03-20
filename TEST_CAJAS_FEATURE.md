# Test: Feature de Entrada por Cajas

## Resumen de Cambios Implementados

### ✅ Frontend - HTML

#### 1. Modal: Agregar Nuevo Producto  
Archivo: `templates/productos/contenedores/productos_en_contenedor/modals/agregar_nuevo.html`

Cambios:
- Agregado campo: "Unidades x Caja" (editable, integer)
- Agregado campo: "Cantidad de Cajas" (número de cajas, requerido)
- Agregado campo: "Unidades Totales Calculadas" (readonly, auto-calculado)

Fórmula: `Cantidad Total = Cantidad de Cajas × Unidades x Caja`

#### 2. Modal: Agregar Producto Existente  
Archivo: `templates/productos/contenedores/productos_en_contenedor/modals/agregar_existente.html`

Cambios:
- Agregado campo: "Unidades x Caja" (readonly, cargado desde producto)
- Reemplazado: Campo "Cantidad" → "Cantidad de Cajas"
- Agregado campo: "Unidades Totales Calculadas" (readonly, auto-calculado)

---

### ✅ Frontend - JavaScript

#### 1. Modal: Agregar Nuevo Producto  
Archivo: `static/js/productos/contenedores/productos_en_contenedor/modals/agregar_nuevo.js`

Cambios:
- **Función nueva**: `calcularUnidadesTotal()`
  - Multiplica: `cantidad_cajas × unidades_por_caja`
  - Actualiza campo readonly: `cantidad_modal`

- **Event Listeners añadidos**:
  - `cantidad_cajas_modal` → `input` y `change` eventos
  - `unidades_por_caja_modal` → `input` y `change` eventos
  - Cada evento llama a `calcularUnidadesTotal()`

- **Modificación**: `limpiarFormulario()`
  - Ahora llama a `calcularUnidadesTotal()` después de reset

#### 2. Modal: Agregar Producto Existente  
Archivo: `static/js/productos/contenedores/productos_en_contenedor/modals/agregar_existente.js`

Cambios:
- **Función nueva**: `calcularUnidadesTotalExistente()`
  - Multiplica: `cantidad_cajas × unidades_por_caja`
  - Actualiza campo readonly: `cantidad_existente_modal`

- **Función nueva**: `cargarDatosProductoSeleccionado(productoId)`
  - Fetch GET a: `/productos/{id}/datos-basicos/`
  - Carga campo readonly: `unidades_por_caja_existente_modal`
  - Llama a `calcularUnidadesTotalExistente()` después de cargar

- **Event Listeners añadidos**:
  - `producto_id_modal` → evento `change` (carga datos del producto)
  - `cantidad_cajas_existente_modal` → eventos `input` y `change`
  - `unidades_por_caja_existente_modal` → eventos `input` y `change`

---

### ✅ Backend - Django

#### 1. Nueva URL  
Archivo: `apps/productos/urls.py`

Agregada ruta:
```python
path('<int:id>/datos-basicos/', views.datos_basicos_producto, name='datos_basicos_producto'),
```

#### 2. Nueva Vista  
Archivo: `apps/productos/views.py` (lines ~1475)

Nueva función: `datos_basicos_producto(request, id)`
```python
def datos_basicos_producto(request, id):
    """API JSON para obtener datos básicos de un producto"""
    try:
        producto = get_object_or_404(Producto, id=id, activo=True)
        
        data = {
            'id': producto.id,
            'codigo': producto.codigo,
            'nombre': producto.nombre,
            'unidades_por_caja': producto.unidades_por_caja,
            'precio_unitario': float(producto.precio_unitario),
            'stock': producto.stock,
        }
        return JsonResponse(data)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
```

#### 3. Vista Existente (SIN CAMBIOS)  
Archivo: `apps/productos/views.py` → `agregar_producto_contenedor()`

Status: **No modificada** - Continúa recibiendo `cantidad` (pre-calculada)
- Forma 1 (Nuevo producto): Frontend envía `cantidad = cajas × unidades_por_caja`
- Forma 2 (Producto existente): Frontend envía `cantidad = cajas × unidades_por_caja`
- Backend recibe el valor total y lo procesa igual que antes

---

## Flujos de Usuario

### Flujo 1: Crear Nuevo Producto en Contenedor
```
1. Usuario hace click en "Crear Nuevo Producto"
2. Modal se abre, campos en estado inicial
3. Usuario completa:
   - Código: "PROD-001"
   - Nombre: "Widget Deluxe"
   - Categoría: "Electrónica"
   - Unidades x Caja: 12
   - Cantidad de Cajas: 5 ← Acción del usuario
4. JavaScript auto-calcula: 5 × 12 = 60 unidades
5. Campo "Unidades Totales Calculadas" muestra: 60
6. Usuario hace click "Guardar"
7. Frontend envía POST con `cantidad=60`
8. Backend crea Producto y ProductoContenedor con 60 unidades
9. Modal se cierra, página se recarga
```

### Flujo 2: Agregar Producto Existente al Contenedor
```
1. Usuario hace click en "Agregar Producto Existente"
2. Modal se abre, campos en estado inicial
3. Usuario selecciona producto: "Producto ABC (código: ABC-123)"
4. JavaScript hace fetch a /productos/123/datos-basicos/
5. Se carga: Unidades x Caja = 20 (readonly)
6. Usuario ingresa: Cantidad de Cajas: 3
7. JavaScript auto-calcula: 3 × 20 = 60 unidades
8. Campo "Unidades Totales Calculadas" muestra: 60
9. Usuario hace click "Agregar Producto"
10. Frontend envía POST con `cantidad=60`
11. Backend suma 60 unidades al ProductoContenedor
12. Modal se cierra, página se recarga
```

---

## Pruebas Manuales Requeridas

### Test 1: Auto-cálculo de Unidades (Nuevo Producto)
- [ ] Abrir modal "Crear Nuevo Producto"
- [ ] Ingresar: Unidades x Caja = 12
- [ ] Ingresar: Cantidad de Cajas = 5
- [ ] Verificar: Campo "Unidades Totales Calculadas" = 60
- [ ] Cambiar: Cantidad de Cajas = 10
- [ ] Verificar: Campo actualiza a 120

### Test 2: Auto-cálculo de Unidades (Producto Existente)
- [ ] Abrir modal "Agregar Producto Existente"
- [ ] Seleccionar un producto
- [ ] Verificar: Campo "Unidades x Caja" se llena automáticamente
- [ ] Ingresar: Cantidad de Cajas = 3
- [ ] Verificar: Campo "Unidades Totales Calculadas" se calcula correctamente
- [ ] Cambiar: Cantidad de Cajas = 7
- [ ] Verificar: Campo actualiza correctamente

### Test 3: Guardado en Backend (Nuevo Producto)
- [ ] Completar Test 1
- [ ] Llenar otros campos requeridos (Código, Nombre, Categoría, Precio)
- [ ] Hacer click en "Guardar"
- [ ] Verificar: Modal se cierra
- [ ] Verificar: Página se recarga
- [ ] Verificar: Nuevo producto aparece en tabla con 60 unidades

### Test 4: Guardado en Backend (Producto Existente)
- [ ] Completar Test 2
- [ ] Hacer click en "Agregar Producto"
- [ ] Verificar: Modal se cierra
- [ ] Verificar: Página se recarga
- [ ] Verificar: Producto muestra cantidad aumentada correctamente

### Test 5: Validación de Campos
- [ ] Intentar agregar con Cantidad de Cajas = 0
- [ ] Verificar: Mensaje de error aparece
- [ ] Intentar agregar con campos vacíos
- [ ] Verificar: Mensaje de error aparece

### Test 6: Limpiar Formulario
- [ ] Abrir modal "Crear Nuevo Producto"
- [ ] Ingresar algunos valores
- [ ] Hacer click "Cancelar"
- [ ] Reabrir modal
- [ ] Verificar: Campos están limpios (especialmente "Unidades Totales" = 1)

---

## Verificación de Compatibilidad

✅ **Sin cambios en Backend Principal**
- Vista `agrear_producto_contenedor()` continúa igual
- Recibe `cantidad` como siempre
- No hay breaking changes

✅ **Sin Cambios en Modelos**
- Usa propiedades existentes: `Producto.unidades_por_caja`
- No requiere migraciones

✅ **Sin Cambios en API Existente**
- Nuevas rutas son aditivas
- Rutas antiguas funcionan igual

---

## Notas de Desarrollo

### Campos Usados

**Modal Nuevo Producto:**
- Input ID: `cantidad_cajas_modal` → name: `cantidad_cajas`
- Input ID: `unidades_por_caja_modal` → name: `unidades_por_caja`
- Input ID: `cantidad_modal` → name: `cantidad` ✅ esto se envía al backend

**Modal Producto Existente:**
- Select ID: `producto_id_modal` → name: `producto_id`
- Input ID: `cantidad_cajas_existente_modal` → name: `cantidad_cajas`
- Input ID: `unidades_por_caja_existente_modal` → name: `unidades_por_caja`
- Input ID: `cantidad_existente_modal` → name: `cantidad` ✅ esto se envía al backend

### Endpoint de Datos:
GET: `/productos/<id>/datos-basicos/`

Response JSON:
```json
{
    "id": 123,
    "codigo": "PROD-001",
    "nombre": "Producto XYZ",
    "unidades_por_caja": 12,
    "precio_unitario": 99.99,
    "stock": 500
}
```

---

## Troubleshooting

### Si el auto-cálculo no funciona:
1. Abrir consola del navegador (F12)
2. Verificar que no hay errores JavaScript
3. Verificar que los IDs de elementos coinciden:
   - `cantidad_cajas_modal`, `unidades_por_caja_modal`, `cantidad_modal`
   - `cantidad_cajas_existente_modal`, `unidades_por_caja_existente_modal`, `cantidad_existente_modal`

### Si no se cargan datos del producto:
1. Abrir consola del navegador (F12)
2. Verificar tab "Network" cuando se selecciona un producto
3. Buscar request GET a `/productos/XX/datos-basicos/`
4. Verificar que retorna status 200 con datos JSON

### Si no se guarda el producto:
1. Abrir consola del navegador (F12)
2. Verificar tab "Network" cuando se hace click "Guardar"
3. Buscar request POST al endpoint de agregar
4. Verificar que incluye `cantidad` con el valor calculado

---

## Status: ✅ LISTO PARA TESTING
