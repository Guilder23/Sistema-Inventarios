document.addEventListener('DOMContentLoaded', function () {
    inicializarModalRegistrarDanado();
});

function inicializarModalRegistrarDanado() {
    const inputFoto = document.getElementById('fotoDanado');
    const imgPreview = document.getElementById('imgPreviewDanado');
    const previewContainer = document.getElementById('previewFotoDanado');
    const placeholder = document.getElementById('placeholderFotoDanado');
    const modal = document.getElementById('modalRegistrarDanado');

    // Previsualización de imagen
    if (inputFoto) {
        inputFoto.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    imgPreview.src = e.target.result;
                    previewContainer.style.display = 'block';
                    placeholder.style.display = 'none';
                };
                
                reader.readAsDataURL(this.files[0]);
            } else {
                // No hay archivo seleccionado, mostrar placeholder
                previewContainer.style.display = 'none';
                placeholder.style.display = 'flex';
            }
        });
    }

    // Limpiar formulario y preview al cerrar el modal
    if (modal) {
        $(modal).on('hidden.bs.modal', function () {
            const form = modal.querySelector('form');
            if (form) {
                form.reset();
            }
            
            // Restablecer preview
            if (imgPreview) imgPreview.src = '';
            if (previewContainer) previewContainer.style.display = 'none';
            if (placeholder) placeholder.style.display = 'flex';
        });
    }
}
