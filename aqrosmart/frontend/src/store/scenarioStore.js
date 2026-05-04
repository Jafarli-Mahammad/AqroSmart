import { create } from 'zustand'

const useScenarioStore = create((set) => ({
  scenarios: [],
  activeScenarioSlug: 'healthy_field',
  activeScenarioName: 'Healthy Field',
  presentationMode: false,
  setScenarioState: ({ scenarios, activeScenarioSlug }) =>
    set(() => ({
      scenarios: Array.isArray(scenarios) ? scenarios : [],
      activeScenarioSlug: activeScenarioSlug || 'healthy_field',
      activeScenarioName:
        (Array.isArray(scenarios) && scenarios.find((scenario) => scenario.slug === activeScenarioSlug)?.name) ||
        (Array.isArray(scenarios) && scenarios[0]?.name) ||
        'Healthy Field',
    })),
  setActiveScenario: (scenarioSlug, scenarios = []) =>
    set((state) => ({
      activeScenarioSlug: scenarioSlug,
      activeScenarioName:
        scenarios.find((scenario) => scenario.slug === scenarioSlug)?.name ||
        state.scenarios.find((scenario) => scenario.slug === scenarioSlug)?.name ||
        state.activeScenarioName,
    })),
  setPresentationMode: (presentationMode) => set({ presentationMode: Boolean(presentationMode) }),
}))

export default useScenarioStore
