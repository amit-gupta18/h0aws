import type { ReactElement } from "react";
import type { InvoiceTemplate as InvoiceTemplateId } from "@prisma/client";
import { ClassicTemplate } from "./classic.js";
import type { InvoiceTemplateData } from "./types.js";

export type { InvoiceTemplateData, InvoiceTemplateItem } from "./types.js";

export type InvoiceTemplateComponent = (props: {
  data: InvoiceTemplateData;
}) => ReactElement;

// Maps a stored templateId to its renderer. Only CLASSIC is designed in V1;
// MODERN / COMPACT exist in the enum but resolve to CLASSIC until built.
const registry: Partial<Record<InvoiceTemplateId, InvoiceTemplateComponent>> = {
  CLASSIC: ClassicTemplate,
};

export function getTemplate(id: InvoiceTemplateId): InvoiceTemplateComponent {
  return registry[id] ?? ClassicTemplate;
}
