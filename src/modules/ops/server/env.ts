export function getOpsEnv() {
  return {
    mercadoPagoAccessToken: process.env.MERCADOPAGO_ACCESS_TOKEN ?? "",
    mercadoPagoWebhookSecret: process.env.MERCADOPAGO_WEBHOOK_SECRET ?? "",
    arcaMode: process.env.ARCA_MODE ?? "disabled",
    arcaWsaaUrl: process.env.ARCA_WSAA_URL ?? "",
    arcaWsfeUrl: process.env.ARCA_WSFE_URL ?? "",
    arcaCuit: process.env.ARCA_CUIT ?? "",
    arcaCertBase64: process.env.ARCA_CERT_BASE64 ?? "",
    arcaKeyBase64: process.env.ARCA_KEY_BASE64 ?? "",
  };
}

export function getOpsStatus() {
  const env = getOpsEnv();
  return {
    mercadoPago: {
      configured: Boolean(env.mercadoPagoAccessToken),
      webhookConfigured: Boolean(env.mercadoPagoWebhookSecret),
    },
    arca: {
      mode: env.arcaMode,
      configured:
        env.arcaMode !== "disabled" &&
        Boolean(env.arcaWsaaUrl && env.arcaWsfeUrl && env.arcaCuit && env.arcaCertBase64 && env.arcaKeyBase64),
      hasCertificates: Boolean(env.arcaCertBase64 && env.arcaKeyBase64),
    },
  };
}
