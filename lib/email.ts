import nodemailer from 'nodemailer';

export async function sendVerificationEmail(email: string, token: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const confirmLink = appUrl + '/api/auth/verify?token=' + token;

  console.log('[PROD] WYSYLANIE REALNEGO MAILA DO:', email);

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: Number(process.env.EMAIL_SERVER_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
  });

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'SmartNotes <noreply@smartnotes.pl>',
      to: email,
      subject: 'SmartNotes - Potwierdzenie rejestracji',
      html: '<p>Witaj!</p><p>Kliknij ponizszy link, aby aktywowac konto: <a href="' + confirmLink + '">Potwierdz adres email</a></p>'
    });

    console.log('Prawdziwy email zostal wyslany na adres:', email);
  } catch (error) {
    console.error('Blad wysylania: ', error);
  }
}
