import pkg from '@next/env';
const { loadEnvConfig } = pkg;
import nodemailer from 'nodemailer';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function sendTestEmail() {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: Number(process.env.EMAIL_SERVER_PORT),
    secure: true,
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
  });

  // TUTAJ ZMIENILIŒMY ADRES ODBIORCY NA TWÓJ PRYWATNY EMAIL:
  const testEmailTarget = "ignacy.janus00@gmail.com"; 

  console.log(`Wysylanie wiadomosci testowej na adres: ${testEmailTarget}...`);

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: testEmailTarget,
      subject: "SmartNotes - Test konfiguracji Resend",
      html: `
        <h2>Gratulacje!</h2>
        <p>Twoja konfiguracja Resend dziala bez zarzutu!</p>
      `,
    });
    console.log("Sukces! Wiadomosc testowa zostala pomyslnie wyslana.");
  } catch (error) {
    console.error("Blad wysylania:", error);
  }
}

sendTestEmail();
