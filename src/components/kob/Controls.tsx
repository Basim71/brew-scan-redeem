import { useId, type InputHTMLAttributes, type ReactNode } from "react";

type ToggleLike = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "id"> & {
  label: ReactNode;
  hint?: ReactNode;
};

/** Global checkbox — shares focus ring, disabled and label typography. */
export function Checkbox({ label, hint, className = "", ...rest }: ToggleLike) {
  const id = useId();
  return (
    <div className={`kob-control ${className}`} data-kind="checkbox">
      <input id={id} type="checkbox" className="kob-control-input" {...rest} />
      <label htmlFor={id}>
        <span className="kob-control-label">{label}</span>
        {hint ? <small>{hint}</small> : null}
      </label>
    </div>
  );
}

/** Global radio — same geometry as the checkbox. */
export function Radio({ label, hint, className = "", ...rest }: ToggleLike) {
  const id = useId();
  return (
    <div className={`kob-control ${className}`} data-kind="radio">
      <input id={id} type="radio" className="kob-control-input" {...rest} />
      <label htmlFor={id}>
        <span className="kob-control-label">{label}</span>
        {hint ? <small>{hint}</small> : null}
      </label>
    </div>
  );
}

export function RadioGroup({ legend, children }: { legend: ReactNode; children: ReactNode }) {
  return (
    <fieldset className="kob-control-group">
      <legend>{legend}</legend>
      {children}
    </fieldset>
  );
}

/** Global switch. Uses a real checkbox for keyboard + screen readers. */
export function Toggle({
  label,
  hint,
  checked,
  onCheckedChange,
  disabled,
  name,
}: {
  label: ReactNode;
  hint?: ReactNode;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
  name?: string;
}) {
  const id = useId();
  return (
    <div className="kob-toggle-row">
      <label htmlFor={id} className="kob-toggle-copy">
        <span className="kob-control-label">{label}</span>
        {hint ? <small>{hint}</small> : null}
      </label>
      <input
        id={id}
        name={name}
        type="checkbox"
        role="switch"
        className="kob-toggle"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onCheckedChange(e.target.checked)}
      />
    </div>
  );
}
