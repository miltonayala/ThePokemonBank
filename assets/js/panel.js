document.addEventListener("DOMContentLoaded", function () {

  const btnCerrarSesion = document.getElementById("btnSalir");
  const txtCuenta = document.getElementById("cuenta");
  const datosCliente = JSON.parse(localStorage.getItem("usuario"));
  const saldoDisponible = document.getElementById("saldo");

  saldoDisponible.textContent = "$" + datosCliente.saldo;
  txtCuenta.textContent = datosCliente.cuenta

  btnCerrarSesion.addEventListener("click", () => {
    datosCliente.login = false;
    localStorage.setItem("usuario", JSON.stringify(datosCliente));
    location.href = "/";
  });

});
