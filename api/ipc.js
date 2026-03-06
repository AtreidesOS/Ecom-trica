export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=3600");
  try {
    const r = await fetch("https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/50902?nult=36&tip=A");
    if (!r.ok) throw new Error("upstream " + r.status);
    const data = await r.json();
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
