<?php
// Dirección de correo a la que se enviará el mensaje.
$to = "lleistenbecerra@gmail.com"; // CAMBIADO a tu dirección de correo real.

// Asunto del correo.
$subject = "Nuevo Mensaje de Contacto - Lectura con Estilo";

// Recibir los datos del formulario.
$name = $_POST['nombre'];
$email = $_POST['email'];
$message = $_POST['mensaje'];

// Encabezados del correo.
$headers = "From: " . $email . "\r\n";
$headers .= "Reply-To: " . $email . "\r\n";
$headers .= "Content-Type: text/html; charset=UTF-8\r\n";

// Contenido del correo en formato HTML.
$email_content = "
<html>
<head>
    <title>Nuevo Mensaje de Contacto</title>
</head>
<body>
    <h2>Mensaje de Contacto de Lectura con Estilo</h2>
    <p><b>Nombre:</b> " . htmlspecialchars($name) . "</p>
    <p><b>Correo Electrónico:</b> " . htmlspecialchars($email) . "</p>
    <p><b>Mensaje:</b></p>
    <p>" . htmlspecialchars($message) . "</p>
</body>
</html>
";

// Envía el correo.
if (mail($to, $subject, $email_content, $headers)) {
    // Si el correo se envió correctamente, redirige a una página de éxito.
    header("Location: gracias.html");
    exit();
} else {
    // Si hubo un error, muestra un mensaje de error.
    echo "Hubo un problema al enviar el mensaje. Por favor, inténtalo de nuevo más tarde.";
}
?>