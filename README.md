# DC-ELM327

![Logo DC-ELM327](assets/images/icon.png)

[![Checks](https://github.com/dcg0/DC-elm327HC/actions/workflows/ci.yml/badge.svg)](https://github.com/dcg0/DC-elm327HC/actions/workflows/ci.yml)

Aplicación Android profesional para diagnóstico OBD-II mediante adaptadores ELM327. Incluye conexión Bluetooth clásico SPP y BLE, tablero de sensores, terminal AT, lectura/borrado de DTC, reconexión automática y reporte PDF.

## Estado real del proyecto

El código fuente y la configuración están publicados en:

**[Repositorio GitHub DC-elm327HC](https://github.com/dcg0/DC-elm327HC)**

La vista previa web no puede acceder al Bluetooth físico. La detección y comunicación con el ELM327 deben probarse en una APK Android nativa.

**APK:**

**[Descargas APK / Releases](https://github.com/dcg0/DC-elm327HC/releases/latest)**

Para generar una APK de revisión directamente en GitHub, abre **[Build Android APK](https://github.com/dcg0/DC-elm327HC/actions/workflows/android-apk.yml)**, pulsa **Run workflow** y descarga el artefacto `DC-ELM327-debuggable-review-apk` cuando termine.

## Funciones

- Escaneo de Bluetooth clásico y BLE.
- Permisos Android 12+ (`BLUETOOTH_SCAN` y `BLUETOOTH_CONNECT`) y permisos de ubicación para versiones anteriores.
- Detección de dispositivos emparejados y descubiertos con nombre, dirección y protocolo.
- Emparejamiento con PIN manual, incluidos `0000` y `0000`.
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

1. Instala la APK en un Android real.

