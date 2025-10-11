import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { PlatformType } from "@/app/[locale]/dashboard/components/import/config/platforms"

export type ImportType = PlatformType

interface ImportTypePreferenceState {
  lastSelectedType: ImportType
  setLastSelectedType: (type: ImportType) => void
  resetPreference: () => void
}

const defaultImportType: ImportType = 'rithmic-sync'

export const useImportTypePreferenceStore = create<ImportTypePreferenceState>()(
  persist(
    (set) => ({
      lastSelectedType: defaultImportType,
      setLastSelectedType: (type) => set({ lastSelectedType: type }),
      resetPreference: () => set({ lastSelectedType: defaultImportType }),
    }),
    {
      name: "import-type-preference-store",
      storage: createJSONStorage(() => localStorage),
    }
  )
)
