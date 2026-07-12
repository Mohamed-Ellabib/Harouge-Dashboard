import { defineRouteConfig } from "@medusajs/admin-sdk"
import { BuildingStorefront, PencilSquare, Plus, Trash } from "@medusajs/icons"
import {
  Badge,
  Button,
  Checkbox,
  Container,
  Heading,
  Input,
  Label,
  Table,
  Text,
  Textarea,
  Toaster,
  toast,
} from "@medusajs/ui"
import { FormEvent, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

type VendorStatus = "draft" | "active" | "suspended"

type VendorMember = {
  id: string
  user_id: string | null
  email: string
  role: "owner" | "manager"
  status: "active" | "disabled"
}

type Vendor = {
  id: string
  name: string
  handle: string
  status: VendorStatus
  contact_email: string | null
  logo_url: string | null
  primary_color: string | null
  product_count: number
  domains: {
    id: string
    domain: string
    is_primary: boolean
  }[]
  members: VendorMember[]
}

type VendorProduct = {
  id: string
  title: string
  handle: string
  status: string
  thumbnail: string | null
  assigned: boolean
}

type VendorFormState = {
  name: string
  handle: string
  status: VendorStatus
  contact_email: string
  logo_url: string
  primary_color: string
  domains: string
  members: string
  member_password: string
}

const emptyForm: VendorFormState = {
  name: "",
  handle: "",
  status: "draft",
  contact_email: "",
  logo_url: "",
  primary_color: "",
  domains: "",
  members: "",
  member_password: "",
}

const statusColor = (status: VendorStatus) => {
  if (status === "active") {
    return "green"
  }

  if (status === "suspended") {
    return "red"
  }

  return "grey"
}

const slugify = (value: string) => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

const getErrorMessage = async (response: Response) => {
  const fallback = `${response.status} ${response.statusText}`

  try {
    const data = await response.json()

    return data.message || fallback
  } catch {
    return fallback
  }
}

const VendorsSettingsPage = () => {
  const { t } = useTranslation()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [form, setForm] = useState<VendorFormState>(emptyForm)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [products, setProducts] = useState<VendorProduct[]>([])
  const [assignedProductIds, setAssignedProductIds] = useState<string[]>([])
  const [isProductsLoading, setIsProductsLoading] = useState(false)
  const [isProductsSaving, setIsProductsSaving] = useState(false)
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null)

  const selectedVendor = useMemo(() => {
    return vendors.find((vendor) => vendor.id === selectedId) ?? null
  }, [selectedId, vendors])

  const loadVendors = async () => {
    setIsLoading(true)

    try {
      const response = await fetch("/admin/vendors", {
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(await getErrorMessage(response))
      }

      const data = await response.json()
      setVendors(data.vendors ?? [])
    } catch (error) {
      toast.error(t("vendors.loadError"), {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadVendors()
  }, [])

  const loadVendorProducts = async (vendorId: string) => {
    setIsProductsLoading(true)

    try {
      const response = await fetch(`/admin/vendors/${vendorId}/products`, {
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(await getErrorMessage(response))
      }

      const data = await response.json()
      const loadedProducts = data.products ?? []

      setProducts(loadedProducts)
      setAssignedProductIds(
        loadedProducts
          .filter((product: VendorProduct) => product.assigned)
          .map((product: VendorProduct) => product.id)
      )
    } catch (error) {
      toast.error(t("vendors.products.loadError"), {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setIsProductsLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedId) {
      setProducts([])
      setAssignedProductIds([])
      return
    }

    loadVendorProducts(selectedId)
  }, [selectedId])

  const updateForm = (key: keyof VendorFormState, value: string) => {
    setForm((current) => {
      const next = {
        ...current,
        [key]: value,
      }

      if (key === "name" && !selectedId && !current.handle) {
        next.handle = slugify(value)
      }

      return next
    })
  }

  const resetForm = () => {
    setSelectedId(null)
    setForm(emptyForm)
  }

  const editVendor = (vendor: Vendor) => {
    setSelectedId(vendor.id)
    setForm({
      name: vendor.name ?? "",
      handle: vendor.handle ?? "",
      status: vendor.status ?? "draft",
      contact_email: vendor.contact_email ?? "",
      logo_url: vendor.logo_url ?? "",
      primary_color: vendor.primary_color ?? "",
      domains: vendor.domains.map((domain) => domain.domain).join("\n"),
      members: vendor.members.map((member) => member.email).join("\n"),
      member_password: "",
    })
  }

  const saveVendor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)

    try {
      const response = await fetch(
        selectedId ? `/admin/vendors/${selectedId}` : "/admin/vendors",
        {
          method: selectedId ? "PATCH" : "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: form.name,
            handle: form.handle,
            status: form.status,
            contact_email: form.contact_email,
            logo_url: form.logo_url,
            primary_color: form.primary_color,
            domains: form.domains,
            members: form.members,
            member_password: form.member_password,
          }),
        }
      )

      if (!response.ok) {
        throw new Error(await getErrorMessage(response))
      }

      const data = await response.json()

      setVendors((current) => {
        if (selectedId) {
          return current.map((vendor) =>
            vendor.id === selectedId ? data.vendor : vendor
          )
        }

        return [data.vendor, ...current]
      })

      toast.success(
        selectedId ? t("vendors.updated") : t("vendors.created")
      )
      resetForm()
    } catch (error) {
      toast.error(t("vendors.saveError"), {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setIsSaving(false)
    }
  }

  const deleteVendor = async (vendor: Vendor) => {
    setIsDeleting(vendor.id)

    try {
      const response = await fetch(`/admin/vendors/${vendor.id}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(await getErrorMessage(response))
      }

      setVendors((current) =>
        current.filter((candidate) => candidate.id !== vendor.id)
      )

      if (selectedId === vendor.id) {
        resetForm()
      }

      toast.success(t("vendors.deleted"))
    } catch (error) {
      toast.error(t("vendors.deleteError"), {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setIsDeleting(null)
    }
  }

  const toggleProductAssignment = (productId: string, checked: boolean) => {
    setAssignedProductIds((current) => {
      if (checked) {
        return current.includes(productId) ? current : [...current, productId]
      }

      return current.filter((candidate) => candidate !== productId)
    })
  }

  const saveProductAssignments = async () => {
    if (!selectedId) {
      return
    }

    setIsProductsSaving(true)

    try {
      const response = await fetch(`/admin/vendors/${selectedId}/products`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_ids: assignedProductIds,
        }),
      })

      if (!response.ok) {
        throw new Error(await getErrorMessage(response))
      }

      const data = await response.json()
      const nextIds = data.assigned_product_ids ?? []

      setAssignedProductIds(nextIds)
      setProducts((current) =>
        current.map((product) => ({
          ...product,
          assigned: nextIds.includes(product.id),
        }))
      )
      setVendors((current) =>
        current.map((vendor) =>
          vendor.id === selectedId
            ? {
                ...vendor,
                product_count: nextIds.length,
              }
            : vendor
        )
      )
      toast.success(t("vendors.products.saved"))
    } catch (error) {
      toast.error(t("vendors.products.saveError"), {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setIsProductsSaving(false)
    }
  }

  const updateVendorMemberStatus = async (
    member: VendorMember,
    status: VendorMember["status"]
  ) => {
    if (!selectedId) {
      return
    }

    setSavingMemberId(member.id)

    try {
      const response = await fetch(
        `/admin/vendors/${selectedId}/members/${member.id}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        }
      )

      if (!response.ok) {
        throw new Error(await getErrorMessage(response))
      }

      const data = await response.json()

      setVendors((current) =>
        current.map((vendor) =>
          vendor.id === selectedId
            ? {
                ...vendor,
                members: vendor.members.map((candidate) =>
                  candidate.id === data.member.id ? data.member : candidate
                ),
              }
            : vendor
        )
      )
      toast.success(t("vendors.membersPanel.saved"))
    } catch (error) {
      toast.error(t("vendors.membersPanel.saveError"), {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setSavingMemberId(null)
    }
  }

  return (
    <>
      <Toaster />
      <div className="flex flex-col gap-y-3">
        <Container className="divide-y p-0">
          <div className="flex items-center justify-between gap-x-4 px-6 py-4">
            <div>
              <Heading>{t("vendors.title")}</Heading>
              <Text className="text-ui-fg-subtle" size="small">
                {t("vendors.description")}
              </Text>
            </div>
            <Button size="small" variant="secondary" onClick={resetForm}>
              <Plus />
              {t("vendors.newVendor")}
            </Button>
          </div>

          <form className="grid gap-4 px-6 py-4" onSubmit={saveVendor}>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="grid gap-1.5">
                <Label htmlFor="vendor-name">{t("vendors.name")}</Label>
                <Input
                  id="vendor-name"
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                  placeholder="Maison Demo"
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="vendor-handle">{t("vendors.handle")}</Label>
                <Input
                  id="vendor-handle"
                  value={form.handle}
                  onChange={(event) => updateForm("handle", event.target.value)}
                  placeholder="maison-demo"
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="vendor-status">{t("vendors.status")}</Label>
                <select
                  id="vendor-status"
                  className="txt-compact-small h-8 rounded-md border border-ui-border-base bg-ui-bg-base px-2 text-ui-fg-base shadow-borders-base outline-none transition-fg focus:shadow-borders-interactive-with-active"
                  value={form.status}
                  onChange={(event) =>
                    updateForm("status", event.target.value)
                  }
                >
                  <option value="draft">{t("vendors.statuses.draft")}</option>
                  <option value="active">
                    {t("vendors.statuses.active")}
                  </option>
                  <option value="suspended">
                    {t("vendors.statuses.suspended")}
                  </option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="grid gap-1.5">
                <Label htmlFor="vendor-email">
                  {t("vendors.contactEmail")}
                </Label>
                <Input
                  id="vendor-email"
                  type="email"
                  value={form.contact_email}
                  onChange={(event) =>
                    updateForm("contact_email", event.target.value)
                  }
                  placeholder="owner@example.com"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="vendor-logo">{t("vendors.logoUrl")}</Label>
                <Input
                  id="vendor-logo"
                  value={form.logo_url}
                  onChange={(event) =>
                    updateForm("logo_url", event.target.value)
                  }
                  placeholder="https://..."
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="vendor-color">
                  {t("vendors.primaryColor")}
                </Label>
                <Input
                  id="vendor-color"
                  value={form.primary_color}
                  onChange={(event) =>
                    updateForm("primary_color", event.target.value)
                  }
                  placeholder="#111827"
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="vendor-domains">{t("vendors.domains")}</Label>
              <Textarea
                id="vendor-domains"
                value={form.domains}
                onChange={(event) =>
                  updateForm("domains", event.target.value)
                }
                placeholder={"store.example.com\nexample.com"}
                rows={3}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="vendor-members">{t("vendors.members")}</Label>
              <Textarea
                id="vendor-members"
                value={form.members}
                onChange={(event) =>
                  updateForm("members", event.target.value)
                }
                placeholder={t("vendors.membersPlaceholder")}
                rows={3}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="vendor-member-password">
                {t("vendors.memberPassword")}
              </Label>
              <Input
                id="vendor-member-password"
                type="password"
                autoComplete="new-password"
                value={form.member_password}
                onChange={(event) =>
                  updateForm("member_password", event.target.value)
                }
                placeholder={t("vendors.memberPasswordPlaceholder")}
              />
            </div>

            {selectedVendor && (
              <div className="grid gap-2 rounded-md border border-ui-border-base p-3">
                <div>
                  <Text weight="plus">
                    {t("vendors.membersPanel.title")}
                  </Text>
                  <Text className="text-ui-fg-subtle" size="small">
                    {t("vendors.membersPanel.description")}
                  </Text>
                </div>
                {!selectedVendor.members.length && (
                  <Text className="text-ui-fg-subtle" size="small">
                    {t("vendors.membersPanel.empty")}
                  </Text>
                )}
                {selectedVendor.members.map((member) => (
                  <div
                    className="flex flex-col gap-2 rounded-md border border-ui-border-base px-3 py-2 lg:flex-row lg:items-center lg:justify-between"
                    key={member.id}
                  >
                    <div className="min-w-0">
                      <Text className="truncate" weight="plus">
                        {member.email}
                      </Text>
                      <div className="mt-1 flex items-center gap-x-2">
                        <Badge
                          color={member.status === "active" ? "green" : "red"}
                          size="2xsmall"
                          rounded="full"
                        >
                          {t(`vendors.membersPanel.statuses.${member.status}`)}
                        </Badge>
                        <Text className="text-ui-fg-subtle" size="small">
                          {t(`vendors.membersPanel.roles.${member.role}`)}
                        </Text>
                      </div>
                    </div>
                    <Button
                      size="small"
                      variant="secondary"
                      type="button"
                      isLoading={savingMemberId === member.id}
                      onClick={() =>
                        updateVendorMemberStatus(
                          member,
                          member.status === "active" ? "disabled" : "active"
                        )
                      }
                    >
                      {member.status === "active"
                        ? t("vendors.membersPanel.disable")
                        : t("vendors.membersPanel.enable")}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between">
              <Text className="text-ui-fg-subtle" size="small">
                {selectedVendor
                  ? t("vendors.editing", { name: selectedVendor.name })
                  : t("vendors.createHint")}
              </Text>
              <div className="flex items-center gap-x-2">
                {selectedId && (
                  <Button
                    type="button"
                    size="small"
                    variant="secondary"
                    onClick={resetForm}
                  >
                    {t("vendors.cancel")}
                  </Button>
                )}
                <Button size="small" type="submit" isLoading={isSaving}>
                  {selectedId
                    ? t("vendors.saveChanges")
                    : t("vendors.createVendor")}
                </Button>
              </div>
            </div>
          </form>
        </Container>

        {selectedId && (
          <Container className="divide-y p-0">
            <div className="flex items-center justify-between gap-x-4 px-6 py-4">
              <div>
                <Heading level="h2">{t("vendors.products.title")}</Heading>
                <Text className="text-ui-fg-subtle" size="small">
                  {t("vendors.products.description")}
                </Text>
              </div>
              <Button
                size="small"
                type="button"
                isLoading={isProductsSaving}
                onClick={saveProductAssignments}
              >
                {t("vendors.products.save")}
              </Button>
            </div>
            <div className="px-6 py-4">
              {isProductsLoading && (
                <Text className="text-ui-fg-subtle" size="small">
                  {t("vendors.loading")}
                </Text>
              )}
              {!isProductsLoading && !products.length && (
                <Text className="text-ui-fg-subtle" size="small">
                  {t("vendors.products.empty")}
                </Text>
              )}
              {!isProductsLoading && products.length > 0 && (
                <div className="grid gap-y-2">
                  {products.map((product) => (
                    <label
                      className="flex items-center justify-between gap-x-3 rounded-md border border-ui-border-base px-3 py-2"
                      key={product.id}
                    >
                      <div className="min-w-0">
                        <Text weight="plus">{product.title}</Text>
                        <Text
                          className="truncate text-ui-fg-subtle"
                          size="small"
                        >
                          {product.handle || product.id}
                        </Text>
                      </div>
                      <Checkbox
                        checked={assignedProductIds.includes(product.id)}
                        onCheckedChange={(checked) =>
                          toggleProductAssignment(product.id, checked === true)
                        }
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>
          </Container>
        )}

        <Container className="overflow-hidden p-0">
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>{t("vendors.table.vendor")}</Table.HeaderCell>
                <Table.HeaderCell>{t("vendors.status")}</Table.HeaderCell>
                <Table.HeaderCell>
                  {t("vendors.table.domains")}
                </Table.HeaderCell>
                <Table.HeaderCell>
                  {t("vendors.table.products")}
                </Table.HeaderCell>
                <Table.HeaderCell>
                  {t("vendors.table.contact")}
                </Table.HeaderCell>
                <Table.HeaderCell className="w-[1%] text-right">
                  {t("vendors.table.actions")}
                </Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {isLoading && (
                <Table.Row>
                  <Table.Cell colSpan={6}>
                    <Text className="text-ui-fg-subtle" size="small">
                      {t("vendors.loading")}
                    </Text>
                  </Table.Cell>
                </Table.Row>
              )}
              {!isLoading && !vendors.length && (
                <Table.Row>
                  <Table.Cell colSpan={6}>
                    <div className="flex items-center gap-x-2 text-ui-fg-subtle">
                      <BuildingStorefront />
                      <Text size="small">{t("vendors.empty")}</Text>
                    </div>
                  </Table.Cell>
                </Table.Row>
              )}
              {!isLoading &&
                vendors.map((vendor) => (
                  <Table.Row key={vendor.id}>
                    <Table.Cell>
                      <div>
                        <Text weight="plus">{vendor.name}</Text>
                        <Text className="text-ui-fg-subtle" size="small">
                          {vendor.handle}
                        </Text>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge
                        color={statusColor(vendor.status)}
                        size="2xsmall"
                        rounded="full"
                      >
                        {t(`vendors.statuses.${vendor.status}`)}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Text className="max-w-[280px] truncate" size="small">
                        {vendor.domains.length
                          ? vendor.domains
                              .map((domain) => domain.domain)
                              .join(", ")
                          : t("vendors.noDomain")}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="small">
                        {t("vendors.products.assignedCount", {
                          count: vendor.product_count ?? 0,
                        })}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="small">
                        {vendor.contact_email || t("vendors.noContact")}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex justify-end gap-x-2">
                        <Button
                          size="small"
                          variant="transparent"
                          type="button"
                          onClick={() => editVendor(vendor)}
                        >
                          <PencilSquare />
                          {t("vendors.edit")}
                        </Button>
                        <Button
                          size="small"
                          variant="transparent"
                          type="button"
                          isLoading={isDeleting === vendor.id}
                          onClick={() => deleteVendor(vendor)}
                        >
                          <Trash />
                          {t("vendors.delete")}
                        </Button>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))}
            </Table.Body>
          </Table>
        </Container>
      </div>
    </>
  )
}

export const config = defineRouteConfig({
  label: "vendors.menu",
  icon: BuildingStorefront,
  translationNs: "translation",
})

export default VendorsSettingsPage
