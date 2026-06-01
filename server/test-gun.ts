// En server, crea test-gun.js:
const Gun = require('gun');
const gun = Gun('ws://localhost:3001/gun');

// Escribir dato de prueba
gun.get('test').put({ message: 'Hola desde test!', timestamp: Date.now() });

// Leer dato
gun.get('test').on((data: any) => {
  console.log('Recibido:', data);
  process.exit(0);
});

setTimeout(() => {
  console.log('Timeout - no se recibieron datos');
  process.exit(1);
}, 5000);

// Ejecutar: node test-gun.js
