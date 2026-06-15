'use client'

interface AnxietySliderProps {
  value: number
  onChange: (val: number) => void
}

export function AnxietySlider({ value, onChange }: AnxietySliderProps) {
  const labels = [
    { text: '完全不焦虑', emoji: '😊' },
    { text: '', emoji: '' },
    { text: '', emoji: '' },
    { text: '', emoji: '' },
    { text: '', emoji: '' },
    { text: '中等', emoji: '😐' },
    { text: '', emoji: '' },
    { text: '', emoji: '' },
    { text: '', emoji: '' },
    { text: '', emoji: '' },
    { text: '非常焦虑', emoji: '😰' },
  ]

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">焦虑强度（可选）</span>
        <span className={`text-lg font-bold ${
          value >= 8 ? 'text-red-500' : value >= 5 ? 'text-amber-600' : 'text-gray-400'
        }`}>
          {value}/10 {value >= 8 ? '⚠️ 极高' : ''}
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none bg-gray-200 accent-amber-600
          [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:shadow-md"
      />

      <div className="flex justify-between text-xs text-gray-300 px-1">
        <span>0 😊</span>
        <span>5 😐</span>
        <span>10 😰</span>
      </div>
    </div>
  )
}
