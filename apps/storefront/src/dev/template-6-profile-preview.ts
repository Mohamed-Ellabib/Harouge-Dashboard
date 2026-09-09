/** Read-only design data; never customer-account, address, payment or Order storage. */
export const template6ProfilePreview = {
  name: "Arafat", location: "Dubai Marina, Dubai",
  avatar: "/assets/template-6/profile-avatar-v1.webp",
  address: "Apartment 1204, Marina Heights, Dubai Marina, Dubai, UAE",
  payment: "Visa ··4242",
  orders: [
    { display_id: "ORD-10482", quantity: 2, progress: "confirmed" as const },
    { display_id: "ORD-10415", quantity: 1, progress: "shipped" as const },
    { display_id: "ORD-10398", quantity: 1, progress: "delivered" as const },
  ],
};
