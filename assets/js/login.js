document.addEventListener("DOMContentLoaded", function () {
  // valores por defecto
  
  let usuario = {
    cuenta: 1236548215,
    nombre: "Ash Ketchum",
    pin: 1234,
    saldo: 500.00,
    login: false,
  };

  localStorage.setItem("usuario", JSON.stringify(usuario));

  const datos = localStorage.getItem("usuario");
  const usuarioGuardado = JSON.parse(datos);

  let inputPin = document.getElementById("pin");
  let inputUsuario = document.getElementById("usuario");
  let btnLogin = document.getElementById("btnLogin");

  btnLogin.addEventListener("submit", (e) => {
    e.preventDefault();
    if (inputPin.value.trim().length == 0 || inputUsuario.value.trim().length == 0) {
      Swal.fire({
        title: "Rellena los campos",
        text: "Debes ingresar tu usuario y pin para acceder",
        icon: "warning",
      });
      return;
    } else if (inputUsuario.value.trim() !== usuarioGuardado.nombre || parseInt(inputPin.value.trim()) !== usuarioGuardado.pin) {
      Swal.fire({
        title: "Usuario o pin no valido",
        text: "Verifica haber ingresado el usuario o pin correcto",
        icon: "warning",
      });
      return;
    }

    usuarioGuardado.login = true;
    localStorage.setItem("usuario", JSON.stringify(usuarioGuardado));
    location.href = "panel.html"
  });
});
