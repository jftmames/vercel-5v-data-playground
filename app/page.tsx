"use client";

import { useState } from "react";
import { generateFromPrompt, Dataset, toCSV, toJSONL, toTXT } from "@/lib/generators";
import { cx } from "@/lib/utils";

export default function Page() {
  const [prompt, setPrompt] = useState<string>("Genera un dataset ESTRUCTURADO con 500 filas, columnas: fecha:date, cliente_id:int, importe:float EUR. Seed=42");
  const [seed, setSeed] = useState<number>(42);
  const [rows, setRows] = useState<number>(500);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [format, setFormat] = useState<"structured"|"semi"|"unstructured">("structured");

  const onGenerate = () => {
    const ds = generateFromPrompt(prompt, { seed, rows, formatOverride: format });
    setDataset(ds);
  };

  const download = (type: "csv" | "jsonl" | "txt") => {
    if (!dataset) return;
    let blob: Blob;
    if (type === "csv") blob = new Blob([toCSV(dataset)], { type: "text/csv;charset=utf-8" });
    else if (type === "jsonl") blob = new Blob([toJSONL(dataset)], { type: "application/json" });
    else blob = new Blob([toTXT(dataset)], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `dataset_${dataset.kind}.${type}`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <main className="max-w-6xl mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold">5V Data Playground</h1>
        <p className="text-sm text-gray-600">Genera datos <b>estructurados</b>, <b>semiestructurados</b> y <b>no estructurados</b> con <i>prompts</i>. Todo corre en el navegador.</p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-3">
          <label className="text-sm font-medium">Prompt</label>
          <textarea
            value={prompt}
            onChange={(e)=>setPrompt(e.target.value)}
            className="w-full h-36 p-3 border rounded-lg focus:outline-none focus:ring"
            placeholder="Describe tipo (estructurado/semiestructurado/no estructurado), nº filas, columnas o tema, y Seed"
          />
          <div className="flex gap-3 flex-wrap items-center">
            <span className="text-sm">Semilla y tamaño</span>
            <input type="number" value={seed} onChange={(e)=>setSeed(parseInt(e.target.value || '0'))} className="border px-2 py-1 rounded w-24" title="Seed" />
            <input type="number" value={rows} onChange={(e)=>setRows(parseInt(e.target.value || '0'))} className="border px-2 py-1 rounded w-28" title="Filas" />
            <div className="flex gap-2 items-center">
              <span className="text-sm">Forzar tipo:</span>
              <select value={format} onChange={(e)=>setFormat(e.target.value as any)} className="border px-2 py-1 rounded">
                <option value="structured">Estructurado</option>
                <option value="semi">Semiestructurado</option>
                <option value="unstructured">No estructurado</option>
              </select>
            </div>
            <button onClick={onGenerate} className="px-3 py-1.5 rounded-lg bg-black text-white hover:opacity-90">Generar</button>
          </div>

          <div className="flex flex-wrap gap-2 mt-2">
            <button className="text-xs px-2 py-1 border rounded" onClick={()=>setPrompt("Genera un dataset ESTRUCTURADO con 1000 filas; columnas: fecha:date, partner:string, importe:float EUR; Seed=7")}>Preset: estructurado</button>
            <button className="text-xs px-2 py-1 border rounded" onClick={()=>setPrompt("Genera datos SEMIESTRUCTURADOS (JSON Lines) con 800 eventos de login; esquema base: ts:date, user:int, ip:string, result:{ok|fail}, y añade campos opcionales aleatorios por evento; Seed=11")}>Preset: semiestructurado</button>
            <button className="text-xs px-2 py-1 border rounded" onClick={()=>setPrompt("Genera texto NO ESTRUCTURADO: 50 registros de 'logs' en lenguaje natural sobre errores de checkout; cada línea 12-20 palabras con timestamp ISO; Seed=99")}>Preset: no estructurado</button>
          </div>
        </div>

        <aside className="space-y-3">
          <h3 className="font-medium">Descargas</h3>
          <div className="flex gap-2">
            <button disabled={!dataset} onClick={()=>download("csv")} className={cx("px-3 py-1.5 rounded border", !dataset && "opacity-40 cursor-not-allowed")}>CSV</button>
            <button disabled={!dataset} onClick={()=>download("jsonl")} className={cx("px-3 py-1.5 rounded border", !dataset && "opacity-40 cursor-not-allowed")}>JSONL</button>
            <button disabled={!dataset} onClick={()=>download("txt")} className={cx("px-3 py-1.5 rounded border", !dataset && "opacity-40 cursor-not-allowed")}>TXT</button>
          </div>
          <div className="text-xs space-y-2">
            <p className="font-medium">Consejos para prompts</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Indica TIPO (ESTRUCTURADO/SEMIESTRUCTURADO/NO ESTRUCTURADO).</li>
              <li>Filas y <code>Seed</code> para reproducibilidad.</li>
              <li>Para estructurado, usa <code>columnas: nombre:tipo</code> (date,int,float,string,categorical).</li>
              <li>Para semiestructurado, pide JSONL con campos opcionales.</li>
              <li>Para no estructurado, describe tema/longitud por línea.</li>
            </ul>
          </div>
        </aside>
      </section>

      <section className="mt-6">
        {!dataset ? (
          <div className="border rounded-lg p-8 text-center text-gray-600">Genera un dataset para ver la previsualización aquí.</div>
        ) : (
          <Preview dataset={dataset} />
        )}
      </section>

      <footer className="mt-10 text-xs text-gray-500">Next.js 14 · Tailwind · Vercel</footer>
    </main>
  );
}

function Preview({ dataset }: { dataset: Dataset }) {
  if (dataset.kind === "structured") {
    const headers = Object.keys(dataset.rows[0] ?? {});
    return (
      <div>
        <h3 className="font-medium mb-2">Vista previa (tabla)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead className="bg-gray-50">
              <tr>{headers.map(h => <th key={h} className="text-left p-2 border-b">{h}</th>)}</tr>
            </thead>
            <tbody>
              {dataset.rows.slice(0,50).map((r, i) => (
                <tr key={i} className="odd:bg-white even:bg-gray-50">
                  {headers.map(h => <td key={h} className="p-2 border-b">{String((r as any)[h] ?? "")}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
  if (dataset.kind === "semi") {
    return (
      <div>
        <h3 className="font-medium mb-2">Vista previa (JSON Lines)</h3>
        <pre className="text-xs bg-gray-50 p-3 rounded border overflow-x-auto">{dataset.rows.slice(0,30).map(r=>JSON.stringify(r)).join("\n")}</pre>
      </div>
    );
  }
  return (
    <div>
      <h3 className="font-medium mb-2">Vista previa (texto)</h3>
      <pre className="text-sm bg-gray-50 p-3 rounded border overflow-x-auto whitespace-pre-wrap">{dataset.text.slice(0,5000)}</pre>
    </div>
  );
}
