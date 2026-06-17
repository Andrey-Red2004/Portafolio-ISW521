const v8 = require("v8");

const variableJulian = {
    nombre: "Javascript",
    version: 2026
};

const tamano = v8.serialize(variableJulian).length;




console.log(`El tamaño de la variable es de: ${tamano} bytes`);