//script para pago de servicios
const modalUno = document.getElementById('modalUno');
        modalUno.addEventListener('show.bs.modal', function (event) {
            // El botón que activó el modal
            const button = event.relatedTarget;

            // Obtener data atributos
            const contenedorBisabuelo = button.parentElement.parentElement;
            const idBisabuelo = contenedorBisabuelo.id;
            const texto = button.textContent;
            //generar nombre de categoria correcto
            const categoria = generarNombreCategoria(idBisabuelo)

            // Mostrar información en el modal
            const modalBody = modalUno.querySelector('.modal-body');
            modalBody.innerHTML = `
            <!-- Información con estilo rojo/acento -->
            <div class="alert alert-danger mb-3 border-0">
                <div class="d-flex">
                    <div class="me-3">
                        <i class="bi bi-building fs-4 text-danger"></i>
                    </div>
                    <div>
                        <strong class="text-dark">Servicios de ${categoria}</strong><br>
                        <small class="text-muted">Colector: <strong>${texto}</strong></small>
                    </div>
                </div>
            </div>

            <!-- Campo de entrada -->
            <div class="mb-3">
                <label class="form-label fw-semibold text-dark">
                    <i class="bi bi-key text-danger me-1"></i>
                    Identificador
                </label>
                <input type="text" 
                    class="form-control border-danger" 
                    id="referencia" 
                    placeholder="Ej: 123456789" 
                    required>
                <div class="form-text text-muted">
                    Ingrese su número de referencia
                </div>
            </div>
    `;
        });

        function generarNombreCategoria(id) {
            if (id == "listaEnergiaElectrica") {
                return "Energía Electrica"
            }
            if (id == "listaInternet") {
                return "Internet residencial"
            }
            if (id == "listatelefonia") {
                return "Telefonía Móvil"
            }
            if (id == "listaAgua") {
                return "Agua Potable"
            }
        }


        function aplicarPago() {
            // Cierra el modal manualmente
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalUno'));
            modal.hide();

            // Muestra alerta elegante
            Swal.fire({
                icon: 'success',
                title: '¡Éxito!',
                text: 'Pago aplicado con éxito',
                confirmButtonColor: '#dc3545'
            });
        }