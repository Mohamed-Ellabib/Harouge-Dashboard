import { randomBytes, randomUUID } from "node:crypto"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createUserAccountWorkflow } from "@medusajs/core-flows"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"

jest.setTimeout(180_000)
const env = { NODE_ENV: "test", JWT_SECRET: randomBytes(32).toString("hex"), COOKIE_SECRET: randomBytes(32).toString("hex"), MEDUSA_FF_RBAC: "true" }
Object.assign(process.env, env)
const cookies = (response: any) => (response.headers["set-cookie"] ?? []) as string[]
const cookie = (response: any, name: string) => cookies(response).find(value => value.startsWith(`${name}=`))?.split(";")[0] ?? ""

medusaIntegrationTestRunner({ cwd: process.cwd(), env, testSuite: ({ api, getContainer }) => {
  it("remembers only authorized devices, restores without any server session, and revokes expired/reset/logged-out access", async () => {
    api.defaults.validateStatus = () => true
    const container = getContainer()
    const db: any = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const auth: any = container.resolve(Modules.AUTH)
    const users: any = container.resolve(Modules.USER)
    const createActor = async (roles: string[]) => {
      const email = `device-${randomUUID()}@example.test`
      const password = randomBytes(24).toString("base64url")
      const registered = await auth.register("emailpass", { body: { email, password } })
      const result = await createUserAccountWorkflow(container).run({ input: { authIdentityId: registered.authIdentity.id, userData: { email, roles } } })
      const loggedIn = await api.post("/auth/user/emailpass", { email, password })
      expect(loggedIn.status).toBe(200)
      return { email, password, userId: result.result.id, headers: { Authorization: `Bearer ${loggedIn.data.token}` } }
    }
    const admin = await createActor(["role_super_admin"])
    const ordinary = await createActor([])
    const issue = () => api.post("/auth/platform-session", { remember: true }, { headers: admin.headers })
    expect((await api.post("/auth/platform-session", { remember: true })).status).toBe(401)
    expect((await api.post("/auth/platform-session", { remember: true }, { headers: ordinary.headers })).status).toBe(403)
    expect((await api.post("/auth/platform-session", { remember: true }, { headers: { ...admin.headers, Origin: "https://untrusted.example" } })).status).toBe(403)
    const issued = await issue()
    expect(issued.status).toBe(200)
    const remembered = cookie(issued, "labibtech.platform-device")
    expect(Boolean(remembered)).toBe(true)
    const attributes = cookies(issued).find(value => value.startsWith("labibtech.platform-device=")) ?? ""
    expect(attributes.includes("HttpOnly") && attributes.includes("SameSite=Lax") && attributes.includes("Max-Age=2592000")).toBe(true)
    const saved = await db("platform_device_session").first()
    expect(saved.token_hash === remembered.split("=")[1]).toBe(false)
    expect(saved.credential_fingerprint === admin.password).toBe(false)
    // No connect.sid is sent: exactly the lost-memory/browser-reopen recovery path.
    const restored = await api.get("/auth/platform-session", { headers: { Cookie: remembered } })
    expect(restored.status).toBe(200)
    expect(restored.data.actor.id).toBe(admin.userId)
    const session = cookie(restored, "connect.sid")
    expect((await api.get("/admin/saas/access", { headers: { Cookie: session } })).status).toBe(200)
    const anotherRestore = await api.get("/auth/platform-session", { headers: { Cookie: remembered } })
    expect(anotherRestore.status).toBe(200)
    expect((await api.delete("/auth/platform-session", { headers: { Cookie: `${remembered}; ${session}` } })).status).toBe(200)
    expect((await db("platform_device_session")).length).toBe(0)
    expect((await api.get("/auth/platform-session", { headers: { Cookie: remembered } })).status).toBe(401)
    expect((await api.get("/admin/saas/access", { headers: { Cookie: cookie(anotherRestore, "connect.sid") } })).status).toBe(403)
    const unremembered = await api.post("/auth/platform-session", { remember: false }, { headers: admin.headers })
    expect(unremembered.status).toBe(200)
    expect(cookies(unremembered).filter(value => value.startsWith("connect.sid=")).every(value => !value.includes("Expires="))).toBe(true)
    expect((await db("platform_device_session")).length).toBe(0)
    const expired = cookie(await issue(), "labibtech.platform-device")
    await db("platform_device_session").update({ expires_at: new Date(Date.now() - 1000) })
    expect((await api.get("/auth/platform-session", { headers: { Cookie: expired } })).status).toBe(401)
    const disabled = cookie(await issue(), "labibtech.platform-device")
    await users.updateUsers({ id: admin.userId, metadata: { platform_access_status: "disabled" } })
    expect((await api.get("/auth/platform-session", { headers: { Cookie: disabled } })).status).toBe(403)
    await users.updateUsers({ id: admin.userId, metadata: { platform_access_status: "active" } })
    const reset = cookie(await issue(), "labibtech.platform-device")
    await auth.updateProvider("emailpass", { entity_id: admin.email, password: randomBytes(24).toString("base64url") })
    expect((await api.get("/auth/platform-session", { headers: { Cookie: reset } })).status).toBe(401)
    const oldLogout = await issue()
    expect((await api.delete("/auth/session", { headers: { Cookie: `${cookie(oldLogout, "labibtech.platform-device")}; ${cookie(oldLogout, "connect.sid")}` } })).status).toBe(200)
    expect((await api.get("/auth/platform-session", { headers: { Cookie: cookie(oldLogout, "labibtech.platform-device") } })).status).toBe(401)
  })
} })
