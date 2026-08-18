import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// Supabase setup
const SUPABASE_URL = "https://tfzzvtizokakcmwmvmhu.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_002yttwEjRydOJdjGBKXcA_-GQK0U0B";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Common goat diseases
const COMMON_DISEASES = [
  "Bloat",
  "Parasites (worms)",
  "Coccidiosis",
  "Foot rot",
  "Pneumonia",
  "Mastitis",
  "CAE (Caprine Arthritis Encephalitis)",
  "Scrapie",
  "Enterotoxemia",
  "Anaemia",
  "Acidosis",
  "Ketosis",
  "Lice",
  "Mange",
  "Ringworm",
  "Listeriosis",
];

// Design system
const COLORS = {
  bg: "#EDEFE6",
  ink: "#1E2A22",
  primary: "#3B5D50",
  accent: "#B5432E",
  gold: "#C99A3D",
  card: "#FFFFFF",
  muted: "#7A8577",
  border: "#DDE2D4",
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: `1.5px solid ${COLORS.border}`,
  fontFamily: "'Inter', sans-serif",
  fontSize: 15,
  color: COLORS.ink,
  background: COLORS.card,
  boxSizing: "border-box",
  marginTop: 4,
};

const labelStyle = {
  fontFamily: "'Inter', sans-serif",
  fontSize: 12,
  fontWeight: 600,
  color: COLORS.muted,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const buttonPrimary = {
  padding: "12px",
  borderRadius: 10,
  border: "none",
  background: COLORS.primary,
  fontFamily: "'Inter', sans-serif",
  fontWeight: 600,
  color: "#fff",
  fontSize: 15,
  cursor: "pointer",
};

const buttonSecondary = {
  padding: "12px",
  borderRadius: 10,
  border: `1.5px solid ${COLORS.border}`,
  background: COLORS.card,
  fontFamily: "'Inter', sans-serif",
  fontWeight: 600,
  color: COLORS.muted,
  fontSize: 15,
  cursor: "pointer",
};

function GoatFarmApp() {
  const [tab, setTab] = useState("goats");
  const [goats, setGoats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states
  const [showGoatForm, setShowGoatForm] = useState(false);
  const [showHealthForm, setShowHealthForm] = useState(false);
  const [showMedicineForm, setShowMedicineForm] = useState(false);
  const [showBreedingForm, setShowBreedingForm] = useState(false);
  const [showWeightForm, setShowWeightForm] = useState(false);
  const [showVaccinationForm, setShowVaccinationForm] = useState(false);
  const [showDewormingForm, setShowDewormingForm] = useState(false);
  const [showSalesForm, setShowSalesForm] = useState(false);

  const [selectedGoat, setSelectedGoat] = useState(null);
  const [goatDetails, setGoatDetails] = useState(null);
  const [customDisease, setCustomDisease] = useState("");
  const [diseases, setDiseases] = useState([...COMMON_DISEASES]);

  // Load goats on mount
  useEffect(() => {
    loadGoats();
  }, []);

  const loadGoats = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("goat_records")
        .select("*")
        .order("tag_number");

      if (error) throw error;
      setGoats(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadGoatDetails = async (tagNumber) => {
    try {
      const { data, error } = await supabase
        .from("goat_records")
        .select("*")
        .eq("tag_number", tagNumber)
        .single();

      if (error) throw error;
      setGoatDetails(data);
      setSelectedGoat(tagNumber);
    } catch (err) {
      setError(err.message);
    }
  };

  const addGoat = async (form) => {
    try {
      const { error } = await supabase.from("goat_records").insert([form]);
      if (error) throw error;
      setShowGoatForm(false);
      loadGoats();
    } catch (err) {
      setError(err.message);
    }
  };

  const addHealth = async (form) => {
    try {
      const { error } = await supabase
        .from("health_history")
        .insert([{ ...form, goat_tag_number: selectedGoat }]);
      if (error) throw error;
      setShowHealthForm(false);
      loadGoatDetails(selectedGoat);
    } catch (err) {
      setError(err.message);
    }
  };

  const addMedicine = async (form) => {
    try {
      const { error } = await supabase
        .from("medicine_records")
        .insert([{ ...form, goat_tag_number: selectedGoat }]);
      if (error) throw error;
      setShowMedicineForm(false);
      loadGoatDetails(selectedGoat);
    } catch (err) {
      setError(err.message);
    }
  };

  const addBreeding = async (form) => {
    try {
      const { error } = await supabase
        .from("breeding_history")
        .insert([form]);
      if (error) throw error;
      setShowBreedingForm(false);
      loadGoats();
    } catch (err) {
      setError(err.message);
    }
  };

  const addWeight = async (form) => {
    try {
      const { error } = await supabase
        .from("weight_history")
        .insert([{ ...form, goat_tag_number: selectedGoat }]);
      if (error) throw error;
      setShowWeightForm(false);
      loadGoatDetails(selectedGoat);
    } catch (err) {
      setError(err.message);
    }
  };

  const addVaccination = async (form) => {
    try {
      const { error } = await supabase
        .from("vaccinations")
        .insert([{ ...form, goat_tag_number: selectedGoat }]);
      if (error) throw error;
      setShowVaccinationForm(false);
      loadGoatDetails(selectedGoat);
    } catch (err) {
      setError(err.message);
    }
  };

  const addDeworming = async (form) => {
    try {
      const { error } = await supabase
        .from("deworming")
        .insert([{ ...form, goat_tag_number: selectedGoat }]);
      if (error) throw error;
      setShowDewormingForm(false);
      loadGoatDetails(selectedGoat);
    } catch (err) {
      setError(err.message);
    }
  };

  const addSales = async (form) => {
    try {
      const { error } = await supabase
        .from("sales_purchases")
        .insert([{ ...form, goat_tag_number: selectedGoat }]);
      if (error) throw error;
      setShowSalesForm(false);
      loadGoats();
    } catch (err) {
      setError(err.message);
    }
  };

  const addCustomDisease = () => {
    if (customDisease.trim() && !diseases.includes(customDisease.trim())) {
      setDiseases([...diseases, customDisease.trim()]);
      setCustomDisease("");
    }
  };

  if (loading)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: COLORS.bg,
          color: COLORS.muted,
        }}
      >
        Loading farm...
      </div>
    );

  return (
    <div
      style={{
        fontFamily: "'Inter', sans-serif",
        background: COLORS.bg,
        minHeight: "100vh",
        maxWidth: 480,
        margin: "0 auto",
        paddingBottom: 120,
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Inter:wght@400;500;600&display=swap');`}</style>

      {/* Header */}
      <div style={{ padding: "24px 20px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ ...labelStyle, color: COLORS.gold }}>Goat Farm Log</div>
        <h1
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: 28,
            margin: "4px 0 0",
            color: COLORS.ink,
          }}
        >
          {tab === "goats"
            ? "Herd Records"
            : tab === "health"
            ? "Health"
            : tab === "medicine"
            ? "Medicine"
            : tab === "breeding"
            ? "Breeding"
            : tab === "weight"
            ? "Weight"
            : tab === "vaccination"
            ? "Vaccines"
            : tab === "deworming"
            ? "Deworming"
            : "Sales"}
        </h1>
        {error && <div style={{ fontSize: 12, color: COLORS.accent, marginTop: 6 }}>{error}</div>}
      </div>

      {/* Content */}
      <div style={{ padding: "16px 20px" }}>
        {/* GOATS TAB */}
        {tab === "goats" && (
          <>
            {goats.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: COLORS.muted }}>
                No goats yet. Add one to start.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                {goats.map((g) => (
                  <div
                    key={g.tag_number}
                    onClick={() => loadGoatDetails(g.tag_number)}
                    style={{
                      background: COLORS.card,
                      borderRadius: 12,
                      padding: "14px 16px",
                      border: `1px solid ${COLORS.border}`,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontFamily: "'Fraunces', serif", fontSize: 16, color: COLORS.ink }}>
                      {g.goat_name} (#{g.tag_number})
                    </div>
                    <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 4 }}>
                      {g.breed} · {g.sex}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowGoatForm(true)}
              style={{ ...buttonPrimary, width: "100%", marginTop: 16 }}
            >
              + Add Goat
            </button>
          </>
        )}

        {/* GOAT DETAIL VIEW */}
        {selectedGoat && goatDetails && (
          <>
            <div
              style={{
                background: COLORS.card,
                borderRadius: 12,
                padding: 16,
                border: `1px solid ${COLORS.border}`,
                marginBottom: 16,
              }}
            >
              <h2 style={{ margin: 0, color: COLORS.ink, fontSize: 20 }}>{goatDetails.goat_name}</h2>
              <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 4 }}>
                Tag: {goatDetails.tag_number} | {goatDetails.breed} | {goatDetails.sex}
              </div>
              <button
                onClick={() => {
                  setSelectedGoat(null);
                  setGoatDetails(null);
                }}
                style={{ ...buttonSecondary, width: "100%", marginTop: 12 }}
              >
                Back to Herd
              </button>
            </div>

            {tab === "health" && (
              <>
                <button
                  onClick={() => setShowHealthForm(true)}
                  style={{ ...buttonPrimary, width: "100%", marginBottom: 16 }}
                >
                  + Record Health Check
                </button>
              </>
            )}

            {tab === "medicine" && (
              <>
                <button
                  onClick={() => setShowMedicineForm(true)}
                  style={{ ...buttonPrimary, width: "100%", marginBottom: 16 }}
                >
                  + Add Medicine
                </button>
              </>
            )}

            {tab === "weight" && (
              <>
                <button
                  onClick={() => setShowWeightForm(true)}
                  style={{ ...buttonPrimary, width: "100%", marginBottom: 16 }}
                >
                  + Record Weight
                </button>
              </>
            )}

            {tab === "vaccination" && (
              <>
                <button
                  onClick={() => setShowVaccinationForm(true)}
                  style={{ ...buttonPrimary, width: "100%", marginBottom: 16 }}
                >
                  + Record Vaccination
                </button>
              </>
            )}

            {tab === "deworming" && (
              <>
                <button
                  onClick={() => setShowDewormingForm(true)}
                  style={{ ...buttonPrimary, width: "100%", marginBottom: 16 }}
                >
                  + Record Deworming
                </button>
              </>
            )}
          </>
        )}

        {tab === "breeding" && !selectedGoat && (
          <button
            onClick={() => setShowBreedingForm(true)}
            style={{ ...buttonPrimary, width: "100%", marginBottom: 16 }}
          >
            + Record Breeding
          </button>
        )}

        {tab === "sales" && !selectedGoat && (
          <button
            onClick={() => setShowSalesForm(true)}
            style={{ ...buttonPrimary, width: "100%", marginBottom: 16 }}
          >
            + Record Sale/Purchase
          </button>
        )}
      </div>

      {/* MODALS */}

      {/* Add Goat */}
      {showGoatForm && <GoatFormModal onSave={addGoat} onClose={() => setShowGoatForm(false)} />}

      {/* Health Form */}
      {showHealthForm && (
        <HealthFormModal
          diseases={diseases}
          onAddDisease={addCustomDisease}
          customDisease={customDisease}
          setCustomDisease={setCustomDisease}
          onSave={addHealth}
          onClose={() => setShowHealthForm(false)}
        />
      )}

      {/* Medicine Form */}
      {showMedicineForm && (
        <MedicineFormModal onSave={addMedicine} onClose={() => setShowMedicineForm(false)} />
      )}

      {/* Breeding Form */}
      {showBreedingForm && (
        <BreedingFormModal goats={goats} onSave={addBreeding} onClose={() => setShowBreedingForm(false)} />
      )}

      {/* Weight Form */}
      {showWeightForm && (
        <WeightFormModal onSave={addWeight} onClose={() => setShowWeightForm(false)} />
      )}

      {/* Vaccination Form */}
      {showVaccinationForm && (
        <VaccinationFormModal onSave={addVaccination} onClose={() => setShowVaccinationForm(false)} />
      )}

      {/* Deworming Form */}
      {showDewormingForm && (
        <DewormingFormModal onSave={addDeworming} onClose={() => setShowDewormingForm(false)} />
      )}

      {/* Sales Form */}
      {showSalesForm && (
        <SalesFormModal goats={goats} onSave={addSales} onClose={() => setShowSalesForm(false)} />
      )}

      {/* Bottom Tab Bar */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: COLORS.card,
          borderTop: `1px solid ${COLORS.border}`,
          display: "flex",
          padding: "10px 0 calc(10px + env(safe-area-inset-bottom))",
          maxWidth: 480,
          margin: "0 auto",
          width: "100%",
        }}
      >
        {[
          { key: "goats", label: "Herd" },
          { key: "health", label: "Health" },
          { key: "medicine", label: "Medicine" },
          { key: "breeding", label: "Breeding" },
          { key: "weight", label: "Weight" },
          { key: "vaccination", label: "Vaccines" },
          { key: "deworming", label: "Deworming" },
          { key: "sales", label: "Sales" },
        ].map((item) => (
          <div
            key={item.key}
            onClick={() => setTab(item.key)}
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: 11,
              fontWeight: 600,
              color: tab === item.key ? COLORS.primary : COLORS.muted,
              cursor: "pointer",
            }}
          >
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// --- FORM COMPONENTS ---

function GoatFormModal({ onSave, onClose }) {
  const [form, setForm] = useState({
    tag_number: "",
    serial_number: "",
    goat_name: "",
    sex: "Female",
    breed: "",
    date_of_birth: "",
    current_weight: "",
    health_status: "Healthy",
    colour: "",
    farm_location: "",
    notes: "",
  });

  return (
    <Modal onClose={onClose}>
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, margin: "0 0 16px" }}>
        Add Goat
      </h3>
      <FormField
        label="Tag Number"
        value={form.tag_number}
        onChange={(v) => setForm({ ...form, tag_number: v })}
        placeholder="e.g. G001"
      />
      <FormField
        label="Goat Name"
        value={form.goat_name}
        onChange={(v) => setForm({ ...form, goat_name: v })}
        placeholder="e.g. Clover"
      />
      <FormField
        label="Breed"
        value={form.breed}
        onChange={(v) => setForm({ ...form, breed: v })}
        placeholder="e.g. Nubian"
      />
      <FormSelect
        label="Sex"
        value={form.sex}
        options={["Male", "Female"]}
        onChange={(v) => setForm({ ...form, sex: v })}
      />
      <FormField
        label="Date of Birth"
        type="date"
        value={form.date_of_birth}
        onChange={(v) => setForm({ ...form, date_of_birth: v })}
      />
      <FormField
        label="Current Weight (kg)"
        type="number"
        value={form.current_weight}
        onChange={(v) => setForm({ ...form, current_weight: v })}
      />
      <FormField
        label="Colour"
        value={form.colour}
        onChange={(v) => setForm({ ...form, colour: v })}
      />
      <FormField
        label="Farm Location"
        value={form.farm_location}
        onChange={(v) => setForm({ ...form, farm_location: v })}
      />
      <FormField
        label="Notes"
        value={form.notes}
        onChange={(v) => setForm({ ...form, notes: v })}
        textarea
      />
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button onClick={onClose} style={{ ...buttonSecondary, flex: 1 }}>
          Cancel
        </button>
        <button
          onClick={() => form.tag_number && form.goat_name && onSave(form)}
          style={{ ...buttonPrimary, flex: 1 }}
        >
          Save
        </button>
      </div>
    </Modal>
  );
}

