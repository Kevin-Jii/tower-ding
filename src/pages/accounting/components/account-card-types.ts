export type AccountCardLine = {
  key: string
  name: string
  meta: string
}

export type AccountCardTag = {
  key: string
  name: string
  style: string
}

export type AccountCardViewModel = {
  title: string
  platformIcon: string
  channel: string
  amount: string
  paymentLabel: string
  unpaid: boolean
  operator: string
  createdAt: string
  lines: AccountCardLine[]
  tags: AccountCardTag[]
  canBindConsumables: boolean
  canEdit: boolean
  canConfigure: boolean
}
