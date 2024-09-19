import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import translate from "node-google-translate-skidz";

const app = express();
const PORT = 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de vistas y archivos estáticos
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "views")));

// Función para construir URL de búsqueda
function buildSearchUrl({ departmentId = "", keyword = "", hasImages = "", geoLocation = "" }) {
    const urlParams = new URLSearchParams();
    if (departmentId) urlParams.append("departmentId", departmentId);
    if (keyword) urlParams.append("q", keyword);
    if (hasImages) urlParams.append("hasImages", "true");
    if (geoLocation) urlParams.append("geoLocation", geoLocation);
    return `https://collectionapi.metmuseum.org/public/collection/v1/search?${urlParams.toString()}`;
}

// Función para manejar errores de objetos
async function fetchObjectData(objectIDs) {
    return Promise.all(objectIDs.map(async (id) => {
        try {
            if (!id) throw new Error("ID no válido o faltante");
            const objResponse = await axios.get(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`);
            if (objResponse.status === 404) throw new Error(`Objeto con ID ${id} no encontrado`);
            
            const object = objResponse.data;
            if (!object || !object.title) throw new Error("Objeto inválido recibido desde la API");
            
            object.title = await translateText(object.title || "Sin título");
            object.culture = await translateText(object.culture || "Desconocida");
            object.dynasty = await translateText(object.dynasty || "Desconocida");
            return object;
        } catch (error) {
            console.error(`Error al obtener datos del objeto ${id}:`, error.message);
            return null;
        }
    }));
}

// Función para traducir texto
async function translateText(text) {
    if (!text) return 'Desconocido';
    try {
        const result = await translate(text, { to: 'es' });
        return result.text;
    } catch (error) {
        console.error('Error al traducir:', error);
        return text;
    }
}

// Ruta de inicio
app.get("/", async (req, res) => {
    try {
        const response = await axios.get('https://collectionapi.metmuseum.org/public/collection/v1/departments');
        const departments = response.data.departments;
        res.render('index', { departments });
    } catch (error) {
        console.error('Error al cargar departamentos:', error);
        res.status(500).send('Error al cargar departamentos.');
    }
});


// Ruta de búsqueda
app.get('/search', async (req, res) => {  
    try {  
        const departmentId = req.query.departmentId || '';  
        const keyword = req.query.keyword || '';  
        const location = req.query.location || '';  
        const page = Math.max(1, parseInt(req.query.page)) || 1;   
        const limit = 20; // Máximo de objetos por página  
        const offset = (page - 1) * limit;  

        let url = buildSearchUrl({ departmentId, keyword, hasImages: true, geoLocation: location });  
        const response = await axios.get(url);  

        // Chequear si hay resultados  
        if (!response.data || !Array.isArray(response.data.objectIDs) || response.data.objectIDs.length === 0) {  
            return res.render('results', {  
                objects: [],  
                page,  
                totalPages: 0,  
                message: 'No se encontraron resultados para los filtros aplicados.'  
            });  
        }  

        const totalObjects = response.data.objectIDs.length; // Total de objetos disponibles  
        const totalPages = Math.ceil(totalObjects / limit); // Calcular total de páginas  
        const validObjectIDs = response.data.objectIDs.slice(offset, offset + limit); // Limitar a los que necesitas para la página actual   

        // Crea promises para obtener los detalles de los objetos  
        const fetchPromises = validObjectIDs.map(async (id) => {  
            try {  
                const objResponse = await axios.get(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`);  
                return objResponse.data;  // regresar el objeto  
            } catch (err) {  
                console.error(`Error al recuperar el objeto con ID ${id}:`, err.message);  
                return null;  
            }  
        });  

        // Esperar a que todas las promesas se resuelvan  
        const objects = await Promise.all(fetchPromises);  
        
        return res.render('results', {  
            objects: objects.filter(obj => obj !== null), // Filtrar nulos  
            page,  
            totalPages,  
            departmentId,  
            keyword,  
            location,  
            message: totalObjects === 0 ? 'No se encontraron resultados para los filtros aplicados.' : null  
        });  

    } catch (error) {  
        console.error('Error en la búsqueda:', error);  
        res.status(500).render('results', {  
            objects: [],  
            page: 1,  
            totalPages: 0,  
            message: 'Ocurrió un error al intentar buscar los resultados.'  
        });  
    }  
});
// Ruta para obtener un objeto específico
app.get('/object/:id', async (req, res) => {
    const objectId = req.params.id;
    try {
        const objResponse = await axios.get(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${objectId}`);
        const object = objResponse.data;

        res.render('additional-images', {  
            object,  
            additionalImages: object.additionalImages && object.additionalImages.length > 0 ? object.additionalImages : [],  
            message: object.additionalImages && object.additionalImages.length > 0 ? '' : 'No hay imágenes adicionales disponibles.'  });
    } catch (error) {
        console.error('Error al obtener el objeto:', error.message);
        res.status(500).json({ message: 'Error al obtener el objeto desde la API.' });
    }
});

// Inicia el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