function HealthFormModal({ diseases, onAddDisease, customDisease, setCustomDisease, onSave, onClose }) {
  const [form, setForm] = useState({
    record_date: new Date().toISOString().split("T")[0],
    weight: "",
    temperature: "",
    symptoms: "",
    diagnosis: "",
    treatment: "",
    veterinarian: "",
    recovery_status: "In Progress",
  });

  return (
    <Modal onClose={onClose}>
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, margin: "0 0 16px" }}>
        Health Check Record
      </h3>
      <FormField
        label="Date"
        type="date"
        value={form.record_date}
        onChange={(v) => setForm({ ...form, record_date: v })}
      />
      <FormField
        label="Weight (kg)"
        type="number"
        value={form.weight}
        onChange={(v) => setForm({ ...form, weight: v })}
      />
      <FormField
        label="Temperature (°C)"
        type="number"
        value={form.temperature}
        onChange={(v) => setForm({ ...form, temperature: v })}
      />
      <FormField
        label="Symptoms"
        value={form.symptoms}
        onChange={(v) => setForm({ ...form, symptoms: v })}
        textarea
      />

      {/* Disease selector */}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Diagnosis (Select or Add)</label>
        <select
          value={form.diagnosis}
          onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
          style={inputStyle}
        >
          <option value="">Choose a disease...</option>
          {diseases.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input
            value={customDisease}
            onChange={(e) => setCustomDisease(e.target.value)}
            placeholder="Or add new disease..."
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            onClick={onAddDisease}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: "none",
              background: "#3B5D50",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Add
          </button>
        </div>
      </div>

      <FormField
        label="Treatment"
        value={form.treatment}
        onChange={(v) => setForm({ ...form, treatment: v })}
        textarea
      />
      <FormField
        label="Veterinarian"
        value={form.veterinarian}
        onChange={(v) => setForm({ ...form, veterinarian: v })}
      />
      <FormSelect
        label="Recovery Status"
        value={form.recovery_status}
        options={["In Progress", "Recovered", "Chronic", "Deceased"]}
        onChange={(v) => setForm({ ...form, recovery_status: v })}
      />
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button onClick={onClose} style={{ ...buttonSecondary, flex: 1 }}>
          Cancel
        </button>
        <button
          onClick={() => form.record_date && onSave(form)}
          style={{ ...buttonPrimary, flex: 1 }}
        >
          Save
        </button>
      </div>
    </Modal>
  );
}

