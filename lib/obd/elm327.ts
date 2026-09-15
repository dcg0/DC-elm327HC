import { Platform } from "react-native";
import { encode, decode } from "base-64";

export type ConnectionMode = "classic" | "ble" | "usb";
export type ObdReading = { name: string; value: string; unit: string; command: string; updatedAt: number };
export type Dtc = { code: string; description: string; status: "stored" | "pending" | "permanent" };

const SPP_UUID = "00001101-0000-1000-8000-00805F9B34FB";
const PID_COMMANDS = [
  { name: "RPM", command: "010C", unit: "rpm" },
  { name: "Velocidad", command: "010D", unit: "km/h" },
  { name: "Temperatura", command: "0105", unit: "°C" },
  { name: "Carga motor", command: "0104", unit: "%" },
  { name: "Acelerador", command: "0111", unit: "%" },
  { name: "MAF", command: "0110", unit: "g/s" },
];

function nativeClassic(): any | null {
  if (Platform.OS === "web") return null;
  try { const module = require("react-native-bluetooth-classic"); return module.default || module; } catch { return null; }
}
function nativeBle(): any | null {
  if (Platform.OS === "web") return null;
  try { return require("react-native-ble-plx"); } catch { return null; }
}

export class Elm327Client {
  private device: any = null;
  private subscription: any = null;
  private mode: ConnectionMode | null = null;
  private response = "";
  private onStatus?: (status: string) => void;
  private onData?: (data: string) => void;

  constructor(callbacks: { onStatus?: (status: string) => void; onData?: (data: string) => void } = {}) {
    this.onStatus = callbacks.onStatus;
    this.onData = callbacks.onData;
  }

  async listDevices(): Promise<any[]> {
    const classic = nativeClassic();
    if (!classic?.getBondedDevices) return [];
    const enabled = await classic.isBluetoothEnabled();
    if (!enabled) await classic.requestBluetoothEnabled();
    const bonded = await classic.getBondedDevices();
    const discovered = classic.startDiscovery ? await classic.startDiscovery() : [];
    const all = [...bonded, ...discovered].filter((d: any, index: number, list: any[]) => list.findIndex((x) => x.address === d.address) === index);
    return all.map((d: any) => Object.assign(d, { mode: "classic", paired: Boolean(d.bonded) }));
  }

  async pair(device: any): Promise<void> {
    const classic = nativeClassic();
    if (!classic?.pairDevice) throw new Error("El emparejamiento requiere una compilación Android nativa");
    this.onStatus?.("Esperando confirmación de emparejamiento…");
    await classic.pairDevice(device.address || device.id);
    this.onStatus?.("Emparejado; conectando…");
  }

  async connect(device: any, mode: ConnectionMode = device?.mode || "classic"): Promise<void> {
    this.mode = mode;
    this.onStatus?.("Conectando…");
    if (mode === "classic") {
      const classic = nativeClassic();
      if (!classic?.connectToDevice && !device?.connect) throw new Error("Bluetooth clásico requiere una compilación Android nativa");
      this.device = device?.connect ? device : await classic.connectToDevice(device.address || device.id, { uuid: SPP_UUID, delimiter: "\r" });
      this.subscription = this.device.onDataReceived?.((event: any) => { this.response += event.data || ""; this.onData?.(event.data || ""); });
      if (device?.connect) await this.device.connect({ uuid: SPP_UUID, delimiter: "\r" });
      this.onStatus?.("Inicializando ELM327…");
      await this.write("ATZ"); await this.delay(1200);
      await this.write("ATE0"); await this.delay(250);
      await this.write("ATL0"); await this.delay(250);
      await this.write("ATS0"); await this.delay(250);
      await this.write("ATH0"); await this.delay(250);
      await this.write("ATSP0"); await this.delay(300);
      this.onStatus?.("Conectado");
      return;
    }
    if (mode === "ble") {
      const ble = nativeBle();
      if (!ble?.BleManager) throw new Error("BLE requiere una compilación Android nativa");
      const manager = new ble.BleManager();
      this.device = await manager.connectToDevice(device.id);
      await this.device.discoverAllServicesAndCharacteristics();
      const services = await this.device.services();
      for (const service of services) {
        const characteristics = await this.device.characteristicsForService(service.uuid);
        const writable = characteristics.find((c: any) => c.isWritableWithResponse || c.isWritableWithoutResponse);
        const notifiable = characteristics.find((c: any) => c.isNotifiable || c.isIndicatable);
        if (writable && !this.device.writeCharacteristic) { this.device.writeCharacteristic = writable; }
        if (notifiable) this.subscription = manager.monitorCharacteristicForDevice(this.device.id, service.uuid, notifiable.uuid, (error: any, characteristic: any) => { if (!error && characteristic?.value) { const text = this.decodeBase64(characteristic.value); this.response += text; this.onData?.(text); } });
        if (writable) this.device.writeCharacteristic = writable;
      }
      this.onStatus?.("Conectado por BLE");
      return;
    }
    throw new Error("USB está preparado para integración nativa específica del adaptador");
  }

