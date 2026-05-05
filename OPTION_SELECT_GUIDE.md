# OptionSelect Component - Implementation Guide

## Quick Reference

### Basic Usage

```jsx
import OptionSelect from '../components/common/OptionSelect'

export default function MyPage() {
  const [selectedValue, setSelectedValue] = useState('')
  
  const options = [
    { value: '1', label: 'Option A' },
    { value: '2', label: 'Option B' },
    { value: '3', label: 'Option C' },
  ]

  return (
    <OptionSelect
      value={selectedValue}
      onChange={setSelectedValue}
      options={options}
      placeholder="Bir seçim edin"
    />
  )
}
```

---

## Real-World Examples from Codebase

### Example 1: TopBar Scenario Selector

**File:** `src/components/layout/TopBar.jsx`

```jsx
const scenarios = useScenarioStore((state) => state.scenarios)
const activeScenarioSlug = useScenarioStore((state) => state.activeScenarioSlug)
const setActiveScenario = useScenarioStore((state) => state.setActiveScenario)

<OptionSelect
  className="min-w-48"
  value={activeScenarioSlug}
  onChange={(next) => handleScenarioChange({ target: { value: next } })}
  disabled={isSwitching}
  options={(scenarios.length ? scenarios : []).map((scenario) => ({
    value: scenario.slug,
    label: scenarioName(scenario.slug, scenario.name),
  }))}
/>
```

**Key Points:**
- Uses Zustand state management
- Maps array to options format
- Disabled during async operation
- Custom label formatter

---

### Example 2: Farms Region Filter

**File:** `src/pages/Farms.jsx`

```jsx
const [regionFilter, setRegionFilter] = useState('all')
const regions = useMemo(
  () => [...new Set(farms.map((farm) => farm.region).filter(Boolean))],
  [farms]
)

<OptionSelect
  value={regionFilter}
  onChange={setRegionFilter}
  options={[
    { value: 'all', label: 'Hamısı' },
    ...regions.map((region) => ({ value: region, label: region }))
  ]}
/>
```

**Key Points:**
- Simple state management with `useState`
- "All" option as default
- Dynamic options from data
- Real-time filtering

---

### Example 3: CreditScoring Farmer Selector

**File:** `src/pages/CreditScoring.jsx`

```jsx
const [selectedFarmerId, setSelectedFarmerId] = useState('')

const farmerOptions = useMemo(() => {
  const farmerMap = new Map()
  farms.forEach((farm) => {
    if (!farmerMap.has(farm.farmer_id)) {
      farmerMap.set(farm.farmer_id, {
        farmer_id: farm.farmer_id,
        farmer_name: farm.farmer_name,
        // ... other fields
      })
    } else {
      farmerMap.get(farm.farmer_id).total_farms += 1
    }
  })
  return [...farmerMap.values()]
}, [farms])

<OptionSelect
  value={selectedFarmerId}
  onChange={setSelectedFarmerId}
  options={farmerOptions.map((farmer) => ({
    value: String(farmer.farmer_id),
    label: farmer.farmer_name
  }))}
/>
```

**Key Points:**
- Data deduplication with Map
- String value coercion
- Triggers API call on change via useEffect

---

### Example 4: PlantHealth Field Selector

**File:** `src/pages/PlantHealth.jsx`

```jsx
const [selectedFieldId, setSelectedFieldId] = useState('')
const [fields, setFields] = useState([])

<OptionSelect
  value={selectedFieldId}
  onChange={setSelectedFieldId}
  options={fields.map((field) => ({
    value: String(field.id),
    label: field.label
  }))}
/>
```

**Key Points:**
- Minimal state required
- Coordinates with file upload logic
- Field ID passed to analysis API

---

### Example 5: Disabled During Loading

**File:** `src/pages/SubsidyEngine.jsx`

```jsx
const [fetchingRecommendation, setFetchingRecommendation] = useState(false)

<OptionSelect
  value={selectedFieldId}
  onChange={setSelectedFieldId}
  options={fields.map((field) => ({ value: String(field.id), label: field.label }))}
  disabled={fetchingRecommendation}
/>
```

**Key Points:**
- Disabled state during async operations
- Visual feedback (opacity 60%)
- Cursor changes to not-allowed

---

## Component Architecture

### Props Breakdown

```typescript
interface OptionSelectProps {
  // Required
  options: Array<{ value: string | number; label: string }>
  value: string | number
  onChange: (value: string | number) => void
  
  // Optional
  disabled?: boolean
  placeholder?: string
  className?: string
  menuClassName?: string
}
```

