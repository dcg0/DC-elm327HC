# DC-ELM327

[![Checks](https://github.com/dcg0/DC-elm327HC/actions/workflows/ci.yml/badge.svg)](https://github.com/dcg0/DC-elm327HC/actions/workflows/ci.yml)

Aplicación Android profesional para diagnóstico OBD-II mediante adaptadores ELM327. Incluye conexión Bluetooth clásico SPP y BLE, tablero de sensores, terminal AT, lectura/borrado de DTC, reconexión automática y reporte PDF.

## Estado real del proyecto

El código fuente y la configuración están publicados en:

**[Repositorio GitHub DC-elm327HC](https://github.com/dcg0/DC-elm327HC)**

La vista previa web no puede acceder al Bluetooth físico. La detección y comunicación con el ELM327 deben probarse en una APK Android nativa.

**APK:** todavía no hay una APK compilada publicada. No se incluye un enlace de descarga falso. Cuando se genere la primera versión, deberá publicarse como release en:

**[Descargas APK / Releases](https://github.com/dcg0/DC-elm327HC/releases/latest)**

## Funciones

- Escaneo de Bluetooth clásico y BLE.
- Permisos Android 12+ (`BLUETOOTH_SCAN` y `BLUETOOTH_CONNECT`) y permisos de ubicación para versiones anteriores.
- Detección de dispositivos emparejados y descubiertos con nombre, dirección y protocolo.
- Emparejamiento con PIN manual, incluidos `0000` y `1234`.
- Conexión SPP con UUID estándar y perfiles BLE frecuentes de adaptadores ELM327.
- Reintentos de conexión y reconexión automática ante pérdida del enlace.
- Cola serial para evitar colisiones entre sensores, terminal AT y diagnóstico.
- Handshake ELM327 con `ATZ`, `ATE0`, `ATL0`, `ATS0`, `ATH0`, `ATAT1` y `ATSP0`.
- Cascada de protocolos OBD-II cuando la autodetección no confirma comunicación.
- RPM, velocidad, temperatura, carga, acelerador, MAF y otros PIDs disponibles.
- Lectura de DTC almacenados y pendientes, borrado mediante `04` y terminal AT.
- PDF profesional con lecturas, códigos y sello digital de sesión.

## Instalar y validar el código

```bash
pnpm install
pnpm check
pnpm test
pnpm exec eslint .
```

La suite de pruebas existente contiene una prueba de autenticación omitida por depender del entorno; la validación de TypeScript y lint no reporta errores de código.

## Generar la APK

El proyecto incluye `eas.json` con un perfil `preview` configurado para APK interna:

```bash
pnpm install
npx eas login
npx eas build:configure
npx eas build --platform android --profile preview
```

El archivo generado por EAS se descarga desde la página de la compilación. Para una distribución de tienda, usa el perfil `production`, que genera un Android App Bundle:

```bash
npx eas build --platform android --profile production
```

## Prueba física obligatoria

1. Instala la APK en un Android real.
2. Activa Bluetooth y concede **Dispositivos cercanos**; en Android anterior concede también ubicación.
3. Enciende el ELM327 y empareja con `0000` o `1234` si el teléfono lo solicita.
4. Abre **BIENVENIDO HC** y pulsa **BUSCAR**.
5. Confirma nombre, dirección, modo SPP/BLE y conexión.
6. Verifica la respuesta `ATZ`, el protocolo confirmado y los PIDs reales con el vehículo.

Ningún APK puede garantizar detección fuera del alcance físico de radio. La distancia depende del adaptador, teléfono, antena, obstáculos, interferencia, visibilidad y permisos del sistema.

## Automatización

GitHub Actions ejecuta automáticamente TypeScript, Vitest y ESLint en cada push y pull request hacia `main`. El workflow está en `.github/workflows/ci.yml`.
