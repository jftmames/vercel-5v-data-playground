export type Structured = { kind: "structured"; rows: Record<string, any>[] };
export type SemiStructured = { kind: "semi"; rows: Record<string, any>[] };
export type Unstructured = { kind: "unstructured"; text: string };
export type Dataset = Structured | SemiStructured | Unstructured;
type Options = { seed: number; rows: number; formatOverride?: "structured"|"semi"|"unstructured" };

function xorshift(seed: number) { let x = seed || 123456789; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 0xFFFFFFFF; }; }
function randInt(rng: () => number, min: number, max: number) { return Math.floor(rng() * (max - min + 1)) + min; }
function sample<T>(rng: () => number, arr: T[]): T { return arr[Math.floor(rng() * arr.length)]; }

function parsePrompt(prompt: string) {
  const p = prompt.toLowerCase();
  const kind = /no\s*estructurado|texto|logs/.test(p) ? "unstructured" :
               /semi\s*estructurado|json/.test(p) ? "semi" : "structured";
  const rows = (() => { const m = prompt.match(/(\d{1,6})\s*(filas|rows)/i); return m ? parseInt(m[1], 10) : undefined; })();
  const seed = (() => { const m = prompt.match(/seed\s*=\s*(\d{1,9})/i); return m ? parseInt(m[1], 10) : undefined; })();
  const cols: { name: string; type: string }[] = [];
  const colsMatch = prompt.match(/columnas?:\s*([^\n]+)/i);
  if (colsMatch) {
    const parts = colsMatch[1].split(/[,;]+/).map(s => s.trim()).filter(Boolean);
    for (const part of parts) {
      const [name, type] = part.split(/:/).map(s => s.trim());
      if (name) cols.push({ name, type: type || "string" });
    }
  }
  return { kind, rows, seed, cols };
}

export function generateFromPrompt(prompt: string, options: Options): Dataset {
  const info = parsePrompt(prompt);
  const rows = info.rows ?? options.rows;
  const seed = info.seed ?? options.seed;
  const kind = options.formatOverride ?? (info.kind as any);
  const rng = xorshift(seed);

  if (kind === "structured") {
    const schema = info.cols.length ? info.cols : [
      { name: "date", type: "date" },
      { name: "partner", type: "string" },
      { name: "amount", type: "float" }
    ];
    const data: Record<string, any>[] = [];
    for (let i=0;i<rows;i++) {
      const row: Record<string, any> = {};
      for (const col of schema) row[col.name] = synthValue(rng, col.type, i);
      data.push(row);
    }
    return { kind: "structured", rows: data };
  }

  if (kind === "semi") {
    const optionalFields = ["ua","lat","lon","session","referrer"];
    const events = ["login","checkout","view","search"];
    const results = ["ok","fail"];
    const data: Record<string, any>[] = [];
    for (let i=0;i<rows;i++) {
      const o: Record<string, any> = {
        ts: new Date( Date.now() - randInt(rng,0,3600*24*30)*1000 ).toISOString(),
        user: randInt(rng,1,5000),
        ip: `192.168.${randInt(rng,0,255)}.${randInt(rng,0,255)}`,
        event: sample(rng, events),
        result: sample(rng, results)
      };
      const count = randInt(rng,0,3);
      const shuffled = optionalFields.slice().sort(()=>rng()-0.5);
      for (let k=0;k<count;k++) {
        const f = shuffled[k];
        o[f] = synthOptional(rng, f);
      }
      data.push(o);
    }
    return { kind: "semi", rows: data };
  }

  // unstructured
  const topics = ["checkout", "auth", "envio", "carrito", "pago", "fraude"];
  const lines = [];
  for (let i=0;i<rows;i++) {
    const words = randInt(rng, 12, 20);
    const ts = new Date( Date.now() - randInt(rng,0,3600*24*7)*1000 ).toISOString();
    let line = `${ts} —`;
    for (let w=0; w<words; w++) {
      const token = sample(rng, ["error","warn","info","retry","timeout","ok","captcha","token","db","cache","red","cola","http","503","200","lat","lon"]);
      line += " " + token;
    }
    line += " " + sample(rng, topics);
    lines.push(line);
  }
  return { kind: "unstructured", text: lines.join("\n") };
}

function synthValue(rng: ()=>number, type: string, i: number): any {
  type = type.toLowerCase();
  if (type.includes("date")) {
    const day = 1 + (i % 28);
    const month = 1 + (Math.floor(i/28) % 12);
    const date = new Date(2024, month-1, day, 0, 0, 0);
    return date.toISOString().slice(0,10);
  }
  if (type.includes("int")) return Math.floor(rng()*10000);
  if (type.includes("float") || type.includes("eur")) return Math.round(rng()*10000)/100;
  if (type.includes("categorical")) return ["A","B","C","D"][Math.floor(rng()*4)];
  return ["alpha","beta","gamma","delta","omega"][Math.floor(rng()*5)];
}

function synthOptional(rng: ()=>number, f: string): any {
  switch (f) {
    case "ua": return ["ios","android","web","desktop"][Math.floor(rng()*4)];
    case "lat": return Math.round((rng()*180-90)*1e6)/1e6;
    case "lon": return Math.round((rng()*360-180)*1e6)/1e6;
    case "session": return Math.random().toString(36).slice(2,10);
    case "referrer": return ["direct","email","ads","social"][Math.floor(rng()*4)];
    default: return null;
  }
}

export function toCSV(ds: Dataset): string {
  if (ds.kind !== "structured") {
    const rows = ds.kind === "semi" ? ds.rows : [];
    if (ds.kind === "semi" && rows.length) {
      const headers = Array.from(new Set(rows.flatMap(r => Object.keys(r))));
      const csv = [headers.join(",")].concat(rows.map(r => headers.map(h => JSON.stringify(r[h] ?? "")).join(","))).join("\n");
      return csv;
    }
    return "";
  }
  const headers = Object.keys(ds.rows[0] ?? {});
  const csv = [headers.join(",")].concat(ds.rows.map(r => headers.map(h => JSON.stringify(r[h] ?? "")).join(","))).join("\n");
  return csv;
}

export function toJSONL(ds: Dataset): string {
  if (ds.kind === "unstructured") return ds.text.split("\n").map(t => JSON.stringify({ text: t })).join("\n");
  const rows = ds.kind === "structured" ? ds.rows : ds.rows;
  return rows.map(r => JSON.stringify(r)).join("\n");
}

export function toTXT(ds: Dataset): string {
  if (ds.kind === "unstructured") return ds.text;
  if (ds.kind === "semi") return ds.rows.map(r => JSON.stringify(r)).join("\n");
  const headers = Object.keys(ds.rows[0] ?? {});
  const lines = [headers.join("\t")].concat(ds.rows.map(r => headers.map(h => String(r[h] ?? "")).join("\t")));
  return lines.join("\n");
}
