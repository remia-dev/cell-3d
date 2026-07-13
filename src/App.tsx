import { useEffect, useRef, useState } from "react";
import { CellScene, type SceneCallbacks } from "./CellScene";
import { MODELS, ANNOTATIONS, type CellType, type Annotation } from "./data";

export function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<CellScene | null>(null);

  const [type, setType] = useState<CellType>("animal");
  const [selected, setSelected] = useState<{ a: Annotation; i: number } | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [pickMode, setPickMode] = useState(false);
  const [pickedCoord, setPickedCoord] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!mountRef.current) return;
    const callbacks: SceneCallbacks = {
      onSelect: (a, i) => { setSelected({ a, i }); sceneRef.current?.setActivePin(i); },
      onLoaded: () => { setError(null); setLoaded(true); },
      onError: (_t, msg) => { setError(msg); setLoaded(false); },
      onPick: (p) => setPickedCoord(`[${p[0]}, ${p[1]}, ${p[2]}]`),
    };
    const scene = new CellScene(mountRef.current, callbacks);
    sceneRef.current = scene;
    scene.load("animal");
    return () => { scene.dispose(); sceneRef.current = null; };
  }, []);

  useEffect(() => {
    setSelected(null); setLoaded(false); setError(null); setPickedCoord(null);
    sceneRef.current?.load(type);
  }, [type]);
  useEffect(() => { sceneRef.current?.setAutoRotate(autoRotate); }, [autoRotate]);
  useEffect(() => { sceneRef.current?.setPickMode(pickMode); }, [pickMode]);

  // Escape unfocuses the selected organelle and returns to the centered view
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setSelected(null);
      sceneRef.current?.resetView();
      sceneRef.current?.setAutoRotate(autoRotate);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [autoRotate]);

  const m = MODELS[type];
  const isPlant = type === "plant";
  const annotations = ANNOTATIONS[type];

  const pick = (a: Annotation, i: number) => {
    setSelected({ a, i });
    sceneRef.current?.setActivePin(i);
    sceneRef.current?.focusIndex(i);
  };

  return (
    <div id="app">
      <div ref={mountRef} className="canvas-mount" />

      <header>
        <div className="brand">
          <h1>The Living Cell — 3D Explorer</h1>
          <p>Rotate, zoom, and click a numbered pin to explore each organelle</p>
        </div>
        <div className="toggle">
          <button className={!isPlant ? "active" : ""} onClick={() => setType("animal")}>🐾 Animal Cell</button>
          <button className={isPlant ? "active" : ""} onClick={() => setType("plant")}>🌿 Plant Cell</button>
        </div>
      </header>

      <div id="info">
        {selected ? (
          <>
            <div className="eyebrow">{isPlant ? "Plant cell" : "Animal cell"} · #{selected.i + 1}</div>
            <h2>{selected.a.title}</h2>
            {selected.a.img && <img className="info-img" src={selected.a.img} alt={selected.a.title} />}
            <p className="desc">{selected.a.desc}</p>
          </>
        ) : (
          <>
            <div className="eyebrow">{isPlant ? "Plant cell" : "Animal cell"}</div>
            <h2>{isPlant ? "The plant cell" : "The animal cell"}</h2>
            <p className="desc">
              Drag to rotate, scroll to zoom. Click a numbered pin (or a name in the list) to focus it gently and read about it.
              {annotations.length === 0 && " — No annotations yet. Turn on Place-pin mode, click a spot on the model, and copy the coordinate to author one."}
            </p>
          </>
        )}
      </div>

      {annotations.length > 0 && (
        <div id="legend">
          <h3>{isPlant ? "Plant cell parts" : "Animal cell parts"}</h3>
          <div className="legend-list">
            {annotations.map((a, i) => (
              <div key={i} className={"leg-item" + (selected?.i === i ? " active" : "")} onClick={() => pick(a, i)}>
                <span className="num">{i + 1}</span>{a.title}
              </div>
            ))}
          </div>
        </div>
      )}

      <div id="controls">
        <h3>🔧 Tools</h3>
        <label><input type="checkbox" checked={autoRotate} onChange={(e) => setAutoRotate(e.target.checked)} disabled={pickMode} /> Auto-rotate</label>
        <label className="pick-toggle"><input type="checkbox" checked={pickMode} onChange={(e) => setPickMode(e.target.checked)} /> Place-pin mode (author)</label>
        {pickMode && (
          <div className="coord">
            {pickedCoord
              ? <>Clicked: <code>{pickedCoord}</code><br /><span className="hint">Paste this to set a pin's position.</span></>
              : "Click any spot on the model to read its [x, y, z]…"}
          </div>
        )}
      </div>

      <div className="credit">
        <a href={m.modelUrl} target="_blank" rel="noopener noreferrer">{m.title}</a>
        {" by "}
        <a href={m.authorUrl} target="_blank" rel="noopener noreferrer">{m.author}</a>
        {" · "}
        <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>
      </div>

      {error && (
        <div className="overlay">
          <div className="overlay-card">
            <h2>Model file not found</h2>
            <p>
              Add <code>{m.url.replace("/models/", "models/")}</code> to the project. Download it (logged in) from{" "}
              <a href={m.modelUrl} target="_blank" rel="noopener noreferrer">the Sketchfab page</a>{" "}
              via <b>Download 3D Model → glTF (.glb)</b>, rename it, and drop it in the <code>models/</code> folder.
            </p>
            <p className="muted">Error: {error}</p>
          </div>
        </div>
      )}

      {!error && !loaded && <div className="loading"><div className="spinner" /></div>}
    </div>
  );
}