function MedicineFormModal({ onSave, onClose }) {
  const [form, setForm] = useState({
    record_date: new Date().toISOString().split("T")[0],
    medicine_name: "",
    dosage: "",
    purpose: "",
    administered_by: "",
    next_dose_date: "",
    withdrawal_period: "",
    notes: "",
  });

  return (
    <Modal onClose={onClose}>
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, margin: "0 0 16px" }}>
        Medicine Record
      </h3>
      <FormField
        label="Date"
        type="date"
        value={form.record_date}
        onChange={(v) => setForm({ ...form, record_date: v })}
      />
      <FormField
        label="Medicine Name"
        value={form.medicine_name}
        onChange={(v) => setForm({ ...form, medicine_name: v })}
      />
      <FormField
        label="Dosage"
        value={form.dosage}
        onChange={(v) => setForm({ ...form, dosage: v })}
      />
      <FormField
        label="Purpose"
        value={form.purpose}
        onChange={(v) => setForm({ ...form, purpose: v })}
      />
      <FormField
        label="Administered By"
        value={form.administered_by}
        onChange={(v) => setForm({ ...form, administered_by: v })}
      />
      <FormField
        label="Next Dose Date"
        type="date"
        value={form.next_dose_date}
        onChange={(v) => setForm({ ...form, next_dose_date: v })}
      />
      <FormField
        label="Withdrawal Period"
        value={form.withdrawal_period}
        onChange={(v) => setForm({ ...form, withdrawal_period: v })}
        placeholder="e.g. 14 days"
      />
      <FormField
        label="Notes"
        value={form.notes}
        onChange={(v) => setForm({ ...form, notes: v })}
        textarea
      />
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button onClick={onClose} style={{ ...buttonSecondary, flex: 1 }}>
          Cancel
        </button>
        <button
          onClick={() => form.medicine_name && onSave(form)}
          style={{ ...buttonPrimary, flex: 1 }}
        >
          Save
        </button>
      </div>
    </Modal>
  );
}

