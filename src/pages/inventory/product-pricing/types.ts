export type DraftUnit = {
  unit_code: string
  unit_name: string
  factor_to_base: number
  precision: number
  cost_price: number
  sale_price: number
  is_enabled: boolean
}

export type ProductDraft = {
  base: DraftUnit
  big_enabled: boolean
  big: DraftUnit
  warn?: string
}
