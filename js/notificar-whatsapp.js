// ============================================================
//  NOTIFICAR-WHATSAPP.JS
//  Aviso automático al administrador vía CallMeBot (sin backend)
//  Asociación Tecnológica Monterroso
// ============================================================
//
//  Cómo activarlo (una sola vez):
//   1. Agrega el número +34 644 51 95 23 a tus contactos de
//      WhatsApp y envíale el mensaje:  "I allow callmebot to send
//      me messages"
//   2. Recibirás una APIKEY por WhatsApp.
//   3. Pega el número y la apikey abajo, en DESTINATARIOS.
//  Más info: https://www.callmebot.com/blog/free-api-whatsapp-messages/
// ============================================================

const DESTINATARIOS = [
  { phone: "50248975506", apikey: "9341829" }
  // Puedes agregar más, por ejemplo:
  // { phone: "50212345678", apikey: "OTRA_APIKEY" }
];

async function enviar({ phone, apikey }, mensaje) {

  if (!apikey || apikey === "TU_APIKEY") return;

  const url =
    "https://api.callmebot.com/whatsapp.php" +
    `?phone=${phone}` +
    `&text=${encodeURIComponent(mensaje)}` +
    `&apikey=${apikey}`;

  // "no-cors" porque CallMeBot no siempre responde con CORS.
  await fetch(url, { mode: "no-cors" });
}

// No bloquea la compra si falla el aviso.
export async function avisarAdmin(mensaje) {

  const resultados = await Promise.allSettled(
    DESTINATARIOS.map((d) => enviar(d, mensaje))
  );

  resultados.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(
        "No se pudo avisar a " + DESTINATARIOS[i].phone,
        r.reason
      );
    }
  });
}
