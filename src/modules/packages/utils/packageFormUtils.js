const createLocalId = (prefix) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

export const packageCategoryOptions = [
  { value: "hair", label: "Hair" },
  { value: "skin", label: "Skin" },
  { value: "grooming", label: "Grooming" },
  { value: "spa", label: "Spa" },
  { value: "bridal", label: "Bridal" },
];

export const saleChannelOptions = [
  { value: "front_desk", label: "Front Desk" },
  { value: "pos", label: "POS" },
  { value: "online", label: "Online" },
];

export const createInitialServiceSelection = () => ({
  id: createLocalId("service"),
  serviceId: "",
  sessions: 1,
});

export const createInitialPackageForm = (assignedOutletIds = []) => ({
  packageCode: "",
  packageName: "",
  offerLabel: "",
  description: "",
  category: "hair",
  validityDays: 30,
  packagePrice: "",
  status: "active",
  assignedOutletIds,
  featured: false,
  bookableOnline: false,
  prepaidOnly: false,
  maxRedemptionsPerVisit: 1,
  saleChannels: ["front_desk", "pos"],
  termsAndConditions: "",
  services: [createInitialServiceSelection()],
});

export const mapPackageToForm = (servicePackage) => ({
  packageCode: servicePackage.packageCode || "",
  packageName: servicePackage.packageName || "",
  offerLabel: servicePackage.offerLabel || "",
  description: servicePackage.description || "",
  category: servicePackage.category || "hair",
  validityDays: String(servicePackage.validityDays || 30),
  packagePrice: String(servicePackage.price || ""),
  status: servicePackage.status || "active",
  assignedOutletIds: servicePackage.assignedOutletIds || [],
  featured: Boolean(servicePackage.featured),
  bookableOnline: Boolean(servicePackage.bookableOnline),
  prepaidOnly: Boolean(servicePackage.prepaidOnly),
  maxRedemptionsPerVisit: String(servicePackage.maxRedemptionsPerVisit || 1),
  saleChannels: servicePackage.saleChannels?.length
    ? servicePackage.saleChannels
    : ["front_desk", "pos"],
  termsAndConditions: servicePackage.termsAndConditions || "",
  services:
    servicePackage.serviceItems?.length > 0
      ? servicePackage.serviceItems.map((serviceItem) => ({
          id: createLocalId("service"),
          serviceId: serviceItem.serviceId,
          sessions: serviceItem.sessions,
        }))
      : [createInitialServiceSelection()],
});

export const formatPackageValue = (value = "") =>
  value
    .split("_")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
