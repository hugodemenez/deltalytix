import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { VisibilityState, SortingState, ColumnFiltersState } from '@tanstack/react-table'

export interface TableColumnConfig {
  id: string
  title: string
  visible: boolean
  size: number
  order: number
}

export interface TableConfig {
  id: string
  columns: TableColumnConfig[]
  columnVisibility: VisibilityState
  sorting: SortingState
  columnFilters: ColumnFiltersState
  pageSize: number
  groupingGranularity: number
}

interface TableConfigState {
  tables: Record<string, TableConfig>
  // Actions
  setTableConfig: (tableId: string, config: Partial<TableConfig>) => void
  updateColumnVisibility: (tableId: string, columnId: string, visible: boolean) => void
  updateColumnVisibilityState: (tableId: string, visibility: VisibilityState) => void
  updateColumnSize: (tableId: string, columnId: string, size: number) => void
  updateColumnOrder: (tableId: string, columnId: string, order: number) => void
  updateSorting: (tableId: string, sorting: SortingState) => void
  updateColumnFilters: (tableId: string, filters: ColumnFiltersState) => void
  updatePageSize: (tableId: string, pageSize: number) => void
  updateGroupingGranularity: (tableId: string, granularity: number) => void
  resetTableConfig: (tableId: string) => void
  resetAllConfigs: () => void
  migrateOldColumns: () => void
}

// Default configuration for trade table
const defaultTradeTableConfig: TableConfig = {
  id: 'trade-table',
  columns: [
    { id: 'select', title: 'Select', visible: true, size: 40, order: 0 },
    { id: 'expand', title: 'Expand', visible: true, size: 40, order: 1 },
    { id: 'accounts', title: 'Accounts', visible: true, size: 120, order: 2 },
    { id: 'entryDate', title: 'Entry Date', visible: true, size: 120, order: 3 },
    { id: 'instrument', title: 'Instrument', visible: true, size: 120, order: 4 },
    { id: 'direction', title: 'Direction', visible: true, size: 100, order: 5 },
    { id: 'entryPrice', title: 'Entry Price', visible: true, size: 100, order: 6 },
    { id: 'closePrice', title: 'Exit Price', visible: true, size: 100, order: 7 },
    { id: 'timeInPosition', title: 'Position Time', visible: true, size: 120, order: 8 },
    { id: 'entryTime', title: 'Entry Time', visible: true, size: 100, order: 9 },
    { id: 'closeDate', title: 'Exit Time', visible: true, size: 100, order: 10 },
    { id: 'pnl', title: 'PnL', visible: true, size: 100, order: 11 },
    { id: 'commission', title: 'Commission', visible: true, size: 100, order: 12 },
    { id: 'quantity', title: 'Quantity', visible: true, size: 100, order: 13 },
    { id: 'ticksAndPoints', title: 'Ticks/Points', visible: true, size: 100, order: 14 },
    { id: 'image', title: 'Image', visible: true, size: 80, order: 15 },
    { id: 'tags', title: 'Tags', visible: true, size: 200, order: 16 },
    { id: 'comment', title: 'Comment', visible: true, size: 200, order: 17 },
    { id: 'videoUrl', title: 'Video URL', visible: true, size: 200, order: 18 },
  ],
  columnVisibility: {},
  sorting: [{ id: 'entryDate', desc: true }],
  columnFilters: [],
  pageSize: 10,
  groupingGranularity: 0,
}

