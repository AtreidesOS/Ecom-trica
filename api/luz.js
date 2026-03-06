export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=300");
  try {
    const r = await fetch("https://api.preciodelaluz.org/v1/prices/all?zone=PCB");
    if (!r.ok) throw new Error("upstream " + r.status);
    const data = await r.json();
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
