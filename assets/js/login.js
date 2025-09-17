document.addEventListener("DOMContentLoaded", function () {
  // valores por defecto
  let usuario = {
    nombre: "Julio Jaramillo",
    pin: 1234,
    saldo: 1000,
    login: false,
  };

  localStorage.setItem("usuario", JSON.stringify(usuario));

  const datos = localStorage.getItem("usuario");
  const usuarioGuardado = JSON.parse(datos);

  let inputPin = document.getElementById("pin");
  let btnLogin = document.getElementById("btnLogin");

  btnLogin.addEventListener("click", (e) => {
    e.preventDefault();
    if (inputPin.value.trim().length == 0) {
      Swal.fire({
        title: "Rellena los campos",
        text: "Debes ingresar tu pin para acceder",
        icon: "warning",
      });
      return;
    } else if (parseInt(inputPin.value.trim()) !== usuarioGuardado.pin) {
      Swal.fire({
        title: "Pin no valido",
        text: "Verifica haber ingresado el pin correcto",
        icon: "warning",
      });
      return;
    }

    usuarioGuardado.login = true;
    localStorage.setItem("usuario", JSON.stringify(usuarioGuardado));
  });
});
