import { create } from 'zustand'

const useScenarioStore = create((set) => ({
  activeScenario: null,
  setActiveScenario: (scenario) => set({ activeScenario: scenario }),
}))

export default useScenarioStore
