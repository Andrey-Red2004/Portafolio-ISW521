// crear suma
const gastos = [
{ cat: "comida", monto: 5000 },
{ cat: "transporte", monto:2000 },
{ cat: "comida", monto:3000 }    
];

const porCategoria = gastos.reduce((acumulador, gasto) => {
    acumulador[gasto.cat] = (acumulador[gasto.cat] || 0) + gasto.monto;
    return acumulador;
}, {});

const suma =  gastos.reduce((total, gasto) => total + gasto.monto, 0);
console.log(porCategoria);
console.log(suma);