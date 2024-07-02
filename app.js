require('dotenv').config();
const { createBot, createProvider, createFlow, addKeyword, EVENTS } = require('@bot-whatsapp/bot');
const BaileysProvider = require('@bot-whatsapp/provider/baileys');
const MockAdapter = require('@bot-whatsapp/database/mock');
// const MongoAdapter = require('@bot-whatsapp/database/mongo');


// Variables para manejar el estado del usuario y el temporizador
let timeoutId;
let botInstance;
let currentChatId;
let hasAskedIfInterested = false; // Variable para rastrear si se ha enviado el mensaje de seguimiento

const TIMEOUT_DURATION = 1500 * 60 * 1000; // 15 minutos
const AUTO_RESPONSE_INTERVAL = 3000; // 3 segundos

// Mensajes aleatorios para responder
const randomResponses = [
    '¡Qué bueno saber de ti!',
    '¿Hay algo más en lo que pueda ayudarte?',
    'Recuerda que tenemos ofertas especiales este mes.',
    '¡No olvides seguirnos en nuestras redes sociales!',
    '¿Tienes alguna otra pregunta?',
];

// Función para obtener una respuesta aleatoria
const getRandomResponse = () => randomResponses[Math.floor(Math.random() * randomResponses.length)];

// Función para preguntar al usuario si todavía está interesado en los productos
const askIfInterested = async () => {
    if (!botInstance || !currentChatId || hasAskedIfInterested) return;

    try {
        await botInstance.sendMessage(currentChatId, '¿Todavía estás interesado en nuestros productos?');
        hasAskedIfInterested = true; // Marcar como enviado
    } catch (error) {
        console.error('Error al preguntar si el usuario está interesado:', error.message);
    }
};

// Función para iniciar un temporizador de 15 minutos
const startTimeout = () => {
    clearTimeout(timeoutId); // Limpiar cualquier temporizador existente
    timeoutId = setTimeout(askIfInterested, TIMEOUT_DURATION);
};

// Función para normalizar el texto ingresado por el usuario (convertir a minúsculas)
const normalizeInput = (input) => input.toLowerCase().trim();

// Función para manejar mensajes entrantes
const handleIncomingMessage = async (message) => {
    try {
        console.log('Mensaje entrante:', message);
        currentChatId = message.from;

        // Reiniciar el temporizador y resetear el estado de seguimiento de interés
        startTimeout();
        hasAskedIfInterested = false;
    } catch (error) {
        console.error('Error al manejar el mensaje entrante:', error.message);
    }
};

// Flujo de bienvenida con menú
const flowWelcome = addKeyword([EVENTS.WELCOME])
    .addAnswer('🙌 ¡Hola! ¡Bienvenido al Super Tianguis del centro!')
    .addAnswer([
        '¿En qué puedo ayudarte hoy?',
        '1. Conocer el horario de atención',
        '2. Ubicación de la tienda',
        '3. Otras consultas'
    ])
    .addAnswer('Por favor, responde con el número de la opción que deseas.');

// Flujo para informar sobre el horario de atención
const flowHorario = addKeyword(['1', 'horario', 'abren', 'cierran', 'hora', 'horarios', 'apertura', 'cierre', 'tiempo'].map(normalizeInput))
    .addAnswer('¡Con gusto te daré esa información!')
    .addAnswer([
        'Nuestro horario es de: Lunes a Sábado de 10:00 am a 8:00 pm',
        'Domingo de 10:00 am a 4:00 pm.',
        '¡Estamos listos para recibirte y ofrecerte la mejor calidad de ropa a los mejores precios!',
        '¿Hay algo más en lo que pueda ayudarte? ¡Estoy aquí para asistirte!',
    ]);

// Flujo para informar sobre la ubicación
const flowUbicacion = addKeyword(['2', 'donde', 'ubicados', 'ubicación', 'parte', 'direccion', 'dirección', 'localizacion', 'localización', 'ubican', 'ubicacion'].map(normalizeInput))
    .addAnswer([
        'Nos encontramos en Progreso #104, zona centro.',
        'Estamos ubicados en una zona céntrica para tu conveniencia.',
        '¡Te esperamos para que puedas disfrutar de nuestra selección de ropa de alta calidad a precios accesibles!',
        '¿Hay algo más en lo que pueda asistirte? ¡Estoy aquí para ayudarte!',
    ])
    .addAnswer('https://maps.app.goo.gl/k8BuD8qisC7PPUhK7?g_st=com.google.maps.preview.copy');

// Flujo para otras consultas
const flowOtrasConsultas = addKeyword(['3', 'otros', 'otras', 'otra', 'otro', 'consulta', 'consultas', 'pregunta', 'preguntas'].map(normalizeInput))
    .addAnswer('Enseguida una persona te responderá sobre tu consulta.')
    // .addAction(async (ctx, bot) => {
    //     const adminChatId = 'ADMIN_CHAT_ID'; // Reemplaza con el ID de chat del administrador
    //     await bot.sendMessage(adminChatId, Consulta de otras consultas: ${ctx.body});
    // })
    .addAnswer('¿Hay algo más en lo que pueda asistirte?');

    const flowGratitude = addKeyword(['ok', 'gracias', 'bueno', 'bien', 'perfecto', 'genial', 'fantástico', 'excelente', 'acuerdo'].map(normalizeInput))
    .addAnswer([
        '¡Es un gusto ayudarte! 😊',
        'Si necesitas algo más, escribe "menú" para ver las opciones disponibles.'
    ])

// Función principal para iniciar el bot
const main = async () => {
    try {
        // const adapterDB = new MongoAdapter({
        //     dbUri: process.env.MONGO_DB_URI,
        //     dbName: "Bot"
        // });
        const adapterDB = new MockAdapter();
        const adapterFlow = createFlow([flowWelcome, flowHorario, flowUbicacion, flowOtrasConsultas, flowGratitude]);
        const adapterProvider = createProvider(BaileysProvider);

        botInstance = createBot({
            flow: adapterFlow,
            provider: adapterProvider,
            database: adapterDB,
            onMessage: handleIncomingMessage
        });

        startTimeout();

        // Configurar respuesta automática cada 3 segundos
        setInterval(async () => {
            if (currentChatId) {
                const randomResponse = getRandomResponse();
                await botInstance.sendMessage(currentChatId, randomResponse);
            }
        }, AUTO_RESPONSE_INTERVAL);

    } catch (error) {
        console.error('Error al iniciar el bot:', error);
    }
};

// Ejecutar la función principal y manejar errores globales
main().catch((error) => {
    console.error('Error en la ejecución principal:', error);
});
