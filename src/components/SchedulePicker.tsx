interface Props {
  value: string | null;
  onChange: (v: string | null) => void;
}

export function SchedulePicker({ value, onChange }: Props) {
  return (
    <div className="card">
      <label className="label mb-3">When to publish</label>

      <div className="flex gap-2 mb-3">
        <button
          onClick={() => onChange(null)}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            value === null
              ? "bg-brand-600 text-white"
              : "bg-gray-800 text-gray-400 hover:text-gray-300"
          }`}
        >
          Now
        </button>
        <button
          onClick={() => {
            // Default to 1 hour from now
            const d = new Date(Date.now() + 60 * 60 * 1000);
            onChange(d.toISOString().slice(0, 16));
          }}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            value !== null
              ? "bg-brand-600 text-white"
              : "bg-gray-800 text-gray-400 hover:text-gray-300"
          }`}
        >
          Schedule
        </button>
      </div>

      {value !== null && (
        <input
          type="datetime-local"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={new Date().toISOString().slice(0, 16)}
          className="input"
        />
      )}
    </div>
  );
}
