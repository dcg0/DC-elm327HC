export type VehicleProfile = { make: string; model: string; year: string };
export type DtcReference = { code: string; description: string; system: string; severity: "info" | "warning" | "critical"; source: "SAE" | "OEM-reference"; symptoms?: string[]; probableCauses?: string[]; tests?: string[]; repair?: string[]; safety?: string };

type DtcGuide = Pick<DtcReference, "symptoms" | "probableCauses" | "tests" | "repair" | "safety">;

const GUIDE: Record<string, DtcGuide> = {
  P0100: { symptoms: ["Ralentí inestable", "Pérdida de potencia", "Consumo elevado"], probableCauses: ["Conector o cableado MAF abierto", "MAF contaminado", "Fuga de admisión"], tests: ["Inspeccionar alimentación, tierra y señal del MAF", "Comparar MAF en ralentí y aceleración con especificación", "Buscar fugas después del MAF"], repair: ["Reparar cableado o conector", "Limpiar el MAF con producto específico si el fabricante lo permite", "Sustituir el sensor solo después de confirmar la señal"], safety: "Evitar conducir con pérdida severa de potencia." },
  P0101: { symptoms: ["Respuesta lenta", "Tironeos", "MIL encendida"], probableCauses: ["Filtro de aire obstruido", "Fuga de vacío", "MAF descalibrado"], tests: ["Revisar trims de combustible y flujo MAF", "Inspeccionar admisión y filtro", "Comparar señal con un sensor conocido bueno"], repair: ["Corregir fugas", "Cambiar filtro si está saturado", "Reemplazar MAF únicamente tras probar alimentación y señal"], safety: "No asumir que el MAF es la causa sin revisar fugas." },
  P0113: { symptoms: ["Arranque difícil", "Mezcla rica", "Consumo elevado"], probableCauses: ["Sensor IAT desconectado", "Cable de señal abierto", "Sensor defectuoso"], tests: ["Verificar que la lectura cambie con la temperatura", "Medir resistencia según temperatura", "Revisar referencia y tierra"], repair: ["Reconectar o reparar el arnés", "Sustituir IAT si la resistencia está fuera de rango", "Borrar y confirmar con motor frío"], safety: "No tocar partes calientes durante la inspección." },
  P0128: { symptoms: ["Motor tarda en calentar", "Calefacción débil", "Consumo alto"], probableCauses: ["Termostato abierto", "Sensor ECT desviado", "Nivel bajo de refrigerante"], tests: ["Comparar ECT con temperatura ambiente en frío", "Observar calentamiento con escáner", "Comprobar nivel y fugas"], repair: ["Corregir fuga y llenar con refrigerante correcto", "Cambiar termostato y junta si no regula", "Verificar purgado del sistema"], safety: "Nunca abrir el circuito de refrigeración en caliente." },
  P0171: { symptoms: ["Ralentí irregular", "Vacilación", "Misfire leve"], probableCauses: ["Fuga de vacío", "Baja presión de combustible", "MAF sucio", "Inyector restringido"], tests: ["Revisar STFT/LTFT por banco", "Hacer prueba de humo de admisión", "Medir presión de combustible"], repair: ["Reparar fugas", "Corregir presión o suministro", "Limpiar/reemplazar componentes solo tras confirmar la prueba"], safety: "Un misfire no atendido puede dañar el catalizador." },
  P0172: { symptoms: ["Humo oscuro", "Olor a combustible", "Consumo alto"], probableCauses: ["Inyector con fuga", "Presión excesiva", "MAF subestimando flujo", "EVAP purgando permanentemente"], tests: ["Revisar trims y presión", "Comprobar goteo de inyectores", "Verificar purga EVAP"], repair: ["Reparar regulador o inyector", "Corregir MAF/EVAP según mediciones", "Cambiar aceite si se contaminó con combustible"], safety: "No continuar si hay olor intenso o fuga de combustible." },
  P0300: { symptoms: ["Motor temblando", "Pérdida de potencia", "MIL parpadeando"], probableCauses: ["Bujías/bobinas", "Combustible insuficiente", "Baja compresión", "Entrada de aire no medido"], tests: ["Revisar contadores de misfire", "Intercambiar bobina/bujía y observar si migra", "Medir compresión y presión de combustible"], repair: ["Reparar la causa confirmada", "No cambiar todas las bobinas sin diagnóstico", "Borrar códigos y confirmar bajo carga"], safety: "MIL parpadeando: detener la conducción para proteger el catalizador." },
  P0301: { symptoms: ["Tironeo y vibración", "Pérdida de potencia", "MIL encendida"], probableCauses: ["Bujía o bobina del cilindro 1", "Inyector", "Compresión baja"], tests: ["Intercambiar bobina/bujía con otro cilindro", "Comprobar pulso de inyector", "Realizar prueba de compresión"], repair: ["Reparar la pieza que haga migrar el fallo", "Verificar fugas de válvula si no migra", "Confirmar sin misfire después de reparar"], safety: "Si la MIL parpadea, detener el vehículo." },
  P0302: { symptoms: ["Tironeo y vibración", "Pérdida de potencia", "MIL encendida"], probableCauses: ["Bujía o bobina del cilindro 2", "Inyector", "Compresión baja"], tests: ["Intercambiar bobina/bujía", "Comprobar inyector y compresión"], repair: ["Reparar la causa confirmada y validar bajo carga"], safety: "Si la MIL parpadea, detener el vehículo." },
  P0303: { symptoms: ["Tironeo y vibración", "Pérdida de potencia", "MIL encendida"], probableCauses: ["Bujía o bobina del cilindro 3", "Inyector", "Compresión baja"], tests: ["Intercambiar bobina/bujía", "Comprobar inyector y compresión"], repair: ["Reparar la causa confirmada y validar bajo carga"], safety: "Si la MIL parpadea, detener el vehículo." },
  P0304: { symptoms: ["Tironeo y vibración", "Pérdida de potencia", "MIL encendida"], probableCauses: ["Bujía o bobina del cilindro 4", "Inyector", "Compresión baja"], tests: ["Intercambiar bobina/bujía", "Comprobar inyector y compresión"], repair: ["Reparar la causa confirmada y validar bajo carga"], safety: "Si la MIL parpadea, detener el vehículo." },
  P0325: { symptoms: ["Cascabeleo", "Potencia reducida", "Avance retardado"], probableCauses: ["Sensor de detonación", "Arnés dañado", "Par de apriete incorrecto"], tests: ["Inspeccionar arnés", "Medir continuidad y resistencia", "Verificar montaje y ruido mecánico"], repair: ["Reparar arnés", "Instalar sensor con par especificado", "Borrar y comprobar avance"], safety: "No golpear el sensor ni ajustar el motor por intuición." },
  P0420: { symptoms: ["MIL encendida", "Olor a azufre", "Emisiones elevadas"], probableCauses: ["Catalizador degradado", "Fuga de escape", "Sensor O2 envejecido", "Misfire previo"], tests: ["Comparar señales O2 antes/después del catalizador", "Buscar fugas de escape", "Confirmar que no existan misfires o mezcla incorrecta"], repair: ["Reparar primero fugas y mezcla", "Sustituir catalizador solo con pruebas confirmadas", "Verificar causa raíz para no dañar el repuesto"], safety: "El escape y catalizador alcanzan temperaturas extremas." },
  P0430: { symptoms: ["MIL encendida", "Emisiones elevadas", "Olor de escape anormal"], probableCauses: ["Catalizador banco 2 degradado", "Fuga de escape", "Problema de mezcla"], tests: ["Comparar O2 del banco 2", "Revisar misfires y trims", "Prueba de fugas"], repair: ["Corregir mezcla/fugas", "Cambiar catalizador solo tras confirmar eficiencia"], safety: "No trabajar bajo el vehículo sin soportes certificados." },
  P0440: { symptoms: ["MIL encendida", "A veces dificultad de repostaje"], probableCauses: ["Tapón de combustible", "Válvula de purga", "Manguera EVAP desconectada"], tests: ["Inspección visual", "Prueba de humo EVAP", "Comprobar actuación de purga y venteo"], repair: ["Ajustar o sustituir tapón", "Reparar mangueras", "Cambiar válvula solo tras prueba"], safety: "No usar humo o aire presurizado sin equipo EVAP adecuado." },
  P0442: { symptoms: ["MIL encendida", "Sin síntomas de conducción claros"], probableCauses: ["Fuga pequeña", "Tapón deteriorado", "Sello de cuello de llenado"], tests: ["Prueba de humo y pinza de líneas", "Revisar tapón y sellos"], repair: ["Reemplazar sello/tapón defectuoso", "Reparar línea y repetir prueba"], safety: "Trabajar lejos de llamas y fuentes de ignición." },
  P0455: { symptoms: ["MIL encendida", "Olor a combustible"], probableCauses: ["Tapón ausente", "Línea EVAP rota", "Válvula de venteo abierta"], tests: ["Inspección completa y prueba de humo", "Comprobar presión/venteo"], repair: ["Instalar tapón correcto", "Reparar líneas o válvulas", "Borrar y verificar monitor EVAP"], safety: "No fumar ni generar chispas cerca del sistema de combustible." },
  P0500: { symptoms: ["Velocímetro errático", "Cambios bruscos", "ABS/TCS encendidos"], probableCauses: ["Sensor de velocidad", "Cableado", "Anillo reluctor", "Problema de alimentación"], tests: ["Comparar velocidades de rueda", "Medir señal durante giro", "Inspeccionar conector y reluctor"], repair: ["Limpiar o sustituir sensor confirmado", "Reparar cableado", "Recalibrar si lo exige el fabricante"], safety: "La pérdida de velocidad puede afectar transmisión y estabilidad." },
  P0700: { symptoms: ["MIL encendida", "Cambios anormales", "Modo protección"], probableCauses: ["Código almacenado en TCM", "Fallo de solenoide", "Problema eléctrico o de transmisión"], tests: ["Escanear el módulo TCM, no solo PCM", "Revisar nivel/estado de fluido", "Consultar datos y códigos secundarios"], repair: ["Diagnosticar el código TCM específico", "No reemplazar la transmisión por P0700 solo", "Reparar cableado/solenoide según prueba"], safety: "Evitar conducir si hay patinamiento o pérdida de marcha." },
  P0715: { symptoms: ["Cambios erráticos", "No entra una marcha", "Modo protección"], probableCauses: ["Sensor de turbina", "Arnés interno", "Problema de alimentación"], tests: ["Comparar RPM de entrada/salida", "Comprobar continuidad y señal", "Revisar fluido y conectores"], repair: ["Reparar arnés o sustituir sensor confirmado", "Verificar adaptación de transmisión"], safety: "No realizar pruebas dinámicas en vía pública sin control profesional." },
  P0741: { symptoms: ["RPM fluctuante en crucero", "Consumo elevado", "Golpe de cambio"], probableCauses: ["Solenoide TCC", "Fluido degradado", "Desgaste del convertidor"], tests: ["Revisar comando y deslizamiento TCC", "Comprobar presión y fluido", "Buscar códigos TCM asociados"], repair: ["Corregir fluido/solenoide si las pruebas lo confirman", "Evaluar convertidor antes de desmontar"], safety: "El diagnóstico de transmisión requiere soportes y control de temperatura." },
  P1000: { symptoms: ["No suele haber síntomas"], probableCauses: ["Batería desconectada", "Códigos borrados recientemente", "Ciclo de conducción incompleto"], tests: ["Consultar readiness 0101", "Completar ciclo de conducción del fabricante"], repair: ["No sustituir piezas por P1000", "Completar monitores y confirmar que desaparece"], safety: "No borrar códigos justo antes de una inspección de emisiones." },
};

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
  const applyGuide = (reference: DtcReference): DtcReference => ({
    ...reference,
    ...(GUIDE[normalized] ?? {
      symptoms: ["Puede variar según vehículo y módulo"],
      probableCauses: ["Consultar datos en vivo y documentación del fabricante"],
      tests: ["Confirmar el código con una segunda lectura y revisar códigos asociados"],
      repair: ["Reparar únicamente después de confirmar la causa raíz"],
      safety: "Seguir el manual de servicio y medidas de seguridad del vehículo.",
    }),
  });
  if (profile.make !== "General") {
    const exact = OEM_REFERENCE[`${profile.make}|${profile.model}|${profile.year}|${normalized}`];
    if (exact) return applyGuide(exact);
  }
  return applyGuide(SAE[normalized] ?? {
    code: normalized,
    description: "Descripción no disponible en la base local para esta combinación de vehículo.",
    system: "No determinado",
    severity: "info",
    source: "SAE",
  });
}

export function searchDtcDatabase(query: string, profile: VehicleProfile): DtcReference[] {
  const term = query.trim().toUpperCase();
  return Object.values({ ...SAE, ...OEM_REFERENCE })
    .filter((item) => (profile.make === "General" || item.source === "SAE" || `${profile.make}|${profile.model}|${profile.year}|${item.code}` in OEM_REFERENCE))
    .filter((item) => !term || `${item.code} ${item.description} ${item.system}`.toUpperCase().includes(term))
    .slice(0, 40);
}
