const twilio = require("twilio");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER; 

const client = twilio(accountSid, authToken);

const sendWhatsApp = async ({ to, message }) => {
  return await client.messages.create({
    from: fromWhatsAppNumber,
    to: `whatsapp:${to}`, 
    body: message,
  });
};

module.exports = sendWhatsApp;
