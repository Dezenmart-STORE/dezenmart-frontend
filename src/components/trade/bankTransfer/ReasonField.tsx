import { Field } from "../../common/form/Field";
import { inputClass } from "../../common/form/fieldStyles";

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  maxLength: number;
  placeholder?: string;
}

/** A short free-text reason inside a confirm box. */
export default function ReasonField({ label, value, onChange, error, hint, maxLength, placeholder }: Props) {
  return (
    <Field label={label} required surface="card" error={error} hint={hint}>
      {({ id, describedBy, invalid }) => (
        <textarea
          id={id}
          rows={3}
          value={value}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          className={`${inputClass("card", invalid)} resize-none`}
        />
      )}
    </Field>
  );
}
