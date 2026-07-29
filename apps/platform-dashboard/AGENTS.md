# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

## LabibTech owner-admin boundary

- This application is the platform-owner administration surface, not the merchant/vendor dashboard.
- Preserve the approved Arabic RTL, near-black navy, electric-blue cybersecurity design language.
- Keep Medusa implementation details and branding invisible in the interface.
- Platform authentication uses Medusa's `user` actor with a secure session; never place an Admin API token or server secret in browser code.
- Signing out of the Medusa-powered owner Admin must return to the LabibTech platform sign-in page; the built-in Medusa login screen must never be exposed.
- Keep the complete sign-in composition proportionally filled at normal desktop heights: no clipping, no page scroll, and no large auto-spacer between the submit button and trust footer.

## Selected owner control-plane direction

- The owner dashboard is a SaaS control plane, never a dashboard for one Store.
- The platform owner manages the hierarchy Client/Tenant -> Store -> storefront -> domain/hosting -> deployment -> vendor accounts -> subscription.
- The selected primary screen is the Arabic RTL tenant-portfolio table with a left client inspector and right LabibTech navigation rail.
- Platform-level navigation prioritizes Store requests, clients and Stores, storefront design, domains/hosting, deployments, vendor access, plans/billing, operations, security, and platform settings.
- Store commerce operations remain available through a separate Store workspace; do not mix platform portfolio metrics with one Store's orders or sales.
- Never fabricate backend state. Features deferred beyond the current phase must be labeled as unavailable or not yet connected while preserving links to working Medusa functionality.
