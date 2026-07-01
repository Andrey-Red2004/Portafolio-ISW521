//trasformar a  formato NOMBRE(CARNET)
const estudiantes = [
    {nombre: "Ana", carnet: "2024001"},
    {nombre: "Luis", carnet: "2024002"}


];
const formatos = estudiantes.map(estudiante => `${estudiante.nombre}(${estudiante.carnet})`.toUpperCase());
console.log(formatos);