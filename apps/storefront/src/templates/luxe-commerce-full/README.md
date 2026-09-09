# Luxe Commerce — Full Source

This directory preserves the exact owner-supplied customer frontend from:

`D:\Projects\السنوسي وأبنائه\apps\web`

The `reference-source/src` tree is an untouched source snapshot copied on
2026-08-24. Optimized runtime assets are kept separately under
`public/assets/luxe-full` so the existing `luxe-commerce` template and its
assets remain unchanged.

The source snapshot is the visual and interaction authority for the full
template: shell, spacing, motion, cards, product detail, favorites, Cart,
checkout, account, orders, policies, responsive layout, and mobile navigation.
It is intentionally not imported as a second application and its legacy API,
Supabase, and authentication helpers are not runtime authorities. The live
`luxe-commerce-full` adapter uses LabibTech's shared Store resolver, catalog,
favorites, Cart, checkout, inventory, and Order flows.
