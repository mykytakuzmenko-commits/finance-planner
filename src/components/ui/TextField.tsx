import { useId, type InputHTMLAttributes } from 'react'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
}

export function TextField({ label, hint, id, className = '', ...rest }: TextFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId

  return (
    <div className={`field ${className}`}>
      <label className="field__label" htmlFor={fieldId}>
        {label}
      </label>
      <input id={fieldId} className="field__input" {...rest} />
      {hint && <p className="field__hint">{hint}</p>}
    </div>
  )
}