### Internal State

```javascript
const [open, setOpen] = useState(false)
// Tracks if dropdown menu is open/closed

const rootRef = useRef(null)
// Ref for detecting outside clicks

const normalized = useMemo(() => normalizeOptions(options), [options])
// Memoized normalized options to prevent re-creation

const selected = normalized.find((item) => String(item.value) === String(value))
// Currently selected option object
```

### Key Hooks

```javascript
// 1. useMemo for option normalization
const normalized = useMemo(() => normalizeOptions(options), [options])

// 2. useRef for outside click detection
const rootRef = useRef(null)

// 3. useEffect for event listener cleanup
useEffect(() => {
  function handleOutside(event) { /* ... */ }
  document.addEventListener('mousedown', handleOutside)
  return () => document.removeEventListener('mousedown', handleOutside)
}, [])
```

---

## Styling Deep Dive

### Trigger Button

```jsx
className={[
  // Layout
  'flex min-h-[46px] w-full items-center justify-between rounded-2xl',
  
  // Border & Background
  'border border-emerald-300/90 bg-gradient-to-b from-white to-emerald-50/40 px-3 py-2',
  
  // Shadow & Transitions
  'text-left shadow-sm transition-all',
  
  // Hover State
  'hover:border-emerald-500 hover:shadow-md',
  
  // Focus State
  'focus:outline-none focus:ring-4 focus:ring-emerald-200/80',
  
  // Disabled State
  disabled ? 'cursor-not-allowed opacity-60' : '',
].join(' ')}
```

### Menu Panel

```jsx
className={[
  // Position & Overflow
  'absolute z-50 mt-2 max-h-72 w-full overflow-auto',
  
  // Appearance
  'rounded-2xl border border-emerald-200 bg-white/95',
  
  // Effects
  'p-1 shadow-[0_16px_40px_rgba(15,23,42,0.2)] backdrop-blur',
  
  menuClassName,
].join(' ')}
```

### Menu Items

```jsx
className={[
  // Layout
  'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[15px]',
  
  // Animation
  'transition',
  
  // States
  isSelected
    ? 'bg-emerald-600 text-white'
    : 'text-slate-800 hover:bg-emerald-50',
].join(' ')}
```

---

## Integration Patterns

### Pattern 1: Form Control

```jsx
const [formData, setFormData] = useState({
  region: '',
  crop: '',
  season: '',
})

function handleChange(field, value) {
  setFormData(prev => ({ ...prev, [field]: value }))
}

return (
  <form>
    <OptionSelect
      value={formData.region}
      onChange={(v) => handleChange('region', v)}
      options={regionOptions}
    />
  </form>
)
```

### Pattern 2: API Dependency

```jsx
const [selectedId, setSelectedId] = useState('')
const [data, setData] = useState(null)
const [loading, setLoading] = useState(false)

useEffect(() => {
  if (!selectedId) return
  
  setLoading(true)
  client.get(`/api/endpoint/${selectedId}`)
    .then(res => setData(res.data))
    .finally(() => setLoading(false))
}, [selectedId])

return (
  <>
    <OptionSelect
      value={selectedId}
      onChange={setSelectedId}
      options={items}
      disabled={loading}
    />
    {data && <Display data={data} />}
  </>
)
```

### Pattern 3: State Management (Zustand)

```jsx
const { activeValue, setActive } = useStore(
  (state) => ({
    activeValue: state.activeValue,
    setActive: state.setActive,
  })
)

return (
  <OptionSelect
    value={activeValue}
    onChange={(value) => setActive(value)}
    options={storeOptions}
  />
)
```

### Pattern 4: Filtering/Search

```jsx
const [filterValue, setFilterValue] = useState('')
const filtered = useMemo(() => {
  return allItems.filter(item => {
    if (filterValue === 'all') return true
    return item.category === filterValue
  })
}, [allItems, filterValue])

return (
  <OptionSelect
    value={filterValue}
    onChange={setFilterValue}
    options={[
      { value: 'all', label: 'Hamısı' },
      ...categories.map(cat => ({
        value: cat,
        label: cat
      }))
    ]}
  />
)
```

---

## Common Patterns in AqroSmart

### Pattern: Mapping Complex Objects

