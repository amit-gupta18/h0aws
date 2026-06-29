import { prisma } from "../lib/prisma.js";
import { generateGstInsight } from "../lib/gst-insight.js";
import type { GstExportQuery, GstPeriodQuery } from "./gst.schema.js";
import { buildCsv, buildGstSummary } from "./gst.aggregate.js";

export const GstService = {
  async summary(businessId: string, query: GstPeriodQuery) {
    const business = await prisma.business.findUniqueOrThrow({
      where: { id: businessId },
      select: { tradeName: true },
    });

    const data = await buildGstSummary(businessId, query, business.tradeName);
    const aiInsight = await generateGstInsight(data, business.tradeName);

    return { ...data, aiInsight };
  },

  async exportCsv(businessId: string, query: GstExportQuery) {
    const business = await prisma.business.findUniqueOrThrow({
      where: { id: businessId },
      select: { tradeName: true },
    });

    const data = await buildGstSummary(businessId, query, business.tradeName);
    const csv = buildCsv(query.type, data);
    const filename = `${query.type}_${query.year}-${String(query.month).padStart(2, "0")}.csv`;

    return { csv, filename };
  },
};
