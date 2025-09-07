const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const os = require('os');
const ffmpeg = require('fluent-ffmpeg');
const speech = require('@google-cloud/speech');
const nodemailer = require('nodemailer'); 
const cors = require('cors'); // Agregado para manejar CORS
require('dotenv').config();

// Configura las rutas de FFmpeg y FFprobe
ffmpeg.setFfmpegPath('C:\\ffmpeg\\ffmpeg-7.1.1-essentials_build\\bin\\ffmpeg.exe');
ffmpeg.setFfprobePath('C:\\ffmpeg\\ffmpeg-7.1.1-essentials_build\\bin\\ffprobe.exe');

// Carga las credenciales de forma directa
const credentialsPath = path.join(__dirname, 'credentials', 'mi-lector-de-voz-16407ff35672.json');
const credentials = JSON.parse(fs.readFileSync(credentialsPath));

const app = express();
const PORT = 3000;

const client = new speech.SpeechClient({
    credentials: credentials
});

const upload = multer({ storage: multer.memoryStorage() });

// Middleware para servir archivos estáticos y para CORS
app.use(express.static(path.join(__dirname, '..', 'frontend')));
app.use(cors()); // Usa el middleware de CORS
app.use(express.json());

// --- CÓDIGO PARA EL FORMULARIO DE CONTACTO ---
// Se ha cambiado la ruta a '/enviar_mensaje' para que coincida con el frontend
app.post('/enviar_mensaje', (req, res) => {
    const { nombre, correo, mensaje } = req.body;

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'lleistenbecerra@gmail.com',
            pass: 'xxsglvoaaagppjck' // Clave de aplicación actualizada
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    const mailOptions = {
        from: 'lleistenbecerra@gmail.com',
        to: 'lleistenbecerra@gmail.com',
        subject: 'Nuevo mensaje de contacto de Lectura con Estilo',
        html: `
            <p><strong>Nombre:</strong> ${nombre}</p>
            <p><strong>Correo:</strong> ${correo}</p>
            <p><strong>Mensaje:</strong> ${mensaje}</p>
        `
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
            return res.status(500).send('Error al enviar el correo.');
        }
        console.log('Correo enviado: ' + info.response);
        res.status(200).send('Mensaje enviado correctamente.');
    });
});
// ----------------------------------------------------

app.post('/analizar', upload.single('audio'), async (req, res) => {
    let tempAudioPath = null;
    let tempWavPath = null;
    try {
        if (!req.file) {
            return res.status(400).send('No se ha enviado ningún archivo de audio.');
        }

        const textoLeido = req.body.texto;
        const audioBlob = req.file.buffer;

        console.log('--- Petición recibida en el backend, convirtiendo audio y enviando a la API ---');

        tempAudioPath = path.join(os.tmpdir(), `audio_${Date.now()}.webm`);
        fs.writeFileSync(tempAudioPath, audioBlob);

        tempWavPath = path.join(os.tmpdir(), `audio_convertido_${Date.now()}.wav`);

        await new Promise((resolve, reject) => {
            ffmpeg(tempAudioPath)
                .toFormat('wav')
                .audioCodec('pcm_s16le')
                .audioChannels(1)
                .audioFrequency(16000)
                .on('error', (err) => {
                    console.error('Error de FFmpeg:', err.message);
                    reject(new Error('Error al convertir el audio.'));
                })
                .on('end', () => {
                    console.log('Conversión de audio completada.');
                    resolve();
                })
                .save(tempWavPath);
        });

        const audioBuffer = fs.readFileSync(tempWavPath);

        console.log(`Audio convertido a WAV guardado en: ${tempWavPath}`);
        console.log('Enviando audio a la API de Google...');

        const audio = {
            content: audioBuffer.toString('base64'),
        };

        const config = {
            encoding: 'LINEAR16',
            sampleRateHertz: 16000,
            languageCode: 'es-ES',
            audioChannelCount: 1,
            enableAutomaticPunctuation: true,
        };
        const request = {
            audio: audio,
            config: config,
        };

        const [response] = await client.recognize(request);
        console.log('Respuesta completa de la API:', response);
        const textoTranscrito = response.results
            .map(result => result.alternatives[0].transcript)
            .join('\n');

        console.log('Texto transcrito por la API:', textoTranscrito);

        let erroresEncontrados = [];
        const palabrasOriginales = textoLeido.toLowerCase().replace(/[.,!?]/g, '').split(' ');
        const palabrasTranscritas = textoTranscrito.toLowerCase().replace(/[.,!?]/g, '').split(' ');

        for (let i = 0; i < palabrasOriginales.length; i++) {
            if (i >= palabrasTranscritas.length) {
                erroresEncontrados.push({
                    palabra: palabrasOriginales[i],
                    razon: "La palabra ha sido omitida en la pronunciación."
                });
            } else if (palabrasOriginales[i] !== palabrasTranscritas[i]) {
                erroresEncontrados.push({
                    palabra: palabrasOriginales[i],
                    razon: `La API transcribió: "${palabrasTranscritas[i]}"`
                });
            }
        }
        
        if (palabrasTranscritas.length > palabrasOriginales.length) {
            for (let i = palabrasOriginales.length; i < palabrasTranscritas.length; i++) {
                erroresEncontrados.push({
                    palabra: "extra",
                    razon: `La palabra "${palabrasTranscritas[i]}" fue pronunciada extra.`
                });
            }
        }

        if (erroresEncontrados.length > 0) {
            res.status(200).json({ errores: erroresEncontrados });
        } else {
            res.status(200).json({ mensaje: "¡Excelente! Tu lectura es perfecta." });
        }

    } catch (error) {
        console.error('Error al llamar a la API o al procesar la solicitud:', error.details || error.message);
        res.status(500).json({ error: 'Hubo un problema al analizar tu grabación. Por favor, inténtalo de nuevo.' });
    } finally {
        if (tempAudioPath) {
            fs.unlink(tempAudioPath, (err) => {
                if (err) console.error('Error al eliminar archivo temporal:', err);
            });
        }
    }
});

app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});