export interface FilterItem {
  type: 'account' | 'instrument' | 'propfirm'
  value: string
}

export interface PropfirmGroup {
  name: string
  prefix: string
}