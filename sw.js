// sw.js — Service Worker real de Mi Taller Web.
// Reemplaza al viejo SW "blob" (que instalaba la PWA pero no podía
// recibir push). Este archivo va SUELTO en la raíz del sitio, al lado
// del index.html — no se toca el archivo único de la app.

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Mismo firebaseConfig que en index.html (son datos públicos del proyecto,
// no un secreto — igual que ya viaja embebido en el HTML).
firebase.initializeApp({
    apiKey: "AIzaSyDI02DP9KrCRpAdSF6SmPr91TssLEf8290",
    authDomain: "github-c3e96.firebaseapp.com",
    databaseURL: "https://github-c3e96-default-rtdb.firebaseio.com",
    projectId: "github-c3e96",
    storageBucket: "github-c3e96.firebasestorage.app",
    messagingSenderId: "403618822429",
    appId: "1:403618822429:web:ace2540068e2edba9809f4"
});

const messaging = firebase.messaging();

// Se dispara cuando llega un push y la app está CERRADA o en segundo plano.
// El Worker manda el aviso como "data" solamente (sin bloque "notification"),
// justamente para que este sea el ÚNICO lugar donde se dibuja la notificación.
// Si el servidor mandara "notification", Chrome dibujaría una por su cuenta
// además de esta y llegarían duplicadas.
messaging.onBackgroundMessage((payload) => {
    const d = payload.data || {};
    const titulo = (payload.notification && payload.notification.title) || d.title || 'Mi Taller Web';
    const cuerpo = (payload.notification && payload.notification.body) || d.body || '';
    const tag = d.tag || 'mtw-aviso';

    // Red de seguridad: si ya hay una notificación de este mismo presupuesto
    // en pantalla, la cerramos antes de mostrar la nueva.
    self.registration.getNotifications({ tag }).then((previas) => {
        previas.forEach(n => n.close());
        self.registration.showNotification(titulo, {
            body: cuerpo,
            tag: tag,
            renotify: false,
            data: d,
            requireInteraction: false
        });
    });
});

// Al tocar la notificación, abre (o enfoca) la app.
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = (event.notification.data && event.notification.data.url) || '/';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lista) => {
            for (const c of lista) {
                if ('focus' in c) return c.focus();
            }
            if (clients.openWindow) return clients.openWindow(url);
        })
    );
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));
