export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const { nult = 36 } = req.query;
  try {
    const r = await fetch(
      `https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/50902?nult=${nult}&tip=A`
    );
    const data = await r.json();
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
