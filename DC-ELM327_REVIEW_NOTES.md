# DC-ELM327 — Notas de revisión

## Contenido

Este archivo acompaña el código fuente de la app Expo/React Native. El proyecto incluye la interfaz del tablero, lectura OBD-II, terminal AT, DTC, PDF de diagnóstico, emparejamiento y conexión Bluetooth clásico SPP/BLE.

## Punto importante sobre Bluetooth

La vista previa del proyecto se ejecuta con `expo start --web`. En web, el código desactiva intencionalmente los módulos nativos Bluetooth porque un navegador no puede usar el módulo Android `react-native-bluetooth-classic` ni `react-native-ble-plx` de la misma forma que una APK nativa.

La conexión física debe verificarse en una compilación Android nativa. En esta sesión no se generó una APK porque el entorno no contiene Android SDK, Gradle ni ADB.

## Refuerzos implementados para la APK

- Permisos `BLUETOOTH_SCAN` y `BLUETOOTH_CONNECT` para Android 12+.
- Permisos de ubicación fina y aproximada para versiones Android anteriores.
- Solicitud de permisos en tiempo de ejecución antes de escanear.
- Solicitud de activación de Bluetooth si está desactivado.
- Lista de dispositivos Bluetooth clásicos emparejados.
- Descubrimiento clásico mediante `startDiscovery()`.
- Escaneo BLE durante 12 segundos.
- Identificación visual de nombre, dirección, protocolo y estado emparejado/descubierto.
- Conexión SPP con UUID estándar `00001101-0000-1000-8000-00805F9B34FB`.
- Handshake ELM327: `ATZ`, `ATE0`, `ATL0`, `ATS0`, `ATH0`, `ATSP0`.

## Límites que deben probarse físicamente

Ningún software puede garantizar detección fuera del alcance de radio, con Bluetooth apagado, dispositivo no visible, permisos denegados, interferencia o adaptador defectuoso. La distancia real depende del teléfono, el adaptador, la antena y el entorno.

## Verificación realizada

- `pnpm check` / TypeScript sin errores.
- Vista previa web revisada en formato móvil y horizontal.
- La vista web muestra explícitamente que no puede acceder al Bluetooth físico; no inventa dispositivos.

## Revisión recomendada

1. Instalar dependencias con `pnpm install`.
2. Generar una build Android nativa con Expo/EAS o Android Studio.
3. Instalarla en un teléfono Android físico.
4. Activar Bluetooth y permisos de dispositivos cercanos/ubicación.
5. Emparejar el ELM327 con `0000` o `1234`.
6. Pulsar `BUSCAR`, comprobar nombre/dirección y probar `CONECTAR ECU`.
7. Confirmar respuesta `ATZ` y después lecturas PID reales.
