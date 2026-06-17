const rol = "admin";
let permiso;
if (rol === "admin") {
    permiso = "total";

} else if (rol === "editor"){
    permiso = "lectura-escritura";
}else if (rol === "viewer"){
    permiso = "solo-lectura";
} else {
    permiso = "sin-permisos";
}


const permiso2 = rol === 'admin' ? 'total' : rol === 'editor' ? 'lectura-escritura' : rol === 'viewer' ? 'solo-lectura' : 'sin-permisos';


switch (rol) {case 'admin':
    permiso = 'total';
    break;
case 'editor':
    permiso = 'lectura-escritura';
    break;
case 'viewer': 
    permiso = 'solo-lectura';
    break;
default:    permiso = 'sin-permisos';
    break;
}


console.log(permiso);
console.log(permiso2);
