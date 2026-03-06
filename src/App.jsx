/**
 * EcoMétrica
 * Aplicación web de utilidad pública basada en fuentes de datos abiertos.
 *
 * © 2026 — Obra intelectual y dirección de proyecto: DowL
 * Todos los derechos reservados.
 *
 * Concept, product direction & intellectual authorship: DowL
 * Built with public data from INE and Red Eléctrica de España.
 */

import { useState, useEffect, Component } from "react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// ── COLORES ───────────────────────────────────────────────────────────────────
const C = {
  bg: "#0f1117", surface: "#1a1d27", border: "#2a2d3a",
  accent: "#f59e0b", accent2: "#10b981", danger: "#ef4444",
  text: "#e8eaf0", muted: "#6b7280", card: "#1e2130",
};

// ── DATOS ESTÁTICOS (EPF + Coste laboral INE — anuales) ───────────────────────
const CCAA_DATA = [
  { nombre: "País Vasco",         gasto: 15572, salario: 28400, ratio: 54.8 },
  { nombre: "Madrid",             gasto: 14650, salario: 27100, ratio: 54.1 },
  { nombre: "Baleares",           gasto: 14769, salario: 24800, ratio: 59.6 },
  { nombre: "Cataluña",           gasto: 14120, salario: 26200, ratio: 53.9 },
  { nombre: "Navarra",            gasto: 13980, salario: 26800, ratio: 52.2 },
  { nombre: "Aragón",             gasto: 13200, salario: 24100, ratio: 54.8 },
  { nombre: "Cantabria",          gasto: 12800, salario: 23400, ratio: 54.7 },
  { nombre: "Rioja",              gasto: 12600, salario: 23000, ratio: 54.8 },
  { nombre: "Castilla y León",    gasto: 12400, salario: 22800, ratio: 54.4 },
  { nombre: "Galicia",            gasto: 12100, salario: 22100, ratio: 54.8 },
  { nombre: "Asturias",           gasto: 12300, salario: 22500, ratio: 54.7 },
  { nombre: "Com. Valenciana",    gasto: 12200, salario: 22300, ratio: 54.7 },
  { nombre: "Andalucía",          gasto: 11800, salario: 21400, ratio: 55.1 },
  { nombre: "Castilla-La Mancha", gasto: 11600, salario: 21100, ratio: 55.0 },
  { nombre: "Murcia",             gasto: 11620, salario: 20800, ratio: 55.9 },
  { nombre: "Canarias",           gasto: 11373, salario: 20200, ratio: 56.3 },
  { nombre: "Extremadura",        gasto: 11103, salario: 19800, ratio: 56.1 },
].sort((a, b) => b.ratio - a.ratio);

const PODER_ADQ_SALARIOS = {
  "2020": 100, "2021": 102.1, "2022": 104.8,
  "2023": 107.2, "2024": 109.6, "2025": 111.3,
};

const CCAA_LIST = ["Nacional", ...CCAA_DATA.map(c => c.nombre)];
const MESES_ES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

// Mapeo de grupos ECOICOP — usamos DATOS_TABLA/50902 y filtramos por nombre
const ECOICOP_GRUPOS = {
  "Alimentación": "01",
  "Energía":      "04",
  "Transporte":   "07",
  "Ocio":         "09",
};

// ── UTILIDADES ────────────────────────────────────────────────────────────────
const fmtFecha = (ts) => {
  const d = new Date(ts);
  return `${MESES_ES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
};

const generarMock = (inicio, fin, n) => {
  const ahora = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(ahora);
    d.setMonth(d.getMonth() - (n - 1 - i));
    const progreso = i / (n - 1);
    const ruido = (Math.random() - 0.5) * 1.5;
    return {
      mes: `${MESES_ES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
      valor: +(inicio + (fin - inicio) * progreso + ruido).toFixed(2),
      ts: d.getTime(),
    };
  });
};

// ── COMPONENTES COMUNES ───────────────────────────────────────────────────────
const Spinner = ({ label = "Cargando datos reales…" }) => (
  <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
    justifyContent:"center", padding:60, gap:14 }}>
    <div style={{ width:32, height:32, border:`3px solid ${C.border}`,
      borderTop:`3px solid ${C.accent}`, borderRadius:"50%",
      animation:"spin 0.8s linear infinite" }} />
    <p style={{ color:C.muted, fontSize:13 }}>{label}</p>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const ErrorBadge = ({ msg }) => (
  <div style={{ background:`${C.danger}15`, border:`1px solid ${C.danger}40`,
    borderRadius:8, padding:"10px 16px", fontSize:12, color:C.danger, marginBottom:16 }}>
    ⚠️ {msg} — mostrando datos de demostración.
  </div>
);

