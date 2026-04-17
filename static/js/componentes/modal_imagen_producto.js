// Modal universal para visualizar imagen de producto
// Requiere: un modal con id #modalImagenProducto y una imagen #modalImagenProductoImg

(function () {
    function onReady(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn);
        } else {
            fn();
        }
    }

    function setModalImage(trigger, modalImg) {
        var src = trigger.getAttribute('data-img-src') || trigger.getAttribute('src') || '';
        var alt = trigger.getAttribute('data-img-alt') || trigger.getAttribute('alt') || '';
        modalImg.src = src;
        modalImg.alt = alt;
    }

    function clearModalImage(modalImg) {
        modalImg.src = '';
        modalImg.alt = '';
    }

    onReady(function () {
        var modal = document.getElementById('modalImagenProducto');
        var modalImg = document.getElementById('modalImagenProductoImg');
        if (!modal || !modalImg) return;

        // Click en miniatura
        document.body.addEventListener('click', function (e) {
            var trigger = e.target.closest('.producto-imagen-tabla[data-target="#modalImagenProducto"]');
            if (!trigger) return;
            setModalImage(trigger, modalImg);
        });

        // Accesibilidad: Enter/Espacio en miniatura
        document.body.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            var trigger = e.target.closest('.producto-imagen-tabla[data-target="#modalImagenProducto"]');
            if (!trigger) return;
            e.preventDefault();
            trigger.click();
        });

        // Al cerrar modal: limpiar imagen y sacar foco para evitar warning aria-hidden
        var onHidden = function () {
            clearModalImage(modalImg);
            if (document.activeElement && typeof document.activeElement.blur === 'function') {
                document.activeElement.blur();
            }
        };

        // Bootstrap 4 suele exponer eventos por jQuery; si existe, úsalo
        if (window.jQuery && window.jQuery.fn && typeof window.jQuery.fn.on === 'function') {
            window.jQuery(modal).on('hidden.bs.modal', onHidden);
        } else {
            // Fallback si el evento se emite nativamente
            modal.addEventListener('hidden.bs.modal', onHidden);
        }
    });
})();
