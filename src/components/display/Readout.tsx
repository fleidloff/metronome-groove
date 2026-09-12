export function Readout({
  htmlFor,
  value,
  unit,
}: {
  htmlFor?: string
  value: string | number
  unit?: string
}) {
  return (
    <output htmlFor={htmlFor} className="flex items-baseline gap-3 tabular-nums">
      <span className="text-8xl font-bold leading-none sm:text-9xl">{value}</span>
      {unit ? (
        <>
          {' '}
          <span className="text-3xl text-muted">{unit}</span>
        </>
      ) : null}
    </output>
  )
}
