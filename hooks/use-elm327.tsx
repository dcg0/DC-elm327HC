import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import { Elm327Client, type Dtc, type ObdReading } from "@/lib/obd/elm327";

type ObdState = {
  status: string;
  connected: boolean;
  devices: any[];
  readings: ObdReading[];
  dtcs: Dtc[];
  error: string;
  preferredPin: string;
  protocol: string | null;
  adapterId: string;
  reconnecting: boolean;
  scan: () => Promise<void>;
  pair: (device: any, pin: string) => Promise<void>;
  connect: (device: any) => Promise<void>;
  refresh: () => Promise<void>;
  loadDtcs: () => Promise<void>;
  clearDtcs: () => Promise<void>;
  sendCommand: (command: string) => Promise<string>;
  disconnect: () => Promise<void>;
};

const ObdContext = createContext<ObdState | null>(null);

const MAX_AUTO_RECONNECT_ATTEMPTS = 4;

async function ensureAndroidBluetoothPermissions() {
  if (Platform.OS !== "android" || Platform.Version < 23) return true;
  const permissions = Platform.Version >= 31
    ? [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]
    : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION];
  const result = await PermissionsAndroid.requestMultiple(permissions);
  return permissions.every((permission) => result[permission] === PermissionsAndroid.RESULTS.GRANTED);
}

export function ObdProvider({ children }: { children: ReactNode }) {
  const client = useRef<Elm327Client | null>(null);
  const lastDeviceRef = useRef<any>(null);
  const manualDisconnectRef = useRef(false);
  const busyRef = useRef(false); // evita solapar refresh() con otra operación en curso

  const [status, setStatus] = useState("Listo para conectar");
  const [devices, setDevices] = useState<any[]>([]);
  const [readings, setReadings] = useState<ObdReading[]>([]);
  const [dtcs, setDtcs] = useState<Dtc[]>([]);
  const [error, setError] = useState("");
  const [preferredPin, setPreferredPin] = useState("0000");
  const [protocol, setProtocol] = useState<string | null>(null);
  const [adapterId, setAdapterId] = useState("");
  const [reconnecting, setReconnecting] = useState(false);

  const connected = status === "Conectado" || status === "Conectado por BLE";

  const scan = useCallback(async () => {
    setError("");
    if (Platform.OS === "web") { setStatus("Bluetooth nativo no disponible en vista previa web"); return; }
    setStatus("Solicitando permisos Bluetooth…");
    try {
      if (!(await ensureAndroidBluetoothPermissions())) {
        setError("Permisos Bluetooth denegados. Activa Bluetooth cercano y ubicación en Android.");
        setStatus("Permisos Bluetooth requeridos");
        return;
      }
      setStatus("Buscando Bluetooth clásico y BLE…");
      const classic = await client.current?.listDevices() || [];
      const ble = await client.current?.scanBle() || [];
      const found = [...classic, ...ble];
      setDevices(found);
      setStatus(found.length ? `${found.length} dispositivo(s) detectado(s)` : "No se detectaron dispositivos");
    } catch (e: any) {
      setError(e?.message || "No se pudo buscar dispositivos");
      setStatus("Error durante el escaneo Bluetooth");
    }
  }, []);

  const attemptReconnect = useCallback(async () => {
    const device = lastDeviceRef.current;
    if (!device || manualDisconnectRef.current) return;
    setReconnecting(true);
    for (let attempt = 1; attempt <= MAX_AUTO_RECONNECT_ATTEMPTS; attempt++) {
      if (manualDisconnectRef.current) break;
      try {
        setStatus(`Reconexión automática (${attempt}/${MAX_AUTO_RECONNECT_ATTEMPTS})…`);
        await client.current?.connect(device, device.mode, 1);
        setProtocol(client.current?.getConnectedProtocol() || null);
        setAdapterId(client.current?.getAdapterId() || "");
        setReconnecting(false);
        return;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
    setReconnecting(false);
    setError("Se perdió la conexión y no se pudo reconectar automáticamente. Verifica el adaptador y volvé a conectar manualmente.");
  }, []);

  useEffect(() => {
    client.current = new Elm327Client({
      onStatus: setStatus,
      onUnexpectedDisconnect: () => { void attemptReconnect(); },
    });
    if (Platform.OS === "web") { setStatus("Bluetooth nativo no disponible en vista previa web"); return () => {}; }
    void scan();
    return () => { manualDisconnectRef.current = true; void client.current?.disconnect(true); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = useCallback(async (device: any) => {
    setError("");
    manualDisconnectRef.current = false;
    try {
      await client.current?.connect(device, device.mode);
      lastDeviceRef.current = device;
      setProtocol(client.current?.getConnectedProtocol() || null);
      setAdapterId(client.current?.getAdapterId() || "");
    } catch (e: any) {
      setError(e?.message || "No se pudo conectar. Verifica que el ELM327 esté encendido y emparejado.");
      setStatus("Error de conexión");
    }
  }, []);

  const pair = useCallback(async (device: any, pin: string) => {
    setError("");
    setPreferredPin(pin);
    manualDisconnectRef.current = false;
    try {
      await client.current?.pair(device);
      await client.current?.connect({ ...device, paired: true }, "classic");
      lastDeviceRef.current = { ...device, paired: true, mode: "classic" };
      setProtocol(client.current?.getConnectedProtocol() || null);
      setAdapterId(client.current?.getAdapterId() || "");
    } catch (e: any) {
      setError(e?.message || "No se pudo emparejar");
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!connected || busyRef.current) return;
    busyRef.current = true;
    try {
      const next = await client.current?.readLive() || [];
      if (next.length) setReadings(next);
    } catch (e: any) {
      setError(e?.message || "Error leyendo sensores");
    } finally {
      busyRef.current = false;
    }
  }, [connected]);

  const loadDtcs = useCallback(async () => {
    if (!connected) return;
    busyRef.current = true;
    try { setDtcs(await client.current?.readDtc() || []); }
    catch (e: any) { setError(e?.message || "Error leyendo códigos"); }
    finally { busyRef.current = false; }
  }, [connected]);

  const clearDtcs = useCallback(async () => {
    if (!connected) return;
    busyRef.current = true;
    try { await client.current?.clearDtc(); setDtcs([]); }
    catch (e: any) { setError(e?.message || "Error borrando códigos"); }
    finally { busyRef.current = false; }
  }, [connected]);

  const sendCommand = useCallback(async (command: string) => {
    if (!connected) throw new Error("Conecta la ECU antes de enviar comandos");
    return (await client.current?.sendCommand(command)) || "(sin respuesta)";
  }, [connected]);

  const disconnect = useCallback(async () => {
    manualDisconnectRef.current = true;
    lastDeviceRef.current = null;
    setProtocol(null);
    setAdapterId("");
    await client.current?.disconnect();
  }, []);

  useEffect(() => {
    if (!connected) return;
    const id = setInterval(refresh, 900);
    return () => clearInterval(id);
  }, [connected, refresh]);

  return (
    <ObdContext.Provider
      value={{ status, connected, devices, readings, dtcs, error, preferredPin, protocol, adapterId, reconnecting, scan, pair, connect, refresh, loadDtcs, clearDtcs, sendCommand, disconnect }}
    >
      {children}
    </ObdContext.Provider>
  );
}

export function useElm327() {
  const value = useContext(ObdContext);
  if (!value) throw new Error("useElm327 debe usarse dentro de ObdProvider");
  return value;
}
