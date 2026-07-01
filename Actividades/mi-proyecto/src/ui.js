export const renderizarResultado = (cantidad) =>{
    const contendor = document.querySelector("#app");
    contendor.innerHTML = `<div class = "tarjeta">
        <h1><h2>Gestion de usuarios</h2></h1>
        <p>La cantidad de usuarios es de: ${cantidad}</p>
    </div>`;

};