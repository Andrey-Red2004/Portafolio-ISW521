export { crearPedido, calcularTotalDia };

crearPedido("Ana", "Casado", 2500, "Sin cebolla");
crearPedido("Luis", "Cafe con pan", 1200, undefined);
console.log("Total del dia: " + calcularTotalDia());

