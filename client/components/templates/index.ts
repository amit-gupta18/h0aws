import type { ReactElement } from 'react'
import { ClassicTemplate } from './Classic'
import type { InvoiceTemplateData, InvoiceTemplateId } from './types'

export type {
  InvoiceTemplateData,
  InvoiceTemplateItem,
  InvoiceTemplateId,
} from './types'

export type InvoiceTemplateComponent = (props: {
  data: InvoiceTemplateData
}) => ReactElement

// Mirrors server/src/invoices/templates/index.ts. Only CLASSIC is designed in
// V1; MODERN / COMPACT resolve to CLASSIC until their designs are built.
const registry: Partial<Record<InvoiceTemplateId, InvoiceTemplateComponent>> = {
  CLASSIC: ClassicTemplate,
}

export function getTemplate(id: InvoiceTemplateId): InvoiceTemplateComponent {
  return registry[id] ?? ClassicTemplate
}
