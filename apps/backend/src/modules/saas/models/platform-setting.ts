import { model } from "@medusajs/framework/utils"

const PlatformSetting = model
  .define("platform_setting", {
    id: model.id({ prefix: "pltset" }).primaryKey(),
    scope: model.text().default("system"),
    values: model.json(),
    revision: model.number().default(1),
    updated_by: model.text().nullable(),
  })
  .indexes([
    {
      on: ["scope"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ])

export default PlatformSetting
