import type { ReactNode } from 'react'

const rowClass = (disabled: boolean) =>
  [
    'inline-flex items-center gap-3 rounded-card border border-muted/30 bg-background px-6 py-3 text-xl font-medium text-foreground',
    disabled ? 'cursor-not-allowed text-muted' : 'cursor-pointer',
  ].join(' ')

const controlClass = (disabled: boolean) =>
  ['size-5 accent-accent', disabled ? 'cursor-not-allowed' : 'cursor-pointer'].join(
    ' ',
  )

export function Checkbox({
  id,
  label,
  checked,
  onChange,
  icon,
  disabled = false,
}: {
  id?: string
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  icon?: ReactNode
  disabled?: boolean
}) {
  return (
    <label className={rowClass(disabled)}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => {
          if (!disabled) onChange(event.target.checked)
        }}
        className={controlClass(disabled)}
      />
      {icon}
      {label}
    </label>
  )
}
