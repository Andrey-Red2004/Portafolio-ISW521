// filtrar promedio mayor o igual a 80
const estudiantes = [
    { nombre: "Ana", promedio: 85 },
    { nombre: "Luis", promedio: 67 },
    {  nombre: "Sara", promedio: 91},
];


const aprobados = estudiantes.filter(estudiante => estudiante.promedio >= 80);
console.log(aprobados);