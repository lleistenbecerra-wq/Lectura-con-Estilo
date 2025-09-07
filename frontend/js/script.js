// Variables para los elementos del DOM
const loginContainer = document.getElementById('login-container');
const practiceContainer = document.getElementById('practice-container');
const loginForm = document.getElementById('login-form');
const textoLectura = document.getElementById('texto-lectura');
const btnGrabar = document.getElementById('btn-grabar');
const btnDetener = document.getElementById('btn-detener');
const retroalimentacionDiv = document.getElementById('retroalimentacion');
const btnLimpiar = document.getElementById('btn-limpiar');
const btnSiguienteTexto = document.getElementById('btn-siguiente-texto');

// Variables para la grabación de audio
let mediaRecorder;
let audioChunks = [];

// Array con los textos para practicar
const textosDePractica = [
    `El café, una bebida que nos despierta cada mañana, tiene una historia tan rica como su sabor. Originario de las tierras altas de Etiopía, fue descubierto por un pastor que notó cómo sus cabras se volvían más enérgicas después de consumir ciertas bayas.`,
    `La luz de las estrellas que vemos por la noche es en realidad luz de hace mucho tiempo. La estrella más cercana a la Tierra, aparte del sol, se llama Próxima Centauri y su luz tarda más de cuatro años en llegar a nosotros.`,
    `La abeja es un insecto crucial para el ecosistema. Al volar de flor en flor, transportan polen, un proceso conocido como polinización que es vital para la reproducción de muchas plantas, incluyendo la mayoría de los cultivos alimentarios.`
];
// Variable para seguir el índice del texto actual
let textoActualIndex = 0;

// Función para cambiar el texto en la página
function mostrarSiguienteTexto() {
    textoActualIndex = (textoActualIndex + 1) % textosDePractica.length;
    textoLectura.innerText = textosDePractica[textoActualIndex];
    
    retroalimentacionDiv.innerHTML = '<p>Presiona "Grabar" para empezar a leer. Tu análisis aparecerá aquí.</p>';
    btnLimpiar.disabled = true;
}

// Función para inicializar la grabación
btnGrabar.addEventListener('click', async () => {
    btnGrabar.disabled = true;
    btnDetener.disabled = false;
    btnLimpiar.disabled = true;
    retroalimentacionDiv.innerHTML = '<p class="text-info">Grabando... Por favor, lee el texto.</p>';

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm; codecs=opus' });
        audioChunks = [];

        // Verifica si el evento contiene datos de audio
        mediaRecorder.ondataavailable = event => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm; codecs=opus' });
            
            console.log('Blob de audio creado. Tipo:', audioBlob.type, 'Tamaño:', audioBlob.size, 'bytes');
            
            if (audioBlob.size > 0) {
                enviarAudioAIA(audioBlob, textoLectura.innerText);
            } else {
                console.error('El audio grabado está vacío.');
                retroalimentacionDiv.innerHTML = '<p class="text-danger">El audio grabado está vacío. Por favor, asegúrate de hablar y revisa la configuración del micrófono.</p>';
            }
        };

        mediaRecorder.start();

    } catch (error) {
        console.error('Error al acceder al micrófono:', error);
        retroalimentacionDiv.innerHTML = '<p class="text-danger">No se pudo acceder al micrófono. Por favor, revisa los permisos.</p>';
        btnGrabar.disabled = false;
        btnDetener.disabled = true;
        btnLimpiar.disabled = false;
    }
});

// Función para detener la grabación
btnDetener.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        btnGrabar.disabled = false;
        btnDetener.disabled = true;
        retroalimentacionDiv.innerHTML = '<p class="text-warning">Analizando tu grabación...</p>';
    }
});

// --- FUNCIÓN PARA CONECTAR AL BACKEND ---
async function enviarAudioAIA(audioBlob, textoLeido) {
    try {
        console.log('--- Iniciando envío de audio al backend ---');
        const formData = new FormData();
        formData.append('audio', audioBlob, 'grabacion.webm'); 
        formData.append('texto', textoLeido);
        
        console.log('Preparando petición fetch...');

        const response = await fetch('http://localhost:3000/analizar', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.statusText}`);
        }

        const resultados = await response.json();
        mostrarResultados(resultados);

    } catch (error) {
        console.error('Error al enviar audio al backend:', error);
        retroalimentacionDiv.innerHTML = '<p class="text-danger">Hubo un problema al conectar con el servidor. Por favor, inténtalo de nuevo más tarde.</p>';
    }
}
// ---------------------------------------------------

// Función para mostrar los resultados al usuario
function mostrarResultados(resultados) {
    let htmlResultados = `<h5>Análisis Completado:</h5>`;
    
    if (resultados.velocidad) {
        htmlResultados += `<p><strong>Velocidad:</strong> ${resultados.velocidad} palabras por minuto. ¡Bien hecho!</p>`;
    }

    if (resultados.errores && resultados.errores.length > 0) {
        htmlResultados += `
            <h6>Puntos a mejorar:</h6>
            <ul>
        `;
        resultados.errores.forEach(error => {
            htmlResultados += `<li>La palabra **"${error.palabra}"** necesita mejora. Razón: ${error.razon}.</li>`;
        });
        htmlResultados += `</ul>`;
    } else if (resultados.mensaje) {
        htmlResultados += `<p class="text-success">${resultados.mensaje}</p>`;
    } else {
        htmlResultados += `<p class="text-success">¡Excelente! Tu lectura es perfecta.</p>`;
    }

    retroalimentacionDiv.innerHTML = htmlResultados;
    btnLimpiar.disabled = false;
}

// Lógica para el botón de limpiar
btnLimpiar.addEventListener('click', () => {
    retroalimentacionDiv.innerHTML = '<p>Presiona "Grabar" para empezar a leer. Tu análisis aparecerá aquí.</p>';
    btnLimpiar.disabled = true;
});

// Event listener para el botón de "Siguiente Texto"
btnSiguienteTexto.addEventListener('click', mostrarSiguienteTexto);


// --- LÓGICA AGREGADA PARA EL FORMULARIO DE INGRESO ---
loginForm.addEventListener('submit', (e) => {
    e.preventDefault(); // Evita que la página se recargue

    // Oculta el formulario y muestra la sección de lectura
    loginContainer.classList.add('hidden');
    practiceContainer.classList.remove('hidden');

    // Muestra el primer texto de práctica automáticamente
    mostrarSiguienteTexto();
});

// --- LÓGICA AGREGADA PARA EL FORMULARIO DE CONTACTO ---
const contactForm = document.getElementById('contact-form');

contactForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Detiene el envío del formulario por defecto

    const formData = new FormData(contactForm);
    const data = Object.fromEntries(formData.entries());

    try {
        const response = await fetch('http://localhost:3000/enviar_mensaje', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            alert('¡Mensaje enviado con éxito!');
            contactForm.reset(); // Limpia el formulario
        } else {
            throw new Error(`Error del servidor: ${response.statusText}`);
        }
    } catch (error) {
        console.error('Error al enviar el mensaje:', error);
        alert('Hubo un problema al enviar el mensaje. Por favor, inténtalo de nuevo.');
    }
});