function BreedingFormModal({ goats, onSave, onClose }) {
  const [form, setForm] = useState({
    doe_tag_number: "",
    buck_tag_number: "",
    breeding_date: new Date().toISOString().split("T")[0],
    pregnancy_confirmed: false,
    expected_kidding_date: "",
    complications: "",
    notes: "",
  });

  return (
    <Modal onClose={onClose}>
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, margin: "0 0 16px" }}>
        Breeding Record
      </h3>
      <FormSelect
        label="Doe"
        value={form.doe_tag_number}
        options={goats.map((g) => g.tag_number)}
        onChange={(v) => setForm({ ...form, doe_tag_number: v })}
      />
      <FormSelect
        label="Buck"
        value={form.buck_tag_number}
        options={goats.map((g) => g.tag_number)}
        onChange={(v) => setForm({ ...form, buck_tag_number: v })}
      />
      <FormField
        label="Breeding Date"
        type="date"
        value={form.breeding_date}
        onChange={(v) => setForm({ ...form, breeding_date: v })}
      />
      <FormField
        label="Expected Kidding Date"
        type="date"
        value={form.expected_kidding_date}
        onChange={(v) => setForm({ ...form, expected_kidding_date: v })}
      />
      <FormField
        label="Complications"
        value={form.complications}
        onChange={(v) => setForm({ ...form, complications: v })}
        textarea
      />
      <FormField
        label="Notes"
        value={form.notes}
        onChange={(v) => setForm({ ...form, notes: v })}
        textarea
      />
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button onClick={onClose} style={{ ...buttonSecondary, flex: 1 }}>
          Cancel
        </button>
        <button
          onClick={() =>
            form.doe_tag_number && form.buck_tag_number && onSave(form)
          }
          style={{ ...buttonPrimary, flex: 1 }}
        >
          Save
        </button>
      </div>
    </Modal>
  );
}

