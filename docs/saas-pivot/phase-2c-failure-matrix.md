# Phase 2C Failure Matrix

| Step | Activation allowed | Retry behavior | Cleanup behavior |
| --- | --- | --- | --- |
| Tenant | No | Reuse checkpoint or retry create | Remove only after operator proves it was created and empty |
| Medusa Store | No | Reuse recorded Store | Retain for review |
| StoreProfile/link | No | Repair link or reuse profile | Retain for review |
| Sales Channel | No | Reuse channel and reset Store default | Retain for review |
| Publishable key/link | No | Reuse key and repair association | Revoke or remove only through reviewed operation |
| Region/currency | No | Reuse exact compatible Region or retry create | Never delete a reused Region |
| Stock Location/link | No | Reuse location and repair channel/default links | Retain for review |
| Brand | No | Reuse brand | Remove only if attempt-created and unreferenced |
| Domain | No for required temporary domain | Retry unique domain creation | Pending custom domain remains non-primary |
| Merchant account | No | Explicitly reuse active account or retry create | Never delete a reused account |
| Membership | No | Reuse unique membership or create once | Retain for review |
| Graph validation | No | Repair failed invariant then retry | Store remains draft |
| Context validation | Reverted | Repair routing or membership and retry | Profile and Vendor return to draft |

All failure messages and events are allowlisted and exclude credentials.
