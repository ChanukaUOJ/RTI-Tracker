import { useState } from "react";

export default function TagInput({
  tags,
  onChange,
  validator,
  validationMessage,
  placeholder,
  hasError,
  type = 'text',
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  validator?: (v: string) => boolean;
  validationMessage?: string;
  placeholder?: string;
  hasError?: boolean;
  type?: 'text' | 'email' | 'tel';
}) {
  const [raw, setRaw] = useState('');
  const [inlineError, setInlineError] = useState('');

  const commit = (input: string) => {
    const parts = input.split(',').map(s => s.trim()).filter(Boolean);
    const toAdd: string[] = [];
    const invalid: string[] = [];

    for (const part of parts) {
      if (tags.includes(part)) continue;
      if (validator && !validator(part)) {
        invalid.push(part);
      } else {
        toAdd.push(part);
      }
    }

    if (toAdd.length) onChange([...tags, ...toAdd]);

    if (invalid.length) {
      setInlineError(validationMessage || 'Invalid value');
      setRaw(invalid.join(', '));
    } else {
      setInlineError('');
      setRaw('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ',' || e.key === 'Enter') {
      e.preventDefault();
      if (raw.trim()) commit(raw);
    } else if (e.key === 'Backspace' && !raw && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    commit(raw + e.clipboardData.getData('text'));
  };

  const handleBlur = () => {
    if (raw.trim()) commit(raw);
  };

  const remove = (i: number) => onChange(tags.filter((_, idx) => idx !== i));

  return (
    <div>
      <input
        type={type}
        autoComplete="off"
        value={raw}
        placeholder={tags.length === 0 ? placeholder : 'Add more…'}
        className={`w-full px-3 py-2 rounded border focus:outline-none focus:ring-2 focus:ring-blue-900 ${
          hasError || inlineError ? 'border-red-500' : 'border-gray-200'
        }`}
        onChange={e => { setRaw(e.target.value); setInlineError(''); }}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={handleBlur}
      />
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {tags.map((tag, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-medium"
            >
              {tag}
              <button
                type="button"
                onClick={() => remove(i)}
                className="ml-0.5 text-blue-400 hover:text-blue-700 leading-none"
                aria-label={`Remove ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      {inlineError && <p className="text-red-500 text-xs mt-1">{inlineError}</p>}
    </div>
  );
}