function WeightFormModal({ onSave, onClose }) {
  const [form, setForm] = useState({
    record_date: new Date().toISOString().split("T")[0],
    weight: "",
    weight_change: "",
    notes: "",
  });

  return (
    <Modal onClose={onClose}>
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, margin: "0 0 16px" }}>
        Weight Record
      </h3>
      <FormField
        label="Date"
        type="date"
        value={form.record_date}
        onChange={(v) => setForm({ ...form, record_date: v })}
      />
      <FormField
        label="Weight (kg)"
        type="number"
        value={form.weight}
        onChange={(v) => setForm({ ...form, weight: v })}
      />
      <FormField
        label="Weight Change (kg)"
        type="number"
        value={form.weight_change}
        onChange={(v) => setForm({ ...form, weight_change: v })}
      />
      <FormField
        label="Notes"
        value={form.notes}
        onChange={(v) => setForm({ ...form, notes: v })}
        textarea
      />
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button onClick={onClose} style={{ ...buttonSecondary, flex: 1 }}>
          Cancel
        </button>
        <button
          onClick={() => form.weight && onSave(form)}
          style={{ ...buttonPrimary, flex: 1 }}
        >
          Save
        </button>
      </div>
    </Modal>
  );
}

function VaccinationFormModal({ onSave, onClose }) {
  const [form, setForm] = useState({
    vaccine_name: "",
    date_given: new Date().toISOString().split("T")[0],
    next_due_date: "",
    administered_by: "",
    notes: "",
  });

  return (
    <Modal onClose={onClose}>
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, margin: "0 0 16px" }}>
        Vaccination Record
      </h3>
      <FormField
        label="Vaccine Name"
        value={form.vaccine_name}
        onChange={(v) => setForm({ ...form, vaccine_name: v })}
        placeholder="e.g. CDT"
      />
      <FormField
        label="Date Given"
        type="date"
        value={form.date_given}
        onChange={(v) => setForm({ ...form, date_given: v })}
      />
      <FormField
        label="Next Due Date"
        type="date"
        value={form.next_due_date}
        onChange={(v) => setForm({ ...form, next_due_date: v })}
      />
      <FormField
        label="Administered By"
        value={form.administered_by}
        onChange={(v) => setForm({ ...form, administered_by: v })}
      />
      <FormField
        label="Notes"
        value={form.notes}
        onChange={(v) => setForm({ ...form, notes: v })}
        textarea
      />
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button onClick={onClose} style={{ ...buttonSecondary, flex: 1 }}>
          Cancel
        </button>
        <button
          onClick={() => form.vaccine_name && onSave(form)}
          style={{ ...buttonPrimary, flex: 1 }}
        >
          Save
        </button>
      </div>
    </Modal>
  );
}

