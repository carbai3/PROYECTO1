document.addEventListener("DOMContentLoaded", async function() {  
    const departmentSelect = document.getElementById("department");  
    const geoLocationInput = document.getElementById("geoLocation");  
    const keywordInput = document.getElementById("keyword");  
    const searchForm = document.getElementById("searchForm");  
    const resultsContainer = document.getElementById("results");  
    const modal = document.getElementById("imageModal");  
    const modalImageContainer = document.getElementById("modalImageContainer");  
    const closeButton = document.querySelector(".close-button");  

    // Función reutilizable para construir la URL de búsqueda
    function buildSearchUrl({ departmentId = "", keyword = "", geoLocation = "", hasImages = "" }) {
        let url = `https://collectionapi.metmuseum.org/public/collection/v1/search?`;
        if (departmentId) url += `&departmentId=${departmentId}`;
        if (keyword) url += `&q=${keyword}`;
        if (hasImages) url += `&hasImages=true`;
        if (geoLocation) url += `&geoLocation=${geoLocation}`;
        return url;
    }

    // Función para mostrar el modal con imágenes adicionales
    async function showModal(objectID) {
        try {
            const response = await fetch(`/object/${objectID}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            if (data.additionalImages && data.additionalImages.length > 0) {
                const modal = document.getElementById("imageModal");
                const modalImg = document.getElementById("modalImage");
                modalImg.src = data.additionalImages[0];
                modal.style.display = "block";
            } else {
                alert('No hay imágenes adicionales disponibles.');
            }
        } catch (error) {
            console.error('Error fetching additional images:', error);
            alert('Hubo un error al cargar las imágenes adicionales.');
        }
    }

    // Cargar departamentos desde la API
    try {  
        const response = await fetch("https://collectionapi.metmuseum.org/public/collection/v1/departments");  
        const data = await response.json();  

        data.departments.forEach(department => {  
            const option = document.createElement("option");  
            option.value = department.departmentId;  
            option.textContent = department.displayName;  
            departmentSelect.appendChild(option);  
        });  
    } catch (error) {  
        console.error("Error al cargar departamentos:", error);  
    }  

    // Manejador de evento para búsqueda
    searchForm.addEventListener("submit", async function(event) {  
        event.preventDefault();  

        const departmentId = departmentSelect.value;  
        const keyword = keywordInput.value.trim();  
        const geoLocation = geoLocationInput.value;

        const url = buildSearchUrl({ departmentId, keyword, geoLocation });

        try {  
            const response = await fetch(url);  
            if (!response.ok) throw new Error(`Error en la solicitud: ${response.status}`);
            
            const data = await response.json();  
            displayResults(data);  
        } catch (error) {  
            console.error("Error al buscar resultados:", error);  
            resultsContainer.innerHTML = "<p>Error al buscar resultados.</p>";  
        }  
    });  

    // Manejo de click en "Ver imágenes adicionales"
    document.addEventListener("click", function(event) {  
        if (event.target.tagName === 'A' && event.target.textContent.trim() === "Ver imágenes adicionales") {  
            event.preventDefault();  
            const objectID = event.target.getAttribute("href").split('/').pop();  
            showModal(objectID);  
        }  
    });  

    // Cerrar el modal al hacer clic en el botón de cerrar  
    closeButton.addEventListener("click", function() {  
        modal.style.display = "none";  
    });  

    // Cerrar el modal al hacer clic fuera de él  
    window.addEventListener("click", function(event) {  
        if (event.target === modal) {  
            modal.style.display = "none";  
        }  
    });

    // Función para mostrar resultados de búsqueda
    function displayResults(data) {  
        resultsContainer.innerHTML = "";  

        if (!data.objectIDs || data.objectIDs.length === 0) {  
            resultsContainer.innerHTML = "<p>No se encontraron resultados.</p>";  
            return;  
        }  

        const objectPromises = data.objectIDs.map(async (id) => {  
            const objectResponse = await fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`);  
            return objectResponse.json();  
        });

        Promise.all(objectPromises).then(objects => {  
            objects.forEach(object => {  
                const card = createCard(object);
                if (card) resultsContainer.appendChild(card);
            });  
        });  
    }

    // Función para crear tarjetas de resultado
    function createCard(object) {  
        const card = document.createElement("div");  
        card.className = "card";  

        const img = document.createElement("img");  
        img.src = object.primaryImage || '/image/sinImagen.jpg';  
        img.alt = object.title || 'Sin título';  
        img.title = object.objectDate || 'Desconocida';  

        const title = document.createElement("h2");  
        title.textContent = object.title || 'Sin título';  

        const culture = document.createElement("p");  
        culture.textContent = `Cultura: ${object.culture || 'Desconocida'}`;  

        const dynasty = document.createElement("p");  
        dynasty.textContent = `Dinastía: ${object.dynasty || 'Desconocida'}`;  

        const additionalImagesLink = document.createElement("a");  
        additionalImagesLink.href = `/object/${object.objectID}`;  
        additionalImagesLink.textContent = "Ver imágenes adicionales";  

        card.appendChild(img);  
        card.appendChild(title);  
        card.appendChild(culture);  
        card.appendChild(dynasty);  
        card.appendChild(additionalImagesLink);  

        return card;  
    }  
});
