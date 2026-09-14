const tls = require('tls');

const socket = tls.connect(465, 'smtp.gmail.com', () => {
  console.log('Connected to Gmail SMTP port 465 (SSL)');
});

socket.setEncoding('utf8');

let step = 0;
socket.on('data', (data) => {
  console.log('S:', data.trim());
  if (data.startsWith('220') && step === 0) {
    step = 1;
    socket.write('EHLO localhost\r\n');
  } else if (data.includes('250') && step === 1) {
    step = 2;
    socket.write('AUTH LOGIN\r\n');
  } else if (data.startsWith('334') && step === 2) {
    step = 3;
    socket.write(Buffer.from('anandu2109@gmail.com').toString('base64') + '\r\n');
  } else if (data.startsWith('334') && step === 3) {
    step = 4;
    socket.write(Buffer.from('ebmqvzdkzxyabsij').toString('base64') + '\r\n');
  } else if (data.startsWith('235')) {
    console.log('🎉 SMTP AUTHENTICATION SUCCESSFUL!');
    socket.write('QUIT\r\n');
  } else if (data.startsWith('535')) {
    console.error('❌ SMTP AUTHENTICATION FAILED!');
    socket.destroy();
  }
});

socket.on('error', (err) => {
  console.error('Socket error:', err);
});
