export type Role = 'OWNER' | 'ACCOUNTANT' | 'VIEWER'

export type Membership = {
  businessId: string
  tradeName: string
  role: Role
}