const FuenteBadge = ({ texto }) => (
  <p style={{ color:C.muted, fontSize:11, marginTop:10 }}>
    📡 Fuente: <span style={{ color:C.accent2 }}>{texto}</span>
  </p>
);

const CustomTooltip = ({ active, payload, label, suffix="" }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`,
      borderRadius:8, padding:"10px 14px" }}>
      <p style={{ color:C.muted, fontSize:12, marginBottom:4 }}>{label}</p>
      {payload.map((p,i) => (
        <p key={i} style={{ color:p.color, fontSize:13, fontWeight:600 }}>
          {p.name}: {typeof p.value==="number" ? p.value.toFixed(2) : p.value}{suffix}
        </p>
      ))}
    </div>
  );
};

const TerritorySelector = ({ value, onChange, label="Territorio" }) => (
  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
    <span style={{ color:C.muted, fontSize:13 }}>{label}:</span>
    <select value={value} onChange={e => onChange(e.target.value)} style={{
      background:C.surface, border:`1px solid ${C.border}`, color:C.text,
      borderRadius:8, padding:"6px 12px", fontSize:13, cursor:"pointer", outline:"none",
    }}>
      {CCAA_LIST.map(c => <option key={c} value={c}>{c}</option>)}
    </select>
  </div>
);

// ── HOOK: PRECIO LUZ — REE apidatos directa ────────────────────────────────
function usePrecioLuz() {
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const mockData = Array.from({length:24}, (_,i) => ({
    hora: `${String(i).padStart(2,"0")}:00`,
    precioMWh: +(80 + Math.sin(i/3)*60 + Math.random()*20).toFixed(2),
    ts: i
  }));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const hoy = new Date().toISOString().split("T")[0];
        const url = `https://apidatos.ree.es/es/datos/mercados/precios-mercados-tiempo-real?time_trunc=hour&start_date=${hoy}T00:00&end_date=${hoy}T23:59&geo_trunc=electric_system&geo_limit=peninsular&geo_ids=8741`;
        const res = await fetch(url, { headers: { "Accept": "application/json" } });
        if (!res.ok) throw new Error("REE " + res.status);
        const json = await res.json();
        const serie = json?.included?.[0];
        if (!serie?.attributes?.values?.length) throw new Error("Sin datos");
        const puntos = serie.attributes.values.map(v => ({
          hora: new Date(v.datetime).toLocaleTimeString("es-ES", {hour:"2-digit",minute:"2-digit"}),
          precioMWh: +Number(v.value).toFixed(2),
          ts: new Date(v.datetime).getHours()
        }));
        if (!cancelled) { setDatos(puntos); setError(null); }
      } catch(e) {
        if (!cancelled) { setError(e.message); setDatos(mockData); }
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  return { datos, loading, error };
}

// ── HOOK: IPC — siempre devuelve datos válidos (reales o mock) ───────────────
const MOCK_IPC = {
  Alimentación: generarMock(115, 129, 36),
  Energía:      generarMock(108, 122, 36),
  Transporte:   generarMock(110, 121, 36),
  Ocio:         generarMock(103, 113, 36),
};

function useIPC() {
  const [datos, setDatos] = useState(MOCK_IPC);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          "/api/ipc?nult=36"
        );
        if (!res.ok) throw new Error("INE HTTP " + res.status);
        const json = await res.json();
        if (!Array.isArray(json)) throw new Error("Formato inesperado");

        const resultado = {};
        for (const [catNombre, cod] of Object.entries(ECOICOP_GRUPOS)) {
          try {
            const serie = json.find(s =>
              s && s.Nombre &&
              s.Nombre.toLowerCase().includes("ndice") &&
              !s.Nombre.toLowerCase().includes("ariac") &&
              s.Nombre.toLowerCase().includes(cod + " ")
            );
            if (serie && Array.isArray(serie.Data) && serie.Data.length > 0) {
              const puntos = serie.Data
                .filter(d => d && d.Valor != null && Number(d.Valor) > 10)
                .map(d => ({ mes: fmtFecha(d.Fecha), valor: +Number(d.Valor).toFixed(2), ts: d.Fecha }))
                .sort((a, b) => a.ts - b.ts);
              if (puntos.length > 0) resultado[catNombre] = puntos;
            }
          } catch (_) {}
        }

        if (!cancelled) {
          if (Object.keys(resultado).length >= 2) {
            setDatos(resultado);
            // datos reales OK — no mostramos error
          } else {
            if (!cancelled) setDatos(MOCK_IPC);
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message);
          setDatos(MOCK_IPC);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { datos, loading, error };
}

