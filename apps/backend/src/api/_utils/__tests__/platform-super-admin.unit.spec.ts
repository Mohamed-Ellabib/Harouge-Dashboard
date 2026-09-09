import { MedusaError } from "@medusajs/framework/utils"

import { GET as accessRoute } from "../../admin/saas/access/route"
import {
  getPlatformSuperAdminActor,
  requirePlatformSuperAdmin,
  resolvePlatformSuperAdminActor,
} from "../platform-super-admin"

const superAdmin = {
  id: "user_owner",
  email: "owner@example.test",
  first_name: "Platform",
  last_name: "Owner",
  rbac_roles: [{ id: "role_super_admin" }],
}

const requestWith = (data: unknown, actorType = "user") =>
  ({
    auth_context: {
      actor_id: "user_owner",
      actor_type: actorType,
    },
    scope: {
      resolve: jest.fn(() => ({
        graph: jest.fn().mockResolvedValue({ data }),
      })),
    },
  }) as any

const expectForbidden = async (promise: Promise<unknown>) => {
  try {
    await promise
    throw new Error("Expected Super Admin access to be denied.")
  } catch (error) {
    expect(error).toBeInstanceOf(MedusaError)
    expect((error as MedusaError).type).toBe(MedusaError.Types.FORBIDDEN)
  }
}

describe("platform Super Admin boundary", () => {
  it("allows exactly role_super_admin and returns an allowlisted actor", async () => {
    const req = requestWith([superAdmin])

    await expect(resolvePlatformSuperAdminActor(req)).resolves.toEqual({
      id: "user_owner",
      email: "owner@example.test",
      first_name: "Platform",
      last_name: "Owner",
      avatar_url: null,
    })
  })

  it("denies authenticated users with any other role", async () => {
    await expectForbidden(
      resolvePlatformSuperAdminActor(
        requestWith([
          {
            ...superAdmin,
            rbac_roles: [{ id: "role_merchant_owner" }],
          },
        ]),
      ),
    )
  })

  it("denies non-user actors, malformed role results, and graph failures", async () => {
    await expectForbidden(
      resolvePlatformSuperAdminActor(requestWith([superAdmin], "customer")),
    )
    await expectForbidden(
      resolvePlatformSuperAdminActor(
        requestWith([{ ...superAdmin, rbac_roles: null }]),
      ),
    )

    const failedQuery = requestWith([superAdmin])
    failedQuery.scope.resolve = jest.fn(() => ({
      graph: jest.fn().mockRejectedValue(new Error("database unavailable")),
    }))
    await expect(resolvePlatformSuperAdminActor(failedQuery)).rejects.toMatchObject({ type: MedusaError.Types.UNEXPECTED_STATE })
  })

  it("attaches the verified actor and exposes only the access response contract", async () => {
    const req = requestWith([superAdmin])
    const next = jest.fn()

    await requirePlatformSuperAdmin(req, {} as any, next)
    expect(next).toHaveBeenCalledWith()
    expect(getPlatformSuperAdminActor(req)).toEqual({
      id: "user_owner",
      email: "owner@example.test",
      first_name: "Platform",
      last_name: "Owner",
      avatar_url: null,
    })

    const state: { status?: number; body?: unknown } = {}
    const res = {
      status: jest.fn((status: number) => {
        state.status = status
        return res
      }),
      json: jest.fn((body: unknown) => {
        state.body = body
        return res
      }),
      setHeader: jest.fn(),
    } as any

    await accessRoute(req, res)

    expect(state.status).toBe(200)
    expect(state.body).toEqual({
      authorized: true,
      actor: {
        id: "user_owner",
        email: "owner@example.test",
        first_name: "Platform",
        last_name: "Owner",
        avatar_url: null,
      },
    })
    expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store")
    expect(JSON.stringify(state.body)).not.toMatch(/rbac|role|password|metadata/i)
  })

  it("does not let the access route run without the guard context", async () => {
    const req = requestWith([superAdmin])

    await expectForbidden(accessRoute(req, {} as any))
  })
})
