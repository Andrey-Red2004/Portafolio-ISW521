// metoodo funcional declarativo
const precios = [100, 250, 80, 400];
const caros = [];
for(let i = 0; i < precios.length; i++) {
    if(precios[i] > 150) {
        caros.push(precios[i]);
    }
}
console.log(caros);