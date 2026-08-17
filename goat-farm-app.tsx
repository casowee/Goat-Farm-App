import React, { useState, useEffect, useRef } from "react";

// ---- Design tokens ----
// bg: soft sage paper #EDEFE6 | ink: deep pine #1E2A22 | primary: pasture green #3B5D50
// accent: barn rust #B5432E | gold: tag amber #C99A3D | card: #FFFFFF | muted: #7A8577

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600&display=swap');
`;

const VET_REFERENCE = [
  {
    name: "Bloat",
    watch: "Swollen left side of belly, discomfort, grinding teeth, off feed.",
    emergency: "Belly is tight as a drum, goat is distressed or down — call the vet immediately.",
  },
  {
    name: "Parasites (worms)",
    watch: "Pale inner eyelids, rough coat, weight loss, pasty or dark manure.",
    emergency: "Bottle jaw (swelling under the chin) or extreme weakness — vet visit needed.",
  },
  {
    name: "Coccidiosis",
    watch: "Watery or bloody diarrhea, especially in kids, lethargy.",
    emergency: "Blood in stool or a kid stops eating — same-day vet call.",
  },
  {
    name: "Foot rot",
    watch: "Limping, foul smell between hooves, redness or heat in the foot.",
    emergency: "Goat won't bear weight at all or fever is present.",
  },
  {
    name: "Pneumonia",
    watch: "Coughing, nasal discharge, rapid breathing, fever.",
    emergency: "Open-mouth breathing or blue-tinged gums — emergency.",
  },
  {
    name: "Kidding complications",
    watch: "Labor longer than 30 minutes without progress, visible malposition.",
    emergency: "No progress after pushing 30+ minutes — call vet right away.",
  },
];

const TAG_COLORS = ["#B5432E", "#C99A3D", "#3B5D50", "#6B4F3B", "#8C6E54"];

function useFarmData() {
  const [goats, setGoats] = useState([]);
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const loaded = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const result = await window.storage.get("farm-data", false);
        if (result && result.value) {
          const parsed = JSON.parse(result.value);
          setGoats(parsed.goats || []);
          setTodos(parsed.todos || []);
        }
      } catch (e) {
        // no existing data yet — that's fine
      } finally {
        loaded.current = true;
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    (async () => {
      try {
        await window.storage.set(
          "farm-data",
          JSON.stringify({ goats, todos }),
          false
        );
        setError(null);
      } catch (e) {
        setError("Couldn't save — your changes may not persist.");
      }
    })();
  }, [goats, todos]);

  return { goats, setGoats, todos, setTodos, loading, error };
}

function EarTag({ index, breed }) {
  const color = TAG_COLORS[index % TAG_COLORS.length];
  return (
    <div
      style={{
        background: color,
        color: "#fff",
        fontFamily: "'Inter', sans-serif",
        fontWeight: 600,
        fontSize: 12,
        padding: "3px 9px",
        borderRadius: "3px 3px 8px 8px",
        display: "inline-block",
        letterSpacing: "0.03em",
      }}
    >
      #{String(index + 1).padStart(2, "0")}
    </div>
  );
}

function GoatForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(
    initial || {
      name: "",
      breed: "",
      age: "",
      notes: "",
      vaccinations: "",
      breeding: "",
    }
  );
  const field = (key, label, placeholder, textarea) => (
    <div style={{ marginBottom: 14 }}>
      <label
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 12,
          fontWeight: 600,
          color: "#7A8577",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </label>
      {textarea ? (
        <textarea
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          placeholder={placeholder}
          rows={2}
          style={inputStyle}
        />
      ) : (
        <input
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          placeholder={placeholder}
          style={inputStyle}
        />
      )}
    </div>
  );
  const inputStyle = {
    width: "100%",
    marginTop: 4,
    padding: "10px 12px",
    borderRadius: 10,
    border: "1.5px solid #DDE2D4",
    fontFamily: "'Inter', sans-serif",
    fontSize: 15,
    color: "#1E2A22",
    background: "#fff",
    boxSizing: "border-box",
  };
  return (
    <div style={{ padding: "4px 2px" }}>
      {field("name", "Name", "e.g. Clover")}
      {field("breed", "Breed", "e.g. Nubian")}
      {field("age", "Age", "e.g. 2 years")}
      {field("vaccinations", "Vaccination / deworming history", "CDT given March 2026...", true)}
      {field("breeding", "Breeding records", "Bred to Samson, due Oct 2026...", true)}
      {field("notes", "Health notes", "Any ongoing concerns...", true)}
      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: 10,
            border: "1.5px solid #DDE2D4",
            background: "#fff",
            fontFamily: "'Inter', sans-serif",
            fontWeight: 600,
            color: "#7A8577",
          }}
        >
          Cancel
        </button>
        <button
          onClick={() => form.name.trim() && onSave(form)}
          style={{
            flex: 2,
            padding: "12px",
            borderRadius: 10,
            border: "none",
            background: "#3B5D50",
            fontFamily: "'Inter', sans-serif",
            fontWeight: 600,
            color: "#fff",
          }}
        >
          Save goat
        </button>
      </div>
    </div>
  );
}

function GoatDetail({ goat, index, onEdit, onDelete, onClose }) {
  const row = (label, value) =>
    value ? (
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 11,
            fontWeight: 600,
            color: "#7A8577",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: 3,
          }}
        >
          {label}
        </div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, color: "#1E2A22", lineHeight: 1.5 }}>
          {value}
        </div>
      </div>
    ) : null;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <EarTag index={index} />
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, margin: 0, color: "#1E2A22" }}>
          {goat.name}
        </h2>
      </div>
      {row("Breed", goat.breed)}
      {row("Age", goat.age)}
      {row("Vaccination / deworming history", goat.vaccinations)}
      {row("Breeding records", goat.breeding)}
      {row("Health notes", goat.notes)}
      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button
          onClick={onClose}
          style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1.5px solid #DDE2D4", background: "#fff", fontFamily: "'Inter', sans-serif", fontWeight: 600, color: "#7A8577" }}
        >
          Close
        </button>
        <button
          onClick={onEdit}
          style={{ flex: 1, padding: "12px", borderRadius: 10, border: "none", background: "#3B5D50", fontFamily: "'Inter', sans-serif", fontWeight: 600, color: "#fff" }}
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1.5px solid #B5432E", background: "#fff", fontFamily: "'Inter', sans-serif", fontWeight: 600, color: "#B5432E" }}
        >
          Remove
        </button>
      </div>
    </div>
  );
}

function Sheet({ children, onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(30,42,34,0.4)",
        display: "flex",
        alignItems: "flex-end",
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#EDEFE6",
          width: "100%",
          maxHeight: "85vh",
          overflowY: "auto",
          borderRadius: "20px 20px 0 0",
          padding: "20px 20px 28px",
        }}
      >
        <div style={{ width: 40, height: 4, background: "#DDE2D4", borderRadius: 2, margin: "0 auto 16px" }} />
        {children}
      </div>
    </div>
  );
}

export default function GoatFarmApp() {
  const { goats, setGoats, todos, setTodos, loading, error } = useFarmData();
  const [tab, setTab] = useState("goats");
  const [selectedGoat, setSelectedGoat] = useState(null);
  const [editingGoat, setEditingGoat] = useState(null);
  const [showGoatForm, setShowGoatForm] = useState(false);
  const [newTodo, setNewTodo] = useState("");
  const [openAilment, setOpenAilment] = useState(null);

  const addGoat = (form) => {
    setGoats([...goats, form]);
    setShowGoatForm(false);
  };
  const updateGoat = (form) => {
    setGoats(goats.map((g, i) => (i === editingGoat ? form : g)));
    setEditingGoat(null);
    setSelectedGoat(null);
  };
  const deleteGoat = (i) => {
    setGoats(goats.filter((_, idx) => idx !== i));
    setSelectedGoat(null);
  };
  const addTodo = () => {
    if (!newTodo.trim()) return;
    setTodos([{ text: newTodo.trim(), done: false, id: Date.now() }, ...todos]);
    setNewTodo("");
  };
  const toggleTodo = (id) =>
    setTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const removeTodo = (id) => setTodos(todos.filter((t) => t.id !== id));

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#EDEFE6", fontFamily: "'Inter', sans-serif", color: "#7A8577" }}>
        Loading your farm...
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "#EDEFE6", minHeight: "100vh", maxWidth: 480, margin: "0 auto", position: "relative" }}>
      <style>{FONT_IMPORT}</style>

      {/* Header */}
      <div style={{ padding: "24px 20px 16px", borderBottom: "1px solid #DDE2D4" }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, color: "#C99A3D", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Farm Log
        </div>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 700, margin: "2px 0 0", color: "#1E2A22" }}>
          {tab === "goats" ? "The Herd" : tab === "todos" ? "Today's Work" : "Field Reference"}
        </h1>
        {error && (
          <div style={{ fontSize: 12, color: "#B5432E", marginTop: 6 }}>{error}</div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: "16px 20px 100px" }}>
        {tab === "goats" && (
          <>
            {goats.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#7A8577" }}>
                No goats yet. Tap "Add a goat" to start your herd log.
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {goats.map((g, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedGoat(i)}
                  style={{
                    background: "#fff",
                    borderRadius: 14,
                    padding: "14px 16px",
                    border: "1px solid #DDE2D4",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <EarTag index={i} />
                    <div>
                      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 18, color: "#1E2A22" }}>{g.name}</div>
                      <div style={{ fontSize: 13, color: "#7A8577" }}>{g.breed || "Breed not set"}{g.age ? ` · ${g.age}` : ""}</div>
                    </div>
                  </div>
                  <span style={{ color: "#7A8577", fontSize: 18 }}>›</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowGoatForm(true)}
              style={{
                marginTop: 18,
                width: "100%",
                padding: "14px",
                borderRadius: 12,
                border: "none",
                background: "#3B5D50",
                color: "#fff",
                fontWeight: 600,
                fontSize: 15,
              }}
            >
              + Add a goat
            </button>
          </>
        )}

        {tab === "todos" && (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTodo()}
                placeholder="Add a task, feeding, or check..."
                style={{
                  flex: 1,
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1.5px solid #DDE2D4",
                  fontSize: 15,
                  background: "#fff",
                }}
              />
              <button
                onClick={addTodo}
                style={{ padding: "0 18px", borderRadius: 10, border: "none", background: "#3B5D50", color: "#fff", fontWeight: 600 }}
              >
                Add
              </button>
            </div>
            {todos.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#7A8577" }}>
                Nothing on the list. Add feeding times, health checks, or farm chores.
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {todos.map((t) => (
                <div
                  key={t.id}
                  style={{
                    background: "#fff",
                    borderRadius: 12,
                    padding: "12px 14px",
                    border: "1px solid #DDE2D4",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div
                    onClick={() => toggleTodo(t.id)}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      border: `2px solid ${t.done ? "#3B5D50" : "#DDE2D4"}`,
                      background: t.done ? "#3B5D50" : "transparent",
                      flexShrink: 0,
                      cursor: "pointer",
                    }}
                  />
                  <div style={{ flex: 1, fontSize: 15, color: t.done ? "#7A8577" : "#1E2A22", textDecoration: t.done ? "line-through" : "none" }}>
                    {t.text}
                  </div>
                  <div onClick={() => removeTodo(t.id)} style={{ color: "#B5432E", fontSize: 13, cursor: "pointer" }}>
                    Remove
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "reference" && (
          <>
            <div style={{ fontSize: 13, color: "#7A8577", marginBottom: 16, lineHeight: 1.5 }}>
              For awareness only — not a substitute for a real veterinarian. When in doubt, call your vet.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {VET_REFERENCE.map((item, i) => (
                <div key={i} style={{ background: "#fff", borderRadius: 12, border: "1px solid #DDE2D4", overflow: "hidden" }}>
                  <div
                    onClick={() => setOpenAilment(openAilment === i ? null : i)}
                    style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                  >
                    <span style={{ fontFamily: "'Fraunces', serif", fontSize: 17, color: "#1E2A22" }}>{item.name}</span>
                    <span style={{ color: "#7A8577" }}>{openAilment === i ? "−" : "+"}</span>
                  </div>
                  {openAilment === i && (
                    <div style={{ padding: "0 16px 16px" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#7A8577", marginBottom: 3 }}>WATCH FOR</div>
                      <div style={{ fontSize: 14, color: "#1E2A22", marginBottom: 10, lineHeight: 1.5 }}>{item.watch}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#B5432E", marginBottom: 3 }}>EMERGENCY IF</div>
                      <div style={{ fontSize: 14, color: "#1E2A22", lineHeight: 1.5 }}>{item.emergency}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Bottom tab bar */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 480,
          background: "#fff",
          borderTop: "1px solid #DDE2D4",
          display: "flex",
          padding: "10px 0 calc(10px + env(safe-area-inset-bottom))",
        }}
      >
        {[
          { key: "goats", label: "Herd" },
          { key: "todos", label: "To-Dos" },
          { key: "reference", label: "Reference" },
        ].map((item) => (
          <div
            key={item.key}
            onClick={() => setTab(item.key)}
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: 13,
              fontWeight: 600,
              color: tab === item.key ? "#3B5D50" : "#7A8577",
              cursor: "pointer",
            }}
          >
            {item.label}
          </div>
        ))}
      </div>

      {/* Sheets */}
      {showGoatForm && (
        <Sheet onClose={() => setShowGoatForm(false)}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, margin: "0 0 12px" }}>Add a goat</h3>
          <GoatForm onSave={addGoat} onCancel={() => setShowGoatForm(false)} />
        </Sheet>
      )}
      {editingGoat !== null && (
        <Sheet onClose={() => setEditingGoat(null)}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, margin: "0 0 12px" }}>Edit goat</h3>
          <GoatForm initial={goats[editingGoat]} onSave={updateGoat} onCancel={() => setEditingGoat(null)} />
        </Sheet>
      )}
      {selectedGoat !== null && editingGoat === null && (
        <Sheet onClose={() => setSelectedGoat(null)}>
          <GoatDetail
            goat={goats[selectedGoat]}
            index={selectedGoat}
            onEdit={() => setEditingGoat(selectedGoat)}
            onDelete={() => deleteGoat(selectedGoat)}
            onClose={() => setSelectedGoat(null)}
          />
        </Sheet>
      )}
    </div>
  );
}
