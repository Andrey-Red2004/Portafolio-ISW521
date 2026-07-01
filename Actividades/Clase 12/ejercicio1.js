// ordenar en orden
const numeros = [200, 150, 140, 360, 36];
numeros.sort((a, b) => a - b);
console.log(numeros);
//
for(let i = 0; i < numeros.length; i++) {
    console.log(numeros[i]);
}
//
const declarativo = numeros.map(num => num);