```jsx
// ✓ USED: Map objects to {value, label} format
<OptionSelect
  options={scenarios.map((scenario) => ({
    value: scenario.slug,
    label: scenarioName(scenario.slug, scenario.name),
  }))}
/>

// ✓ USED: Add default/empty option
<OptionSelect
  options={[
    { value: 'all', label: 'Hamısı' },
    ...regions.map((region) => ({
      value: region,
      label: region,
    }))
  ]}
/>

// ✓ USED: De-duplicate options with Map
const uniqueFarmers = new Map()
farms.forEach(farm => {
  if (!uniqueFarmers.has(farm.farmer_id)) {
    uniqueFarmers.set(farm.farmer_id, farm)
  }
})
```

### Pattern: Async Loading

```jsx
// ✓ USED: Disable during loading
<OptionSelect
  disabled={loadingFields}
  options={fields}
/>

// ✓ USED: Loading state with skeleton
if (loading) return <SkeletonLoader />

// ✓ USED: Error handling
if (!options.length) return <ErrorCard message="No options" />
```

### Pattern: Value Coercion

```jsx
// ✓ USED: Always String value
value={String(farm.id)}

// ✓ USED: Type-safe comparison
const selected = normalized.find((item) => 
  String(item.value) === String(value)
)
```

---

## Troubleshooting

### Issue: Value not updating

**Solution:** Ensure onChange callback updates parent state
```jsx
const [value, setValue] = useState('')
<OptionSelect
  value={value}
  onChange={setValue}  // ✓ Correct
  // onChange={(v) => console.log(v)}  // ✗ Wrong - doesn't update state
/>
```

### Issue: Menu not closing

**Solution:** Check outside click handler isn't blocked
```jsx
// ✓ Correct - listener on document.mousedown
document.addEventListener('mousedown', handleOutside)

// ✗ Wrong - listener on document.click can be blocked
document.addEventListener('click', handleOutside)
```

### Issue: Options not showing

**Solution:** Verify options format
```jsx
// ✓ Correct
options={[{ value: '1', label: 'A' }]}

// ✗ Wrong
options={['A', 'B']}  // Works but confusing

// ✓ Will auto-normalize
options={['A', 'B']}  // Auto-converted to {value, label}
```

### Issue: Selected item not highlighted

**Solution:** Ensure value types match
```jsx
// ✓ Correct - both strings
value="1"
options={[{ value: '1', label: 'A' }]}

// ✗ Wrong - number vs string
value={1}
options={[{ value: '1', label: 'A' }]}  // Will work but relies on String() coercion
```

---

## Performance Optimization

### Memoize Options

```jsx
const options = useMemo(() => {
  return scenarios.map((s) => ({
    value: s.slug,
    label: s.name,
  }))
}, [scenarios])  // Only re-create when scenarios change

<OptionSelect options={options} />
```

### Memoize Callbacks

```jsx
const handleChange = useCallback((value) => {
  // API call or state update
  client.post(`/api/set/${value}`)
}, [])  // Stable reference

<OptionSelect onChange={handleChange} />
```

### useTransition for Large Lists

```jsx
import { useTransition } from 'react'

const [, startTransition] = useTransition()

function handleChange(value) {
  startTransition(() => {
    // Heavy state update
    setSelectedValue(value)
  })
}
```

---

## Testing Examples

### Unit Test (Vitest)

```javascript
import { render, screen, fireEvent } from '@testing-library/react'
import OptionSelect from './OptionSelect'

describe('OptionSelect', () => {
  it('renders with placeholder', () => {
    render(
      <OptionSelect
        value=""
        onChange={() => {}}
        options={[]}
        placeholder="Select..."
      />
    )
    expect(screen.getByText('Select...')).toBeInTheDocument()
  })

  it('opens menu on click', () => {
    const options = [{ value: '1', label: 'Option 1' }]
    render(
      <OptionSelect value="" onChange={() => {}} options={options} />
    )
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Option 1')).toBeVisible()
  })

  it('calls onChange when option selected', () => {
    const onChange = vi.fn()
    const options = [{ value: 'a', label: 'Option A' }]
    render(
      <OptionSelect value="" onChange={onChange} options={options} />
    )
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('Option A'))
    expect(onChange).toHaveBeenCalledWith('a')
  })
})
```

---

## Browser Support

- ✓ Chrome/Edge (latest)
- ✓ Firefox (latest)
- ✓ Safari (14+)
- ✓ Mobile browsers (iOS Safari, Chrome Android)

**Note:** Requires `flexbox` and `CSS transitions` support (99%+ of users)

---

*Last Updated: 2026-05-05*
