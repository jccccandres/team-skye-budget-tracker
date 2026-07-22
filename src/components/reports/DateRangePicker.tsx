import { useState } from 'react'
import { FormField, TextInput } from '../ui/FormField'
import { PrimaryButton, SecondaryButton } from '../ui/PageHeader'
import { REPORT_PRESET_LABELS, type ReportPreset } from '../../lib/format'

interface DateRangePickerProps {
  preset: ReportPreset | 'custom'
  start: string
  end: string
  onPresetChange: (preset: ReportPreset) => void
  onCustomChange: (start: string, end: string) => void
}

const presets: ReportPreset[] = ['thisMonth', 'lastMonth', 'thisYear', 'lastYear', 'allTime']

export function DateRangePicker({
  preset,
  start,
  end,
  onPresetChange,
  onCustomChange,
}: DateRangePickerProps) {
  const [showCustom, setShowCustom] = useState(preset === 'custom')
  const [customStart, setCustomStart] = useState(start)
  const [customEnd, setCustomEnd] = useState(end)

  function applyCustom() {
    if (!customStart || !customEnd || customStart > customEnd) return
    onCustomChange(customStart, customEnd)
  }

  return (
    <div className="mb-4">
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              setShowCustom(false)
              onPresetChange(p)
            }}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              preset === p
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800'
            }`}
          >
            {REPORT_PRESET_LABELS[p]}
          </button>
        ))}
        <SecondaryButton onClick={() => setShowCustom((v) => !v)}>
          {preset === 'custom' ? 'Custom ✓' : 'Custom'}
        </SecondaryButton>
      </div>

      {showCustom && (
        <div className="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
          <FormField label="From" htmlFor="report-custom-start">
            <TextInput
              id="report-custom-start"
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
            />
          </FormField>
          <FormField label="To" htmlFor="report-custom-end">
            <TextInput
              id="report-custom-end"
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
            />
          </FormField>
          <PrimaryButton onClick={applyCustom}>Apply</PrimaryButton>
        </div>
      )}
    </div>
  )
}
