export type VehicleProfile = { make: string; model: string; year: string };
export type DtcReference = { code: string; description: string; system: string; severity: "info" | "warning" | "critical"; source: "SAE" | "OEM-reference" };

// Referencia offline: SAE J2012 para códigos genéricos y fichas OEM frecuentes.
// Los códigos específicos pueden variar por año, motor, mercado y módulo; el código crudo de la ECU siempre se conserva.
const SAE: Record<string, DtcReference> = {
  P0100: { code: "P0100", description: "Fallo del circuito de flujo de aire MAF/VAF", system: "Admisión", severity: "warning", source: "SAE" },
  P0101: { code: "P0101", description: "Rango o funcionamiento incorrecto del MAF/VAF", system: "Admisión", severity: "warning", source: "SAE" },
  P0113: { code: "P0113", description: "Entrada alta del sensor de temperatura de aire de admisión", system: "Admisión", severity: "warning", source: "SAE" },
  P0128: { code: "P0128", description: "Temperatura del refrigerante por debajo de la regulación del termostato", system: "Refrigeración", severity: "warning", source: "SAE" },
  P0171: { code: "P0171", description: "Sistema demasiado pobre, banco 1", system: "Combustible", severity: "warning", source: "SAE" },
  P0172: { code: "P0172", description: "Sistema demasiado rico, banco 1", system: "Combustible", severity: "warning", source: "SAE" },
  P0300: { code: "P0300", description: "Fallos de encendido aleatorios o múltiples", system: "Encendido", severity: "critical", source: "SAE" },
  P0301: { code: "P0301", description: "Fallo de encendido detectado en cilindro 1", system: "Encendido", severity: "critical", source: "SAE" },
  P0302: { code: "P0302", description: "Fallo de encendido detectado en cilindro 2", system: "Encendido", severity: "critical", source: "SAE" },
  P0303: { code: "P0303", description: "Fallo de encendido detectado en cilindro 3", system: "Encendido", severity: "critical", source: "SAE" },
  P0304: { code: "P0304", description: "Fallo de encendido detectado en cilindro 4", system: "Encendido", severity: "critical", source: "SAE" },
  P0325: { code: "P0325", description: "Fallo del circuito del sensor de detonación, banco 1", system: "Encendido", severity: "warning", source: "SAE" },
  P0420: { code: "P0420", description: "Eficiencia del sistema catalizador por debajo del umbral, banco 1", system: "Emisiones", severity: "warning", source: "SAE" },
  P0430: { code: "P0430", description: "Eficiencia del sistema catalizador por debajo del umbral, banco 2", system: "Emisiones", severity: "warning", source: "SAE" },
  P0440: { code: "P0440", description: "Fallo general del sistema de control de emisiones EVAP", system: "EVAP", severity: "warning", source: "SAE" },
  P0442: { code: "P0442", description: "Fuga pequeña detectada en el sistema EVAP", system: "EVAP", severity: "warning", source: "SAE" },
  P0455: { code: "P0455", description: "Fuga grande detectada en el sistema EVAP", system: "EVAP", severity: "warning", source: "SAE" },
  P0500: { code: "P0500", description: "Fallo del sensor de velocidad del vehículo", system: "Velocidad", severity: "warning", source: "SAE" },
  P0700: { code: "P0700", description: "Solicitud de encendido de la MIL por el sistema de transmisión", system: "Transmisión", severity: "critical", source: "SAE" },
  P0715: { code: "P0715", description: "Fallo del circuito del sensor de velocidad de entrada/turbina", system: "Transmisión", severity: "critical", source: "SAE" },
  P0741: { code: "P0741", description: "Solenoide de embrague del convertidor atascado o sin rendimiento", system: "Transmisión", severity: "critical", source: "SAE" },
  P1000: { code: "P1000", description: "Prueba de monitores OBD-II incompleta", system: "Monitores", severity: "info", source: "SAE" },
};

const OEM_REFERENCE: Record<string, DtcReference> = {
  "Toyota|Corolla|2014|P1604": { code: "P1604", description: "Arranque del motor incorrecto / dificultad de arranque", system: "Gestión del motor", severity: "warning", source: "OEM-reference" },
  "Toyota|Corolla|2014|P2610": { code: "P2610", description: "Rendimiento del temporizador de apagado interno de ECM/PCM", system: "ECM/PCM", severity: "warning", source: "OEM-reference" },
  "Honda|Civic|2016|P2646": { code: "P2646", description: "Sensor/interruptor de presión de aceite del balancín: rendimiento o atascado", system: "VTEC", severity: "warning", source: "OEM-reference" },
  "Ford|F-150|2015|P2111": { code: "P2111", description: "Actuador del acelerador atascado abierto", system: "Acelerador electrónico", severity: "critical", source: "OEM-reference" },
  "Ford|F-150|2015|P2112": { code: "P2112", description: "Actuador del acelerador atascado cerrado", system: "Acelerador electrónico", severity: "critical", source: "OEM-reference" },
  "Chevrolet|Silverado|2014|P2135": { code: "P2135", description: "Correlación de voltaje de sensores de posición del acelerador/pedal", system: "Acelerador electrónico", severity: "critical", source: "OEM-reference" },
  "Volkswagen|Jetta|2015|P2015": { code: "P2015", description: "Rango/rendimiento de posición de compuertas del colector de admisión", system: "Admisión", severity: "warning", source: "OEM-reference" },
  "Nissan|Altima|2015|P0101": { code: "P0101", description: "Rango o funcionamiento incorrecto del circuito MAF", system: "Admisión", severity: "warning", source: "OEM-reference" },
};

export const VEHICLE_PROFILES: VehicleProfile[] = [
  { make: "General", model: "OBD-II", year: "Todos" },
  { make: "Toyota", model: "Corolla", year: "2014" },
  { make: "Honda", model: "Civic", year: "2016" },
  { make: "Ford", model: "F-150", year: "2015" },
  { make: "Chevrolet", model: "Silverado", year: "2014" },
  { make: "Volkswagen", model: "Jetta", year: "2015" },
  { make: "Nissan", model: "Altima", year: "2015" },
];

export function resolveDtc(code: string, profile: VehicleProfile): DtcReference {
  const normalized = code.trim().toUpperCase();
  if (profile.make !== "General") {
    const exact = OEM_REFERENCE[`${profile.make}|${profile.model}|${profile.year}|${normalized}`];
    if (exact) return exact;
  }
  return SAE[normalized] ?? {
    code: normalized,
    description: "Descripción no disponible en la base local para esta combinación de vehículo.",
    system: "No determinado",
    severity: "info",
    source: "SAE",
  };
}

export function searchDtcDatabase(query: string, profile: VehicleProfile): DtcReference[] {
  const term = query.trim().toUpperCase();
  return Object.values({ ...SAE, ...OEM_REFERENCE })
    .filter((item) => (profile.make === "General" || item.source === "SAE" || `${profile.make}|${profile.model}|${profile.year}|${item.code}` in OEM_REFERENCE))
    .filter((item) => !term || `${item.code} ${item.description} ${item.system}`.toUpperCase().includes(term))
    .slice(0, 40);
}