  async scanBle(): Promise<any[]> {
    const ble = nativeBle();
    if (!ble?.BleManager) return [];
    const manager = new ble.BleManager();
    const found: any[] = [];
    return new Promise((resolve) => {
      const timer = setTimeout(() => { manager.stopDeviceScan(); resolve(found); }, 7000);
      manager.startDeviceScan(null, { allowDuplicates: false }, (error: any, device: any) => {
        if (!error && device?.id && !found.some((x) => x.id === device.id)) found.push({ ...device, mode: "ble" });
      });
      void timer;
    });
  }

  async readLive(): Promise<ObdReading[]> {
    const values: ObdReading[] = [];
    for (const pid of PID_COMMANDS) {
      const raw = await this.query(pid.command);
      const value = this.decode(pid.command, raw);
      if (value !== null) values.push({ ...pid, value: String(value), updatedAt: Date.now() });
    }
    return values;
  }

  async readDtc(): Promise<Dtc[]> {
    const raw = await this.query("03");
    return this.decodeCodes(raw, "stored");
  }

  async clearDtc(): Promise<string> {
    await this.query("04");
    return "Comando de borrado enviado a la ECU";
  }

  async sendCommand(command: string): Promise<string> {
    this.response = "";
    await this.write(command.trim());
    await this.delay(700);
    return this.response.trim() || "(sin respuesta)";
  }

  async disconnect(): Promise<void> {
    try { this.subscription?.remove?.(); } catch {}
    try { await this.device?.disconnect?.(); } catch {}
    this.subscription = null; this.device = null; this.mode = null; this.onStatus?.("Desconectado");
  }

  private async write(command: string): Promise<void> {
    if (this.mode === "classic") await this.device.write(`${command}\r`);
    else if (this.mode === "ble") {
      const characteristic = this.device.writeCharacteristic;
      if (!characteristic) throw new Error("No se encontró una característica BLE escribible");
      const value = this.encodeBase64(`${command}\r`);
      if (characteristic.isWritableWithResponse) await characteristic.writeWithResponse(value);
      else await characteristic.writeWithoutResponse(value);
    }
  }

  private async query(command: string): Promise<string> {
    this.response = "";
    await this.write(command);
    await this.delay(350);
    return this.response;
  }

  private decode(command: string, raw: string): number | null {
    const bytes = raw.replace(/[^0-9A-F]/gi, "").toUpperCase();
    const index = bytes.indexOf(command.slice(2));
    const hex = index >= 0 ? bytes.slice(index + 2, index + 6) : "";
    if (hex.length < 2) return null;
    const a = parseInt(hex.slice(0, 2), 16); const b = parseInt(hex.slice(2, 4) || "00", 16);
    if (command === "010C") return Math.round(((a * 256 + b) / 4) * 10) / 10;
    if (command === "010D") return a;
    if (command === "0105") return a - 40;
    if (command === "0104" || command === "0111") return Math.round((a * 100 / 255) * 10) / 10;
    if (command === "0110") return Math.round(((a * 256 + b) / 100) * 10) / 10;
    return null;
  }

  private decodeCodes(raw: string, status: Dtc["status"]): Dtc[] {
    const bytes = raw.replace(/[^0-9A-F]/gi, "").toUpperCase();
    const result: Dtc[] = [];
    for (let i = 0; i + 4 <= bytes.length; i += 4) {
      const chunk = bytes.slice(i, i + 4); if (chunk === "4300" || chunk === "0000") continue;
      const first = parseInt(chunk[0], 16); const type = ["P", "C", "B", "U"][first >> 2] || "P";
      const code = `${type}${chunk.slice(1)}`; if (/^[PCBU][0-9A-F]{3}$/.test(code)) result.push({ code, description: "Código reportado por la ECU", status });
    }
    return result;
  }
  private delay(ms: number) { return new Promise((resolve) => setTimeout(resolve, ms)); }
  private encodeBase64(text: string) { return encode(text); }
  private decodeBase64(value: string) { return decode(value); }
}

export const ELM327_PID_COMMANDS = PID_COMMANDS;
export const elm327HasNativeBluetooth = () => Boolean(nativeClassic() || nativeBle());
