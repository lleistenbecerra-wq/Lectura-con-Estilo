document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contactForm');

    contactForm.addEventListener('submit', function(event) {
        event.preventDefault();

        // Obtener los valores del formulario
        const nombre = document.getElementById('nombre').value;
        const correo = document.getElementById('correo').value;
        const mensaje = document.getElementById('mensaje').value;

        // Crear un objeto con los datos
        const data = {
            nombre: nombre,
            correo: correo,
            mensaje: mensaje
        };

        // Enviar los datos al servidor usando la función fetch()
        fetch('/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            // Verificar si la respuesta del servidor es exitosa
            if (!response.ok) {
                throw new Error('Hubo un problema al enviar el mensaje.');
            }
            return response.text();
        })
        .then(text => {
            // Mostrar un mensaje de éxito
            alert(text);
            // Limpiar el formulario
            contactForm.reset();
        })
        .catch(error => {
            // Manejar errores si el envío falla
            console.error('Error:', error);
            alert('Hubo un error al enviar tu mensaje. Por favor, inténtalo de nuevo más tarde.');
        });
    });
});