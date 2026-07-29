import {
  commerceFulfillmentSetName,
  commerceServiceZoneName,
} from "../commerce-readiness-contract"
import {
  hasExactCommerceShippingOptionPrices,
  hasExactCommerceShippingOptionRules,
  validateCommerceFulfillmentSet,
} from "../commerce-readiness-resources"

const storeProfileId = "stprof_01READINESS"

const fulfillmentSet = (geoZones: Record<string, unknown>[]) => ({
  id: "fuset_store",
  name: commerceFulfillmentSetName(storeProfileId),
  type: "shipping",
  service_zones: [
    {
      id: "serzo_store",
      name: commerceServiceZoneName(storeProfileId),
      geo_zones: geoZones,
    },
  ],
})

describe("commerce readiness resource isolation", () => {
  it("accepts only the deterministic Store set and exact country zone", () => {
    expect(
      validateCommerceFulfillmentSet(
        fulfillmentSet([{ type: "country", country_code: "ly" }]),
        ["ly"],
        storeProfileId,
      ),
    ).toMatchObject({ id: "serzo_store" })
  })

  it("rejects a fulfillment set or service zone named for another Store", () => {
    expect(() =>
      validateCommerceFulfillmentSet(
        {
          ...fulfillmentSet([{ type: "country", country_code: "ly" }]),
          name: commerceFulfillmentSetName("stprof_OTHER"),
        },
        ["ly"],
        storeProfileId,
      ),
    ).toThrow(/structurally incompatible/i)

    const wrongZone = fulfillmentSet([
      { type: "country", country_code: "ly" },
    ])
    wrongZone.service_zones[0].name = commerceServiceZoneName("stprof_OTHER")

    expect(() =>
      validateCommerceFulfillmentSet(wrongZone, ["ly"], storeProfileId),
    ).toThrow(/structurally incompatible/i)
  })

  it("rejects non-country, malformed, and duplicate geographic zones", () => {
    expect(() =>
      validateCommerceFulfillmentSet(
        fulfillmentSet([
          { type: "country", country_code: "ly" },
          {
            type: "province",
            country_code: "ly",
            province_code: "ly-tb",
          },
        ]),
        ["ly"],
        storeProfileId,
      ),
    ).toThrow(/countries are incompatible/i)

    expect(() =>
      validateCommerceFulfillmentSet(
        fulfillmentSet([{ type: "country", country_code: "" }]),
        ["ly"],
        storeProfileId,
      ),
    ).toThrow(/countries are incompatible/i)

    expect(() =>
      validateCommerceFulfillmentSet(
        fulfillmentSet([
          { type: "country", country_code: "ly" },
          { type: "country", country_code: "ly" },
        ]),
        ["ly"],
        storeProfileId,
      ),
    ).toThrow(/countries are incompatible/i)
  })

  it("accepts only the exact normalized Shipping Option rule set", () => {
    const exactRules = [
      { attribute: "enabled_in_store", operator: "eq", value: "true" },
      { attribute: "is_return", operator: "eq", value: "false" },
    ]

    expect(hasExactCommerceShippingOptionRules(exactRules)).toBe(true)
    expect(
      hasExactCommerceShippingOptionRules([
        ...exactRules,
        { attribute: "customer_group_id", operator: "eq", value: "cg_bad" },
      ]),
    ).toBe(false)
    expect(
      hasExactCommerceShippingOptionRules([
        exactRules[0],
        { attribute: "is_return", operator: "eq", value: "true" },
      ]),
    ).toBe(false)
  })

  it("accepts only one base price and one exact Region price", () => {
    const exactPrices = [
      {
        currency_code: "lyd",
        amount: 500,
        min_quantity: null,
        max_quantity: null,
        price_list_id: null,
        price_rules: [],
      },
      {
        currency_code: "lyd",
        amount: 500,
        min_quantity: null,
        max_quantity: null,
        price_list_id: null,
        price_rules: [
          {
            attribute: "region_id",
            operator: "eq",
            value: "reg_store",
            priority: 0,
          },
        ],
      },
    ]

    expect(
      hasExactCommerceShippingOptionPrices(
        exactPrices,
        "lyd",
        "reg_store",
        500,
      ),
    ).toBe(true)
    expect(
      hasExactCommerceShippingOptionPrices(
        [
          ...exactPrices,
          { currency_code: "usd", amount: 1, price_rules: [] },
        ],
        "lyd",
        "reg_store",
        500,
      ),
    ).toBe(false)
    expect(
      hasExactCommerceShippingOptionPrices(
        [
          exactPrices[0],
          {
            ...exactPrices[1],
            price_rules: [
              ...exactPrices[1].price_rules,
              { attribute: "customer_group_id", value: "cg_bad" },
            ],
          },
        ],
        "lyd",
        "reg_store",
        500,
      ),
    ).toBe(false)
    expect(
      hasExactCommerceShippingOptionPrices(
        [
          { ...exactPrices[0], min_quantity: 2 },
          exactPrices[1],
        ],
        "lyd",
        "reg_store",
        500,
      ),
    ).toBe(false)
  })
})