export const useTableConfigStore = create<TableConfigState>()(
  persist(
    (set, get) => ({
      tables: {
        'trade-table': defaultTradeTableConfig,
      },

      // Migration function to handle old column references
      migrateOldColumns: () => {
        const state = get()
        const tradeTable = state.tables['trade-table']
        
        if (tradeTable) {
          // Check if old columns exist and migrate them
          const hasOldTicks = tradeTable.columns.some(col => col.id === 'ticks')
          const hasOldPoints = tradeTable.columns.some(col => col.id === 'points')
          
          if (hasOldTicks || hasOldPoints) {
            // Remove old columns and add the new combined column
            const updatedColumns = tradeTable.columns
              .filter(col => col.id !== 'ticks' && col.id !== 'points')
              .map(col => {
                // Adjust order for columns that came after the old columns
                if (col.order >= 14) {
                  return { ...col, order: col.order - 1 }
                }
                return col
              })
            
            // Add the new combined column
            updatedColumns.push({ 
              id: 'ticksAndPoints', 
              title: 'Ticks/Points', 
              visible: true, 
              size: 100, 
              order: 14 
            })
            
            // Sort by order
            updatedColumns.sort((a, b) => a.order - b.order)
            
            // Update column visibility to remove old columns
            const updatedVisibility = { ...tradeTable.columnVisibility }
            delete updatedVisibility['ticks']
            delete updatedVisibility['points']
            
            // Update sorting to remove old columns
            const updatedSorting = tradeTable.sorting.filter(sort => 
              sort.id !== 'ticks' && sort.id !== 'points'
            )
            
            // Update column filters to remove old columns
            const updatedFilters = tradeTable.columnFilters.filter(filter => 
              filter.id !== 'ticks' && filter.id !== 'points'
            )
            
            set({
              tables: {
                ...state.tables,
                'trade-table': {
                  ...tradeTable,
                  columns: updatedColumns,
                  columnVisibility: updatedVisibility,
                  sorting: updatedSorting,
                  columnFilters: updatedFilters,
                },
              },
            })
          }
        }
      },

      setTableConfig: (tableId, config) => set((state) => ({
        tables: {
          ...state.tables,
          [tableId]: {
            ...state.tables[tableId],
            ...config,
          },
        },
      })),

      updateColumnVisibility: (tableId, columnId, visible) => set((state) => {
        const table = state.tables[tableId]
        if (!table) return state

        return {
          tables: {
            ...state.tables,
            [tableId]: {
              ...table,
              columns: table.columns.map(col =>
                col.id === columnId ? { ...col, visible } : col
              ),
              columnVisibility: {
                ...table.columnVisibility,
                [columnId]: visible,
              },
            },
          },
        }
      }),

      updateColumnVisibilityState: (tableId, visibility) => set((state) => ({
        tables: {
          ...state.tables,
          [tableId]: {
            ...state.tables[tableId],
            columnVisibility: visibility,
          },
        },
      })),

      updateColumnSize: (tableId, columnId, size) => set((state) => {
        const table = state.tables[tableId]
        if (!table) return state

        return {
          tables: {
            ...state.tables,
            [tableId]: {
              ...table,
              columns: table.columns.map(col =>
                col.id === columnId ? { ...col, size } : col
              ),
            },
          },
        }
      }),

      updateColumnOrder: (tableId, columnId, order) => set((state) => {
        const table = state.tables[tableId]
        if (!table) return state

        return {
          tables: {
            ...state.tables,
            [tableId]: {
              ...table,
              columns: table.columns.map(col =>
                col.id === columnId ? { ...col, order } : col
              ),
            },
          },
        }
      }),

      updateSorting: (tableId, sorting) => set((state) => ({
        tables: {
          ...state.tables,
          [tableId]: {
            ...state.tables[tableId],
            sorting,
          },
        },
      })),

      updateColumnFilters: (tableId, filters) => set((state) => ({
        tables: {
          ...state.tables,
          [tableId]: {
            ...state.tables[tableId],
            columnFilters: filters,
          },
        },
      })),

      updatePageSize: (tableId, pageSize) => set((state) => ({
        tables: {
          ...state.tables,
          [tableId]: {
            ...state.tables[tableId],
            pageSize,
          },
        },
      })),

      updateGroupingGranularity: (tableId, granularity) => set((state) => ({
        tables: {
          ...state.tables,
          [tableId]: {
            ...state.tables[tableId],
            groupingGranularity: granularity,
          },
        },
      })),

      resetTableConfig: (tableId) => set((state) => {
        const defaultConfig = tableId === 'trade-table' ? defaultTradeTableConfig : state.tables[tableId]
        return {
          tables: {
            ...state.tables,
            [tableId]: defaultConfig,
          },
        }
      }),

      resetAllConfigs: () => set({
        tables: {
          'trade-table': defaultTradeTableConfig,
        },
      }),
    }),
    {
      name: 'table-config-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
) 