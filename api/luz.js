export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=300");
  try {
    const hoy = new Date().toISOString().split("T")[0];
    const url = `https://apidatos.ree.es/es/datos/mercados/precios-mercados-tiempo-real?time_trunc=hour&start_date=${hoy}T00:00&end_date=${hoy}T23:59&geo_trunc=electric_system&geo_limit=peninsular&geo_ids=8741`;
    const r = await fetch(url, {
      headers: { "Accept": "application/json", "Content-Type": "application/json" }
    });
    if (!r.ok) throw new Error("REE upstream " + r.status);
    const data = await r.json();
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