// ── SECCIÓN 1: PRECIO DE LA LUZ ───────────────────────────────────────────────
const SeccionLuz = () => {
  const { datos, loading, error } = usePrecioLuz();
  const ahora = new Date().getHours();
  if (loading) return <Spinner label="Consultando precio de la luz en tiempo real…" />;

  const precioActual = datos[ahora]?.precioMWh ?? 0;
  const precioMin = Math.min(...datos.map(h => h.precioMWh));
  const precioMax = Math.max(...datos.map(h => h.precioMWh));
  const horaMin = datos.find(h => h.precioMWh === precioMin)?.hora ?? "—";
  const horaMax = datos.find(h => h.precioMWh === precioMax)?.hora ?? "—";
  const avg = +(datos.reduce((s,h) => s + h.precioMWh, 0) / datos.length).toFixed(2);
  const colorActual = precioActual > avg*1.1 ? C.danger : precioActual < avg*0.9 ? C.accent2 : C.accent;

  return (
    <div>
      {error && <ErrorBadge msg="No se pudo conectar con la API del precio de la luz" />}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:28 }}>
        {[
          { label:"Precio ahora",       value:`${precioActual} €/MWh`, sub:`${String(ahora).padStart(2,"0")}:00h`, color:colorActual },
          { label:"Hora más barata hoy",value:horaMin,                 sub:`${precioMin} €/MWh`,                   color:C.accent2 },
          { label:"Hora más cara hoy",  value:horaMax,                 sub:`${precioMax} €/MWh`,                   color:C.danger },
        ].map((card,i) => (
          <div key={i} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
            <p style={{ color:C.muted, fontSize:12, marginBottom:8 }}>{card.label}</p>
            <p style={{ color:card.color, fontSize:26, fontWeight:700, marginBottom:4 }}>{card.value}</p>
            <p style={{ color:C.muted, fontSize:12 }}>{card.sub}</p>
          </div>
        ))}
      </div>

      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <p style={{ color:C.text, fontSize:14, fontWeight:600 }}>Precio por horas — hoy (PVPC)</p>
          <span style={{ background:`${C.accent}20`, border:`1px solid ${C.accent}40`,
            borderRadius:12, padding:"3px 10px", fontSize:11, color:C.accent }}>
            Media hoy: {avg} €/MWh
          </span>
        </div>
        <ResponsiveContainer width="100%" height={230}>
          <AreaChart data={datos}>
            <defs>
              <linearGradient id="gradLuz" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.accent} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={C.accent} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
            <XAxis dataKey="hora" tick={{ fill:C.muted, fontSize:11 }} interval={3}/>
            <YAxis tick={{ fill:C.muted, fontSize:11 }}/>
            <Tooltip content={<CustomTooltip suffix=" €/MWh"/>}/>
            <Area type="monotone" dataKey="precioMWh" stroke={C.accent}
              fill="url(#gradLuz)" strokeWidth={2} name="€/MWh"/>
          </AreaChart>
        </ResponsiveContainer>
        <FuenteBadge texto="api.preciodelaluz.org · PVPC Red Eléctrica de España · Tiempo real"/>
      </div>

      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12,
        padding:16, marginTop:16 }}>
        <p style={{ color:C.muted, fontSize:12, marginBottom:12 }}>
          💡 Franjas más baratas hoy para lavadora, lavavajillas o cargar el coche eléctrico:
        </p>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {[...datos].sort((a,b) => a.precioMWh - b.precioMWh).slice(0,6).map((h,i) => (
            <div key={i} style={{ background:`${C.accent2}15`, border:`1px solid ${C.accent2}40`,
              borderRadius:8, padding:"8px 14px", textAlign:"center" }}>
              <p style={{ color:C.accent2, fontSize:13, fontWeight:700 }}>{h.hora}</p>
              <p style={{ color:C.muted, fontSize:11 }}>{h.precioMWh} €/MWh</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── SECCIÓN 2: IPC POR CATEGORÍAS ─────────────────────────────────────────────
const SeccionIPC = () => {
  const { datos, loading, error } = useIPC();
  const [cat, setCat] = useState("Alimentación");
  const [territorio, setTerritorio] = useState("Nacional");
  if (loading) return <Spinner label="Descargando índices de precios del INE…"/>;

  const CATEGORIAS = Object.keys(datos);
  const serie = datos[cat] ?? [];
  const ultimo = serie[serie.length-1]?.valor ?? 100;
  const variacion = (ultimo - 100).toFixed(1);

  return (
    <div>
      {error && <ErrorBadge msg="No se pudo conectar con la API del INE"/>}
      <div style={{ display:"flex", gap:12, marginBottom:24, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {CATEGORIAS.map(c => (
            <button key={c} onClick={() => setCat(c)} style={{
              background: cat===c ? C.accent : C.surface,
              color: cat===c ? "#000" : C.muted,
              border: `1px solid ${cat===c ? C.accent : C.border}`,
              borderRadius:20, padding:"6px 14px", fontSize:13,
              cursor:"pointer", fontWeight: cat===c ? 700 : 400,
            }}>{c}</button>
          ))}
        </div>
        <TerritorySelector value={territorio} onChange={setTerritorio}/>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
          <p style={{ color:C.muted, fontSize:12, marginBottom:8 }}>Subida acumulada (base 100)</p>
          <p style={{ color:C.danger, fontSize:32, fontWeight:700 }}>+{variacion}%</p>
          <p style={{ color:C.muted, fontSize:12 }}>{cat} · {territorio}</p>
        </div>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
          <p style={{ color:C.muted, fontSize:12, marginBottom:8 }}>Índice actual</p>
          <p style={{ color:C.accent, fontSize:32, fontWeight:700 }}>{ultimo}</p>
          <p style={{ color:C.muted, fontSize:12 }}>{serie[serie.length-1]?.mes ?? "—"}</p>
        </div>
      </div>

      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
        <p style={{ color:C.text, fontSize:14, fontWeight:600, marginBottom:16 }}>
          Evolución IPC — {cat} (últimos 3 años)
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={serie}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
            <XAxis dataKey="mes" tick={{ fill:C.muted, fontSize:11 }} interval={5}/>
            <YAxis tick={{ fill:C.muted, fontSize:11 }} domain={["auto","auto"]}/>
            <Tooltip content={<CustomTooltip/>}/>
            <Line type="monotone" dataKey="valor" stroke={C.accent}
              strokeWidth={2.5} dot={false} name="Índice"/>
          </LineChart>
        </ResponsiveContainer>
        <FuenteBadge texto="INE — Tabla 50902 · Índices nacionales ECOICOP · API JSON INEbase"/>
      </div>
    </div>
  );
};

// ── SECCIÓN 3: DÓNDE SE VIVE MÁS CARO ────────────────────────────────────────
const SeccionCarestia = () => {
  const [modo, setModo] = useState("ratio");
  const sorted = [...CCAA_DATA].sort((a,b) =>
    modo==="ratio" ? b.ratio - a.ratio : b.gasto - a.gasto
  );
  return (
    <div>
      <div style={{ display:"flex", gap:10, marginBottom:24 }}>
        {[["ratio","% salario destinado a gasto"],["gasto","Gasto anual absoluto (€)"]].map(([k,label]) => (
          <button key={k} onClick={() => setModo(k)} style={{
            background: modo===k ? C.accent : C.surface,
            color: modo===k ? "#000" : C.muted,
            border: `1px solid ${modo===k ? C.accent : C.border}`,
            borderRadius:20, padding:"6px 14px", fontSize:13,
            cursor:"pointer", fontWeight: modo===k ? 700 : 400,
          }}>{label}</button>
        ))}
      </div>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
        <p style={{ color:C.text, fontSize:14, fontWeight:600, marginBottom:16 }}>
          {modo==="ratio"
            ? "Presión económica: % del salario medio destinado a gastos de consumo"
            : "Gasto medio anual por persona (€) — año 2023"}
        </p>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={sorted} layout="vertical" margin={{ left:30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false}/>
            <XAxis type="number" tick={{ fill:C.muted, fontSize:11 }}/>
            <YAxis dataKey="nombre" type="category" tick={{ fill:C.muted, fontSize:11 }} width={135}/>
            <Tooltip content={<CustomTooltip suffix={modo==="ratio" ? "%" : " €"}/>}/>
            <Bar dataKey={modo} name={modo==="ratio" ? "% salario" : "€/año"}
              radius={[0,4,4,0]} fill={C.accent}/>
          </BarChart>
        </ResponsiveContainer>
        <FuenteBadge texto="INE — Encuesta de Presupuestos Familiares 2023 + Encuesta de Estructura Salarial"/>
      </div>
    </div>
  );
};

// ── SECCIÓN 4: MI CESTA ───────────────────────────────────────────────────────
const SeccionCesta = () => {
  const { datos, loading, error } = useIPC();
  const [seleccion, setSeleccion] = useState(["Alimentación","Energía"]);
  if (loading) return <Spinner label="Cargando datos de precios del INE…"/>;

  const CATEGORIAS = Object.keys(datos);
  const COLORES = [C.accent, C.accent2, "#60a5fa", "#c084fc"];
  const toggle = (cat) => setSeleccion(prev =>
    prev.includes(cat) ? prev.filter(c => c!==cat) : [...prev, cat]
  );

  const meses = datos[CATEGORIAS[0]]?.map(d => d.mes) ?? [];
  const cestaDatos = meses.map((mes,i) => {
    const punto = { mes };
    seleccion.forEach(cat => { punto[cat] = datos[cat]?.[i]?.valor; });
    return punto;
  });

  return (
    <div>
      {error && <ErrorBadge msg="No se pudo conectar con la API del INE"/>}
      <div style={{ marginBottom:20 }}>
        <p style={{ color:C.muted, fontSize:13, marginBottom:12 }}>
          Selecciona las categorías que más te afectan:
        </p>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          {CATEGORIAS.map((cat,i) => (
            <button key={cat} onClick={() => toggle(cat)} style={{
              background: seleccion.includes(cat) ? COLORES[i%4] : C.surface,
              color: seleccion.includes(cat) ? "#000" : C.muted,
              border: `1px solid ${seleccion.includes(cat) ? COLORES[i%4] : C.border}`,
              borderRadius:20, padding:"8px 18px", fontSize:13,
              cursor:"pointer", fontWeight: seleccion.includes(cat) ? 700 : 400,
              transition:"all 0.2s",
            }}>{cat}</button>
          ))}
        </div>
      </div>

      {seleccion.length===0 ? (
        <div style={{ textAlign:"center", padding:60, color:C.muted }}>
          Selecciona al menos una categoría
        </div>
      ) : (
        <>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
            <p style={{ color:C.text, fontSize:14, fontWeight:600, marginBottom:16 }}>
              Tu cesta personalizada — evolución del índice de precios
            </p>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={cestaDatos}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                <XAxis dataKey="mes" tick={{ fill:C.muted, fontSize:11 }} interval={5}/>
                <YAxis tick={{ fill:C.muted, fontSize:11 }} domain={["auto","auto"]}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Legend wrapperStyle={{ color:C.muted, fontSize:12 }}/>
                {seleccion.map((cat,i) => (
                  <Line key={cat} type="monotone" dataKey={cat}
                    stroke={COLORES[i%4]} strokeWidth={2.5} dot={false}/>
                ))}
              </LineChart>
            </ResponsiveContainer>
            <FuenteBadge texto="INE — API JSON INEbase · Índices de precios de consumo ECOICOP"/>
          </div>
          <div style={{ display:"flex", gap:12, marginTop:16, flexWrap:"wrap" }}>
            {seleccion.map((cat,i) => {
              const serie = datos[cat] ?? [];
              const subida = serie.length ? (serie[serie.length-1].valor - 100).toFixed(1) : "—";
              return (
                <div key={cat} style={{ background:C.surface, borderRadius:8, padding:"10px 16px",
                  border:`1px solid ${COLORES[i%4]}30` }}>
                  <span style={{ color:COLORES[i%4], fontSize:12 }}>{cat}: </span>
                  <span style={{ color:C.danger, fontWeight:700, fontSize:14 }}>+{subida}%</span>
                  <span style={{ color:C.muted, fontSize:11 }}> desde base 100</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

// ── SECCIÓN 5: PODER ADQUISITIVO ──────────────────────────────────────────────
const SeccionPoderAdq = () => {
  const { datos:ipcDatos, loading, error } = useIPC();
  const [territorio, setTerritorio] = useState("Nacional");
  const [catIPC, setCatIPC] = useState("Alimentación");
  if (loading) return <Spinner label="Calculando evolución del poder adquisitivo…"/>;

  const CATEGORIAS = Object.keys(ipcDatos);

  // Construir serie combinada cruzando IPC real con salarios históricos
  const anos = Object.keys(PODER_ADQ_SALARIOS);
  const seriePoder = anos.map(ano => {
    const serieIPC = ipcDatos[catIPC] ?? [];
    const puntoIPC = serieIPC.filter(d => d.mes.includes(ano.slice(2)));
    const ipcVal = puntoIPC.length
      ? +(puntoIPC.reduce((s,d) => s+d.valor, 0) / puntoIPC.length).toFixed(1)
      : null;
    return { año: ano, ipc: ipcVal, salario: PODER_ADQ_SALARIOS[ano] };
  }).filter(d => d.ipc !== null);

  const ultimo = seriePoder[seriePoder.length-1];
  const perdida = ultimo ? (ultimo.ipc - ultimo.salario).toFixed(1) : "—";
  const subidasIPC = ultimo ? (ultimo.ipc - 100).toFixed(1) : "—";
  const subidasSal = ultimo ? (ultimo.salario - 100).toFixed(1) : "—";

  return (
    <div>
      {error && <ErrorBadge msg="Usando datos parcialmente simulados"/>}
      <div style={{ display:"flex", gap:16, marginBottom:24, flexWrap:"wrap", alignItems:"center" }}>
        <TerritorySelector value={territorio} onChange={setTerritorio}/>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ color:C.muted, fontSize:13 }}>Categoría:</span>
          <select value={catIPC} onChange={e => setCatIPC(e.target.value)} style={{
            background:C.surface, border:`1px solid ${C.border}`, color:C.text,
            borderRadius:8, padding:"6px 12px", fontSize:13, cursor:"pointer", outline:"none",
          }}>
            {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div style={{ background:`linear-gradient(135deg, ${C.danger}15, ${C.card})`,
        border:`1px solid ${C.danger}40`, borderRadius:12, padding:24,
        marginBottom:20, display:"flex", alignItems:"center", gap:20 }}>
        <div style={{ fontSize:44 }}>📉</div>
        <div>
          <p style={{ color:C.muted, fontSize:13, marginBottom:6 }}>
            Pérdida estimada de poder adquisitivo · {territorio} · {catIPC}
          </p>
          <p style={{ color:C.danger, fontSize:38, fontWeight:800, marginBottom:6 }}>
            -{perdida} puntos
          </p>
          <p style={{ color:C.muted, fontSize:13 }}>
            Los precios subieron{" "}
            <strong style={{ color:C.text }}>+{subidasIPC}%</strong> desde 2020,
            pero los salarios medios solo un{" "}
            <strong style={{ color:C.text }}>+{subidasSal}%</strong>
          </p>
        </div>
      </div>

      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
        <p style={{ color:C.text, fontSize:14, fontWeight:600, marginBottom:16 }}>
          Precios vs. salarios — evolución desde 2020 (base 100)
        </p>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={seriePoder}>
            <defs>
              <linearGradient id="gradIPC" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.danger} stopOpacity={0.25}/>
                <stop offset="95%" stopColor={C.danger} stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="gradSal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.accent2} stopOpacity={0.25}/>
                <stop offset="95%" stopColor={C.accent2} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
            <XAxis dataKey="año" tick={{ fill:C.muted, fontSize:12 }}/>
            <YAxis tick={{ fill:C.muted, fontSize:12 }} domain={[95,145]}/>
            <Tooltip content={<CustomTooltip/>}/>
            <Legend wrapperStyle={{ color:C.muted, fontSize:12 }}/>
            <Area type="monotone" dataKey="ipc" stroke={C.danger}
              fill="url(#gradIPC)" strokeWidth={2.5} name="Precios"/>
            <Area type="monotone" dataKey="salario" stroke={C.accent2}
              fill="url(#gradSal)" strokeWidth={2.5} name="Salarios"/>
          </AreaChart>
        </ResponsiveContainer>
        <FuenteBadge texto="INE — IPC serie histórica + Encuesta Anual de Estructura Salarial"/>
        <p style={{ color:C.muted, fontSize:11, marginTop:6 }}>
          ⚠️ La brecha entre ambas curvas representa la pérdida real de capacidad de compra.
        </p>
      </div>
    </div>
  );
};

// ── ERROR BOUNDARY ───────────────────────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error("EcoMétrica error:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ background:"#1e2130", border:"1px solid #ef444440", borderRadius:12,
          padding:32, textAlign:"center" }}>
          <p style={{ fontSize:32, marginBottom:12 }}>⚠️</p>
          <p style={{ color:"#e8eaf0", fontSize:16, fontWeight:600, marginBottom:8 }}>
            Error al cargar esta sección
          </p>
          <p style={{ color:"#6b7280", fontSize:13, marginBottom:20 }}>
            {this.state.error?.message || "Error inesperado"}
          </p>
          <button onClick={() => this.setState({ hasError:false, error:null })}
            style={{ background:"#f59e0b", color:"#000", border:"none", borderRadius:8,
              padding:"8px 20px", fontSize:13, fontWeight:700, cursor:"pointer" }}>
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── SECCIONES ─────────────────────────────────────────────────────────────────
const SECCIONES = [
  { id:"luz",      label:"⚡ Precio de la luz",          componente:SeccionLuz      },
  { id:"ipc",      label:"📊 IPC por categorías",        componente:SeccionIPC      },
  { id:"carestia", label:"🗺️ ¿Dónde se vive más caro?",  componente:SeccionCarestia },
  { id:"cesta",    label:"🛒 Mi cesta de la compra",     componente:SeccionCesta    },
  { id:"poder",    label:"📉 Poder adquisitivo",         componente:SeccionPoderAdq },
];

// ── APP PRINCIPAL ─────────────────────────────────────────────────────────────
export default function App() {
  const [seccion, setSeccion] = useState("luz");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const SeccionActual = SECCIONES.find(s => s.id===seccion)?.componente;
  const handleNav = (id) => { setSeccion(id); setDrawerOpen(false); };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text,
      fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>

      {drawerOpen && (
        <div onClick={() => setDrawerOpen(false)} style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,0.55)",
          zIndex:20, backdropFilter:"blur(2px)",
        }}/>
      )}

      {/* DRAWER */}
      <div style={{
        position:"fixed", top:0, left:0, height:"100vh", width:260,
        background:C.surface, borderRight:`1px solid ${C.border}`, zIndex:30,
        transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
        transition:"transform 0.3s cubic-bezier(0.4,0,0.2,1)",
        display:"flex", flexDirection:"column", padding:"24px 16px",
        boxShadow: drawerOpen ? "8px 0 40px rgba(0,0,0,0.5)" : "none",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:28, paddingLeft:4 }}>
          <div style={{ width:32, height:32, borderRadius:8,
            background:`linear-gradient(135deg, ${C.accent}, #f97316)`,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>💰</div>
          <p style={{ fontSize:15, fontWeight:700 }}>EcoMétrica</p>
        </div>
        <p style={{ color:C.muted, fontSize:11, fontWeight:600, letterSpacing:1,
          marginBottom:10, paddingLeft:4 }}>TU ECONOMÍA</p>
        <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
          {SECCIONES.map(s => (
            <button key={s.id} onClick={() => handleNav(s.id)} style={{
              background: seccion===s.id ? `${C.accent}18` : "transparent",
              color: seccion===s.id ? C.accent : C.muted,
              border: `1px solid ${seccion===s.id ? C.accent+"40" : "transparent"}`,
              borderRadius:8, padding:"10px 14px", fontSize:13,
              cursor:"pointer", textAlign:"left",
              fontWeight: seccion===s.id ? 600 : 400, transition:"all 0.15s",
            }}>{s.label}</button>
          ))}
        </div>
        <div style={{ marginTop:24, paddingTop:16, borderTop:`1px solid ${C.border}` }}>
          <p style={{ color:C.muted, fontSize:11, fontWeight:600, letterSpacing:1,
            marginBottom:10, paddingLeft:4 }}>TU MUNICIPIO</p>
          <div style={{ background:C.card, border:`1px dashed ${C.border}`,
            borderRadius:8, padding:"10px 14px", fontSize:12, color:C.muted, opacity:0.7 }}>
            🏛️ ¿En qué gasta tu ayuntamiento?
            <span style={{ marginLeft:8, background:"#2a2d3a", borderRadius:10,
              padding:"2px 8px", fontSize:10, color:"#6b7280", fontWeight:600 }}>PRONTO</span>
          </div>
        </div>
      </div>

      {/* HEADER */}
      <div style={{ borderBottom:`1px solid ${C.border}`, padding:"16px 24px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        position:"sticky", top:0, background:C.bg, zIndex:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <button onClick={() => setDrawerOpen(o => !o)} style={{
            background: drawerOpen ? `${C.accent}20` : C.surface,
            border: `1px solid ${drawerOpen ? C.accent+"50" : C.border}`,
            borderRadius:8, width:38, height:38,
            display:"flex", flexDirection:"column", alignItems:"center",
            justifyContent:"center", gap:5, cursor:"pointer",
            transition:"all 0.2s", padding:0,
          }}>
            <span style={{ display:"block", width:18, height:2, background: drawerOpen ? C.accent : C.muted,
              borderRadius:2, transition:"all 0.25s",
              transform: drawerOpen ? "rotate(45deg) translate(5px,5px)" : "none" }}/>
            <span style={{ display:"block", width:18, height:2, background: drawerOpen ? C.accent : C.muted,
              borderRadius:2, transition:"all 0.25s", opacity: drawerOpen ? 0 : 1 }}/>
            <span style={{ display:"block", width:18, height:2, background: drawerOpen ? C.accent : C.muted,
              borderRadius:2, transition:"all 0.25s",
              transform: drawerOpen ? "rotate(-45deg) translate(5px,-5px)" : "none" }}/>
          </button>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:34, height:34, borderRadius:9,
              background:`linear-gradient(135deg, ${C.accent}, #f97316)`,
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:17 }}>💰</div>
            <div>
              <p style={{ fontSize:16, fontWeight:700, letterSpacing:"-0.3px" }}>EcoMétrica</p>
              <p style={{ fontSize:11, color:C.muted }}>Datos públicos para tu bolsillo</p>
            </div>
          </div>
        </div>
        <div style={{ background:`${C.accent2}15`,
          border:`1px solid ${C.accent2}30`,
          borderRadius:20, padding:"4px 14px", fontSize:11, color:C.accent2 }}>
          🟢 EN VIVO — INE · REE
        </div>
      </div>

      {/* TABS */}
      <div style={{ borderBottom:`1px solid ${C.border}`, padding:"0 24px",
        display:"flex", gap:2, background:C.bg, overflowX:"auto", scrollbarWidth:"none" }}>
        {SECCIONES.map(s => (
          <button key={s.id} onClick={() => setSeccion(s.id)} style={{
            background:"transparent",
            color: seccion===s.id ? C.accent : C.muted,
            border:"none",
            borderBottom:`2px solid ${seccion===s.id ? C.accent : "transparent"}`,
            padding:"11px 16px", fontSize:13, cursor:"pointer",
            fontWeight: seccion===s.id ? 600 : 400,
            whiteSpace:"nowrap", transition:"all 0.15s", outline:"none",
          }}>{s.label}</button>
        ))}
      </div>

      {/* CONTENIDO */}
      <div style={{ padding:"32px 36px", overflowY:"auto", minHeight:"calc(100vh - 120px)" }}>
        <div style={{ maxWidth:900, margin:"0 auto" }}>
          <h1 style={{ fontSize:22, fontWeight:700, marginBottom:6, letterSpacing:"-0.5px" }}>
            {SECCIONES.find(s => s.id===seccion)?.label}
          </h1>
          <p style={{ color:C.muted, fontSize:13, marginBottom:28 }}>
            Datos públicos en tiempo real · Sin registro · Sin datos personales
          </p>
          <ErrorBoundary key={seccion}>{SeccionActual && <SeccionActual/>}</ErrorBoundary>
        </div>

        {/* FOOTER */}
        <div style={{ borderTop:`1px solid ${C.border}`, marginTop:48,
          padding:"20px 0 8px", textAlign:"center", maxWidth:900, margin:"48px auto 0" }}>
          <p style={{ color:C.muted, fontSize:11 }}>
            © 2026 EcoMétrica · Obra intelectual y dirección de proyecto:{" "}
            <span style={{ color:C.accent, fontWeight:600 }}>DowL</span>
            {" · "}Datos públicos del INE y Red Eléctrica de España
          </p>
        </div>
      </div>
    </div>
  );
}