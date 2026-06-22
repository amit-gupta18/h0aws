import type { Request, Response } from "express";
import { MemberService } from "./member.service.js";
import { AddMemberSchema } from "./member.schema.js";
import { handleError } from "../common/errors.js";

export const MemberController = {
  // GET /api/v1/members — team roster for the active business
  async list(req: Request, res: Response): Promise<void> {
    try {
      const members = await MemberService.list(req.context!.businessId);
      res.json({ members });
    } catch (err) {
      handleError(err, res);
    }
  },

  // POST /api/v1/members — owner provisions a teammate
  async add(req: Request, res: Response): Promise<void> {
    const parsed = AddMemberSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    try {
      const member = await MemberService.addMember(req.context!.businessId, parsed.data);
      res.status(201).json({ member });
    } catch (err) {
      handleError(err, res);
    }
  },

  // DELETE /api/v1/members/:id — remove a teammate
  async remove(req: Request, res: Response): Promise<void> {
    try {
      const memberId = req.params["id"] as string;
      const result = await MemberService.removeMember(req.context!.businessId, memberId);
      res.json(result);
    } catch (err) {
      handleError(err, res);
    }
  },
};
