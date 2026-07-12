import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  hashVendorPassword,
  normalizeVendorPassword,
} from "../../../../../_utils/vendor-auth"
import {
  getMarketplaceService,
  recordOrNull,
} from "../../../../../_utils/vendors"

const MEMBER_STATUSES = ["active", "disabled"] as const

type MemberStatus = (typeof MEMBER_STATUSES)[number]

type VendorMemberUpdateBody = {
  status?: unknown
  member_password?: unknown
}

const serializeMember = (member: Record<string, any>) => ({
  id: member.id,
  user_id: member.user_id,
  email: member.email,
  role: member.role,
  status: member.status,
})

export async function PATCH(
  req: MedusaRequest<VendorMemberUpdateBody>,
  res: MedusaResponse
) {
  const marketplace = getMarketplaceService(req)
  const { id, member_id } = req.params
  const body = req.body ?? {}
  const vendor = await marketplace.retrieveVendor(id).catch(() => null)

  if (!vendor) {
    return res.status(404).json({
      message: "Vendor was not found.",
    })
  }

  const members = await marketplace.listVendorMembers({
    id: member_id,
    vendor_id: id,
  } as any)
  const member = members.find(
    (candidate) => candidate.id === member_id && candidate.vendor_id === id
  )

  if (!member) {
    return res.status(404).json({
      message: "Vendor member was not found.",
    })
  }

  const update: Record<string, unknown> = {
    id: member.id,
  }

  if (body.status !== undefined) {
    if (
      typeof body.status !== "string" ||
      !MEMBER_STATUSES.includes(body.status as MemberStatus)
    ) {
      return res.status(400).json({
        message: "Vendor member status is invalid.",
      })
    }

    update.status = body.status
  }

  const hasMemberPassword =
    body.member_password !== undefined &&
    body.member_password !== null &&
    body.member_password !== ""

  if (hasMemberPassword) {
    const password = normalizeVendorPassword(body.member_password)

    if (!password) {
      return res.status(400).json({
        message: "Vendor member password must be at least 8 characters.",
      })
    }

    update.metadata = {
      ...(recordOrNull(member.metadata) ?? {}),
      password_hash: hashVendorPassword(password),
    }
  }

  if (Object.keys(update).length === 1) {
    return res.status(400).json({
      message: "No supported vendor member fields were provided.",
    })
  }

  const updatedResult = await marketplace.updateVendorMembers([update] as any)
  const updated = Array.isArray(updatedResult) ? updatedResult[0] : updatedResult

  res.json({
    member: serializeMember(updated ?? { ...member, ...update }),
  })
}
