// Service Worker for StudyBuddy
self.addEventListener('push', function(event) {
    const data = event.data ? event.data.json() : { title: 'StudyBuddy', body: 'New Transmission' };
    
    const options = {
        body: data.body,
        icon: '/favicon.ico', // Adjust path if needed
        badge: '/favicon.ico',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/'
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});
