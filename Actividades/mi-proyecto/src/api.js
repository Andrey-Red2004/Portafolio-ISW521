const apiURL = "https://jsonplaceholder.typicode.com/users";

export const obtenerUsuarios = async () => {
    try{
        const respuesta = await fetch(apiURL);
        if(!respuesta.ok) throw Error("Error de red");
        return await respuesta.json();
    }catch (error){
        console.log("Error al obtener los datos del usuario", error);
        return[];
    }
};