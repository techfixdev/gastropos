# Operacion Real en Local

## Alcance implementado

- Ticket termico imprimible desde la app con formato 80 mm o 90 mm.
- Cobro con medios mixtos:
  - efectivo
  - debito
  - credito
  - Mercado Pago QR
  - Mercado Pago Point
  - transferencia
- Historico de tickets y reimpresion.
- Arqueo de caja con efectivo esperado, contado y diferencia.
- Configuracion operativa por sucursal:
  - impresoras
  - terminales de cobro
  - perfil ARCA

## Decision tecnica

El POS web no debe hablar directo con hardware fiscal ni con credenciales sensibles desde el navegador.

Arquitectura recomendada:

1. POS web:
   origen de la venta, checkout, impresion y estado operativo.
2. Backend seguro:
   firma ARCA, credenciales Mercado Pago, webhooks y conciliacion.
3. Dispositivos externos:
   impresora termica, Point/QR o POS bancario.

## ARCA

Estado del proyecto:

- La app ya registra el perfil fiscal de la sucursal y genera la cola de comprobantes.
- La emision real debe resolverse en backend con credenciales WSAA/WSFE y certificados del contribuyente.

Variables backend previstas:

- `ARCA_MODE`
- `ARCA_WSAA_URL`
- `ARCA_WSFE_URL`
- `ARCA_CUIT`
- `ARCA_CERT_BASE64`
- `ARCA_KEY_BASE64`

Referencia oficial:

- ARCA factura electronica para desarrolladores: `https://www.afip.gob.ar/ws/documentacion/`
- Portal ARCA APIs: `https://arca.gob.ar/`

## Mercado Pago y tarjetas

Para cafeteria-pasteleria, la opcion mas robusta es:

1. `Mercado Pago Point` para cobro en mostrador.
2. `Mercado Pago QR` como alternativa rapida y de bajo costo.
3. `POS bancario manual` como respaldo si el comercio ya tiene adquirencia.

Motivo:

- baja friccion
- tiempos cortos de atencion
- menos dependencia de integraciones locales friles
- conciliacion simple contra el ticket

Referencias oficiales:

- Mercado Pago Developers: `https://www.mercadopago.com.ar/developers/es`
- Mercado Pago Point: `https://www.mercadopago.com.ar/point`

Variables backend previstas:

- `MERCADOPAGO_ACCESS_TOKEN`
- `MERCADOPAGO_WEBHOOK_SECRET`

## Impresion

La impresion actual usa ventana de navegador con CSS termico y funciona bien para:

- Chrome/Edge en Windows
- impresora 80 mm
- impresora 90 mm
- cola del sistema operativo

Para impresion silenciosa o spool profesional, el siguiente paso es un bridge local o servicio de impresion en red.
