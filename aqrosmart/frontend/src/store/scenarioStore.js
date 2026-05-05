import { create } from 'zustand'
import { scenarioName } from '../constants/azText'

const useScenarioStore = create((set) => ({
  scenarios: [],
  activeScenarioSlug: 'healthy_field',
  activeScenarioName: 'Sağlam Sahə',
  presentationMode: false,
  setScenarioState: ({ scenarios, activeScenarioSlug }) =>
    set(() => ({
      scenarios: Array.isArray(scenarios) ? scenarios : [],
      activeScenarioSlug: activeScenarioSlug || 'healthy_field',
      activeScenarioName:
        scenarioName(
          activeScenarioSlug,
          (Array.isArray(scenarios) && scenarios.find((scenario) => scenario.slug === activeScenarioSlug)?.name) ||
            (Array.isArray(scenarios) && scenarios[0]?.name) ||
            'Sağlam Sahə',
        ),
    })),
  setActiveScenario: (scenarioSlug, scenarios = []) =>
    set((state) => ({
      activeScenarioSlug: scenarioSlug,
      activeScenarioName:
        scenarioName(
          scenarioSlug,
          scenarios.find((scenario) => scenario.slug === scenarioSlug)?.name ||
            state.scenarios.find((scenario) => scenario.slug === scenarioSlug)?.name ||
            state.activeScenarioName,
        ),
    })),
  setPresentationMode: (presentationMode) => set({ presentationMode: Boolean(presentationMode) }),
}))

export default useScenarioStore