function DewormingFormModal({ onSave, onClose }) {
  const [form, setForm] = useState({
    medicine: "",
    date_given: new Date().toISOString().split("T")[0],
    next_due_date: "",
    notes: "",
  });

  return (
    <Modal onClose={onClose}>
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, margin: "0 0 16px" }}>
        Deworming Record
      </h3>
      <FormField
        label="Medicine"
        value={form.medicine}
        onChange={(v) => setForm({ ...form, medicine: v })}
      />
      <FormField
        label="Date Given"
        type="date"
        value={form.date_given}
        onChange={(v) => setForm({ ...form, date_given: v })}
      />
      <FormField
        label="Next Due Date"
        type="date"
        value={form.next_due_date}
        onChange={(v) => setForm({ ...form, next_due_date: v })}
      />
      <FormField
        label="Notes"
        value={form.notes}
        onChange={(v) => setForm({ ...form, notes: v })}
        textarea
      />
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button onClick={onClose} style={{ ...buttonSecondary, flex: 1 }}>
          Cancel
        </button>
        <button
          onClick={() => form.medicine && onSave(form)}
          style={{ ...buttonPrimary, flex: 1 }}
        >
          Save
        </button>
      </div>
    </Modal>
  );
}

function SalesFormModal({ goats, onSave, onClose }) {
  const [form, setForm] = useState({
    goat_tag_number: "",
    transaction_type: "Sale",
    transaction_date: new Date().toISOString().split("T")[0],
    buyer_seller: "",
    price: "",
    reason: "",
    notes: "",
  });

  return (
    <Modal onClose={onClose}>
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, margin: "0 0 16px" }}>
        Sale / Purchase Record
      </h3>
      <FormSelect
        label="Goat"
        value={form.goat_tag_number}
        options={goats.map((g) => g.tag_number)}
        onChange={(v) => setForm({ ...form, goat_tag_number: v })}
      />
      <FormSelect
        label="Transaction Type"
        value={form.transaction_type}
        options={["Sale", "Purchase"]}
        onChange={(v) => setForm({ ...form, transaction_type: v })}
      />
      <FormField
        label="Date"
        type="date"
        value={form.transaction_date}
        onChange={(v) => setForm({ ...form, transaction_date: v })}
      />
      <FormField
        label="Buyer / Seller"
        value={form.buyer_seller}
        onChange={(v) => setForm({ ...form, buyer_seller: v })}
      />
      <FormField
        label="Price"
        type="number"
        value={form.price}
        onChange={(v) => setForm({ ...form, price: v })}
      />
      <FormField
        label="Reason"
        value={form.reason}
        onChange={(v) => setForm({ ...form, reason: v })}
      />
      <FormField
        label="Notes"
        value={form.notes}
        onChange={(v) => setForm({ ...form, notes: v })}
        textarea
      />
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button onClick={onClose} style={{ ...buttonSecondary, flex: 1 }}>
          Cancel
        </button>
        <button
          onClick={() =>
            form.goat_tag_number && form.transaction_date && onSave(form)
          }
          style={{ ...buttonPrimary, flex: 1 }}
        >
          Save
        </button>
      </div>
    </Modal>
  );
}

// --- REUSABLE COMPONENTS ---

function Modal({ onClose, children }) {
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
          maxHeight: "90vh",
          overflowY: "auto",
          borderRadius: "20px 20px 0 0",
          padding: "20px 20px 28px",
        }}
      >
        <div
          style={{
            width: 40,
            height: 4,
            background: "#DDE2D4",
            borderRadius: 2,
            margin: "0 auto 16px",
          }}
        />
        {children}
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, placeholder, type = "text", textarea = false }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          style={inputStyle}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={inputStyle}
        />
      )}
    </div>
  );
}

function FormSelect({ label, value, options, onChange }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
        <option value="">Choose...</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

export default GoatFarmApp;
