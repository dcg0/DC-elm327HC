# DC-ELM327 — Compilación Android y validación física

## Qué está verificado

TypeScript, Vitest y ESLint pasan sin errores de código. La vista web se utiliza únicamente para revisar la interfaz; un navegador no puede validar Bluetooth SPP/BLE nativo.

## Generar una APK de revisión con EAS

Instala Node.js y Expo/EAS en un entorno con acceso a tu cuenta Expo:

```bash
pnpm install
npx eas login
npx eas build:configure
npx eas build --platform android --profile preview
```

El perfil `preview` está configurado para producir un `.apk`. El perfil `production` produce un `.aab` para distribución.

## Prueba física obligatoria

1. Instala la APK en un Android físico.
2. Activa Bluetooth y concede `Dispositivos cercanos`; en Android anterior también concede ubicación.
3. Enciende el ELM327 y empareja con `0000` o `1234` si el teléfono lo solicita.
4. Abre **BIENVENIDO HC**, pulsa **BUSCAR** y verifica nombre, dirección y protocolo.
5. Pulsa el dispositivo emparejado y confirma el handshake `ATZ`.
6. Confirma que el estado muestre `Conectado` o `Conectado por BLE` y que el protocolo quede identificado.
7. Con el vehículo en condiciones seguras, confirma lecturas PID reales, DTC y terminal AT.

## Límites de alcance

La aplicación no puede garantizar detección fuera del alcance físico de radio. La distancia depende de la potencia y antena del teléfono y del adaptador, obstáculos, interferencia, visibilidad Bluetooth y permisos del sistema. La app no inventa dispositivos ni lecturas cuando la plataforma no entrega datos.
