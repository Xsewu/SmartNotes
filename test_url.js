const url = new URL(process.env.DATABASE_URL);
console.log('Username:', url.username);
console.log('Hostname:', url.hostname);
console.log('Port:', url.port);