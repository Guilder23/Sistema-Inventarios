/**
 * SISTEMA DE MODALES PERSONALIZADOS DEL SISTEMA
 * Reemplaza alert(), confirm(), prompt() del navegador
 */

// Sistema global de modales
window.ModalSistema = {
    
    /**
     * Modal de confirmación
     * @param {string} titulo - Título del modal
     * @param {string} mensaje - Mensaje a mostrar
     * @param {object} opciones - {
     *   tipo: 'danger'|'warning'|'info'|'success',
     *   textoConfirmar: 'Confirmar',
     *   textoCancel: 'Cancelar',
     *   onConfirm: function(),
     *   onCancel: function()
     * }
     */
    confirmar: function(titulo, mensaje, opciones = {}) {
        const defaults = {
            tipo: 'warning',
            textoConfirmar: 'Confirmar',
            textoCancel: 'Cancelar',
            onConfirm: () => {},
            onCancel: () => {}
        };
        opciones = { ...defaults, ...opciones };

        const iconos = {
            danger: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle',
            success: 'fa-check-circle'
        };

        const html = `
            <div class="modal-overlay activo" id="modalConfirmacion">
                <div class="modal-contenedor modal-confirmacion">
                    <div class="modal-header">
                        <h3>${titulo}</h3>
                        <button type="button" class="modal-close-btn" onclick="ModalSistema.cerrar('modalConfirmacion')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="modal-icon ${opciones.tipo}">
                            <i class="fas ${iconos[opciones.tipo]}"></i>
                        </div>
                        <p>${mensaje}</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="modal-btn modal-btn-secondary" onclick="ModalSistema.cerrar('modalConfirmacion')">
                            <i class="fas fa-times"></i> ${opciones.textoCancel}
                        </button>
                        <button type="button" class="modal-btn modal-btn-${opciones.tipo === 'danger' ? 'danger' : 'success'}" id="btnConfirmar">
                            <i class="fas fa-check"></i> ${opciones.textoConfirmar}
                        </button>
                    </div>
                </div>
            </div>
        `;

        this._insertarModal(html);
        
        document.getElementById('btnConfirmar').addEventListener('click', () => {
            opciones.onConfirm();
            this.cerrar('modalConfirmacion');
        });

        document.getElementById('modalConfirmacion').addEventListener('dragstart', (e) => {
            if (e.target.id === 'modalConfirmacion') {
                this.cerrar('modalConfirmacion');
                opciones.onCancel();
            }
        });
    },

    /**
     * Notificación simple
     * @param {string} titulo - Título
     * @param {string} mensaje - Mensaje
     * @param {string} tipo - 'success'|'danger'|'warning'|'info'
     * @param {number} duracion - ms antes de cerrar automáticamente (0 = no cierra)
     */
    notificar: function(titulo, mensaje, tipo = 'info', duracion = 3000) {
        const iconos = {
            success: 'fa-check-circle',
            danger: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        const html = `
            <div class="modal-overlay activo" id="modalNotificacion" style="background-color: transparent; pointer-events: none;">
                <div class="modal-contenedor modal-notificacion" style="pointer-events: auto;">
                    <div class="modal-header">
                        <h3>
                            <i class="fas ${iconos[tipo]}"></i> ${titulo}
                        </h3>
                        <button type="button" class="modal-close-btn" onclick="ModalSistema.cerrar('modalNotificacion')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-${tipo}">
                            ${mensaje}
                        </div>
                    </div>
                </div>
            </div>
        `;

        this._insertarModal(html);

        if (duracion > 0) {
            setTimeout(() => {
                const modal = document.getElementById('modalNotificacion');
                if (modal) this.cerrar('modalNotificacion');
            }, duracion);
        }
    },

    /**
     * Modal con formulario
     * @param {string} titulo - Título
     * @param {array} campos - Array de campos { name, label, type, required, placeholder }
     * @param {object} opciones - { textoConfirmar, onSubmit }
     */
    formulario: function(titulo, campos, opciones = {}) {
        const defaults = {
            textoConfirmar: 'Guardar',
            onSubmit: () => {}
        };
        opciones = { ...defaults, ...opciones };

        let html = `
            <div class="modal-overlay activo" id="modalFormulario">
                <div class="modal-contenedor modal-formulario">
                    <div class="modal-header">
                        <h3>${titulo}</h3>
                        <button type="button" class="modal-close-btn" onclick="ModalSistema.cerrar('modalFormulario')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <form id="formSistema">
                        <div class="modal-body">
        `;

        campos.forEach(campo => {
            const requerido = campo.required ? 'required' : '';
            const labelRequerido = campo.required ? '<label class="required">' : '<label>';
            
            if (campo.type === 'textarea') {
                html += `
                    <div class="form-group">
                        ${labelRequerido}${campo.label}</label>
                        <textarea name="${campo.name}" ${requerido} placeholder="${campo.placeholder || ''}"></textarea>
                    </div>
                `;
            } else {
                html += `
                    <div class="form-group">
                        ${labelRequerido}${campo.label}</label>
                        <input type="${campo.type || 'text'}" name="${campo.name}" ${requerido} placeholder="${campo.placeholder || ''}">
                    </div>
                `;
            }
        });

        html += `
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="modal-btn modal-btn-secondary" onclick="ModalSistema.cerrar('modalFormulario')">
                                <i class="fas fa-times"></i> Cancelar
                            </button>
                            <button type="submit" class="modal-btn modal-btn-primary">
                                <i class="fas fa-save"></i> ${opciones.textoConfirmar}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        this._insertarModal(html);

        const form = document.getElementById('formSistema');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const datos = new FormData(form);
            const objeto = Object.fromEntries(datos);
            opciones.onSubmit(objeto);
            this.cerrar('modalFormulario');
        });
    },

    /**
     * Modal de carga
     * @param {string} mensaje
     */
    cargando: function(mensaje = 'Cargando...') {
        const html = `
            <div class="modal-overlay activo" id="modalCargando" style="background-color: rgba(0, 0, 0, 0.7);">
                <div class="modal-contenedor modal-loading" style="max-width: 300px;">
                    <div class="spinner"></div>
                    <p style="margin: 0; color: #2d3748; font-weight: 500;">${mensaje}</p>
                </div>
            </div>
        `;

        this._insertarModal(html);
    },

    /**
     * Cerrar modal
     */
    cerrar: function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.animation = 'fadeOut 0.2s ease-out forwards';
            setTimeout(() => modal.remove(), 200);
        }
    },

    /**
     * Insertarmodal en el DOM
     */
    _insertarModal: function(html) {
        const container = document.getElementById('modalContainer') || document.body;
        const div = document.createElement('div');
        div.innerHTML = html;
        container.appendChild(div.firstElementChild);
    }
};

// Cerrar modal al hacer clic en el overlay
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        const modalId = e.target.id;
        ModalSistema.cerrar(modalId);
    }
});

// Cerrar modal con tecla ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modales = document.querySelectorAll('.modal-overlay.activo');
        if (modales.length > 0) {
            const ultimo = modales[modales.length - 1];
            ModalSistema.cerrar(ultimo.id);
        }
    }
});
