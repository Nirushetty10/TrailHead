import { io } from 'socket.io-client';

const socket = io('http://localhost:4000');

function ask(msg) {
  return new Promise((resolve) => {
    socket.emit('chat:message', { message: msg });
    socket.once('chat:reply', (result) => resolve(result));
  });
}

socket.on('connect', async () => {
  console.log('connected:', socket.id);

  console.log('\n--- order status ---');
  console.log(await ask('where is my order TH-48213'));

  console.log('\n--- product finder ---');
  console.log(await ask('show me a jacket under 120'));

  console.log('\n--- price breakdown ---');
  console.log(await ask('price breakdown for TH-48213'));

  console.log('\n--- exchange ---');
  console.log(await ask('order TH-51890 arrived damaged, exchange please'));

  console.log('\n--- unknown ---');
  console.log(await ask('do you sell kayaks'));

  socket.disconnect();
  process.exit(0);
});
