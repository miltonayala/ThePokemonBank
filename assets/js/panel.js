document.addEventListener("DOMContentLoaded", function () {

  const btnCerrarSesion = document.getElementById("btnSalir");
  const txtCuenta = document.getElementById("cuenta");
  const datosCliente = JSON.parse(localStorage.getItem("usuario"));
  const saldoDisponible = document.getElementById("saldo");
  const nombreUsuario = document.getElementById("nombreUsuario");


  saldoDisponible.textContent = "$" + datosCliente.saldo.toFixed(2);
  txtCuenta.textContent = datosCliente.cuenta
  nombreUsuario.textContent = datosCliente.nombre;

  btnCerrarSesion.addEventListener("click", () => {
    datosCliente.login = false;
    localStorage.setItem("usuario", JSON.stringify(datosCliente));
    location.href = "/";
  });

});
