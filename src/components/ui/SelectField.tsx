import { useId, type SelectHTMLAttributes } from 'react'

export interface SelectOption {
  value: string
  label: string
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  hint?: string
  options: SelectOption[]
}

export function SelectField({
  label,
  hint,
  options,
  id,
  className = '',
  ...rest
}: SelectFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId

  return (
    <div className={`field ${className}`}>
      <label className="field__label" htmlFor={fieldId}>
        {label}
      </label>
      <select id={fieldId} className="field__input field__select" {...rest}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <p className="field__hint">{hint}</p>}
    </div>
  )
}
