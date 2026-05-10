import { slugFromName } from "../utils/format";

const delay = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));
const clone = (value) => JSON.parse(JSON.stringify(value));
const currentMonth = "2026-04";

const createId = (prefix) =>
  `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

const commissionMap = {
  "Tier 1": 2500,
  "Tier 2": 4500,
  "Tier 3": 6500,
};

// Commission Badge Configuration - Sales Volume Based
// Bronze: 100-499 sales, Silver: 500-999 sales, Gold: 1000+ sales
const commissionBadgeConfig = {
  bronze: {
    name: "Bronze",
    minSales: 100,
    maxSales: 499,
    commissionPercent: 1, // 1% of total sales
    color: "#CD7F32",
    icon: "🥉",
  },
  silver: {
    name: "Silver",
    minSales: 500,
    maxSales: 999,
    commissionPercent: 2, // 2% of total sales
    color: "#C0C0C0",
    icon: "🥈",
  },
  gold: {
    name: "Gold",
    minSales: 1000,
    maxSales: Infinity,
    commissionPercent: 3, // 3% of total sales
    color: "#FFD700",
    icon: "🥇",
  },
};

// Helper: Calculate employee sales for a given month from bills
const calculateEmployeeMonthlySales = (staffId, monthKey) => {
  const [year, month] = monthKey.split("-");
  const startOfMonth = new Date(Number(year), Number(month) - 1, 1);
  const endOfMonth = new Date(Number(year), Number(month), 0, 23, 59, 59);

  let totalSales = 0;
  let saleCount = 0;

  bills.forEach((bill) => {
    const billDate = new Date(bill.createdAt);
    if (billDate >= startOfMonth && billDate <= endOfMonth && bill.status === "paid") {
      bill.lineItems.forEach((item) => {
        if (item.staffAssigned === staffId) {
          totalSales += item.price * item.qty;
          saleCount += 1;
        }
      });
    }
  });

  return { totalSales, saleCount };
};

// Helper: Determine commission badge based on sale count
const determineCommissionBadge = (saleCount) => {
  if (saleCount >= commissionBadgeConfig.gold.minSales) {
    return commissionBadgeConfig.gold;
  } else if (saleCount >= commissionBadgeConfig.silver.minSales) {
    return commissionBadgeConfig.silver;
  } else if (saleCount >= commissionBadgeConfig.bronze.minSales) {
    return commissionBadgeConfig.bronze;
  }
  return null;
};

// Helper: Calculate commission based on badge and total sales
const calculateCommission = (totalSales, saleCount) => {
  const badge = determineCommissionBadge(saleCount);
  if (!badge) {
    return { amount: 0, badge: null, saleCount, totalSales };
  }
  const amount = Math.round((totalSales * badge.commissionPercent) / 100);
  return { amount, badge, saleCount, totalSales };
};

let outlets = [
  {
    id: "outlet_hsr",
    code: "HSR-01",
    name: "HSR Layout",
    city: "Bengaluru",
    address: "Sector 2, HSR Layout, Bengaluru, Karnataka 560102",
    invoicePrefix: "HSR-",
    manager: "Meera Kapoor",
  },
  {
    id: "outlet_indiranagar",
    code: "IND-01",
    name: "Indiranagar",
    city: "Bengaluru",
    address: "100 Feet Road, Indiranagar, Bengaluru, Karnataka 560038",
    invoicePrefix: "IND-",
    manager: "Aarav Nair",
  },
  {
    id: "outlet_banjara",
    code: "BNJ-01",
    name: "Banjara Hills",
    city: "Hyderabad",
    address: "Road No. 1, Banjara Hills, Hyderabad, Telangana 500034",
    invoicePrefix: "BNJ-",
    manager: "Sara Thomas",
  },
];

let monthlyBudgets = [
  { outletId: "outlet_hsr", monthKey: currentMonth, amount: 150000 },
  { outletId: "outlet_indiranagar", monthKey: currentMonth, amount: 135000 },
  { outletId: "outlet_banjara", monthKey: currentMonth, amount: 165000 },
];

// Budget history to track changes over time
let budgetHistory = [
  {
    id: "bh_001",
    outletId: "outlet_hsr",
    monthKey: "2026-03",
    previousAmount: 140000,
    newAmount: 150000,
    changeAmount: 10000,
    changeType: "increase",
    changedAt: "2026-03-25T10:30:00.000Z",
    changedBy: "admin",
    reason: "Additional marketing budget allocation",
  },
  {
    id: "bh_002",
    outletId: "outlet_indiranagar",
    monthKey: "2026-03",
    previousAmount: 130000,
    newAmount: 135000,
    changeAmount: 5000,
    changeType: "increase",
    changedAt: "2026-03-20T14:15:00.000Z",
    changedBy: "admin",
    reason: "Equipment maintenance buffer",
  },
];

let purchaseOrders = [
  {
    id: "po_001",
    poNumber: "PO-2026-001",
    supplierName: "Beauty Supplies Co.",
    supplierContact: "+60 3-1234 5678",
    supplierEmail: "orders@beautysupplies.com",
    status: "received",
    orderDate: "2026-01-15",
    expectedDate: "2026-01-25",
    totalCost: 12500,
    items: [
      { productName: "Shampoo Premium 1L", qty: 20, unitPrice: 45 },
      { productName: "Conditioner Premium 1L", qty: 20, unitPrice: 42 },
      { productName: "Hair Serum 100ml", qty: 30, unitPrice: 85 },
    ],
  },
  {
    id: "po_002",
    poNumber: "PO-2026-002",
    supplierName: "Salon Equipment Ltd",
    supplierContact: "+60 3-8765 4321",
    supplierEmail: "sales@salonequip.com",
    status: "approved",
    orderDate: "2026-02-10",
    expectedDate: "2026-02-28",
    totalCost: 28500,
    items: [
      { productName: "Professional Hair Dryer", qty: 5, unitPrice: 350 },
      { productName: "Salon Chair - Black", qty: 3, unitPrice: 1200 },
      { productName: "Styling Station Mirror", qty: 2, unitPrice: 800 },
    ],
  },
  {
    id: "po_003",
    poNumber: "PO-2026-003",
    supplierName: "Organic Beauty Products",
    supplierContact: "+60 3-5555 8888",
    supplierEmail: "wholesale@organicbeauty.my",
    status: "pending",
    orderDate: "2026-03-05",
    expectedDate: "2026-03-20",
    totalCost: 8750,
    items: [
      { productName: "Organic Face Mask (Box of 10)", qty: 50, unitPrice: 65 },
      { productName: "Essential Oil Set", qty: 25, unitPrice: 95 },
      { productName: "Natural Body Scrub", qty: 40, unitPrice: 55 },
    ],
  },
  {
    id: "po_004",
    poNumber: "PO-2026-004",
    supplierName: "Beauty Supplies Co.",
    supplierContact: "+60 3-1234 5678",
    supplierEmail: "orders@beautysupplies.com",
    status: "cancelled",
    orderDate: "2026-03-12",
    expectedDate: "2026-03-25",
    totalCost: 4200,
    items: [
      { productName: "Nail Polish Set", qty: 100, unitPrice: 15 },
      { productName: "Nail Dryer Lamp", qty: 5, unitPrice: 140 },
    ],
  },
];

let productMasters = [
  {
    id: "inv_loreal_tube",
    itemName: "L'Oreal Color Tube",
    unitPrice: 580,
    centralStock: 18,
    unitMasterId: "unit_piece",
    purchaseUnit: "primary",
    consumptionUnit: "primary",
    productMeasure: 1,
    productMeasureUnit: "primary",
  },
  {
    id: "inv_keratin_serum",
    itemName: "Keratin Repair Serum",
    unitPrice: 740,
    centralStock: 12,
    unitMasterId: "unit_liter_ml",
    purchaseUnit: "primary",
    consumptionUnit: "secondary",
    productMeasure: 500,
    productMeasureUnit: "secondary",
  },
  {
    id: "inv_shampoo",
    itemName: "Deep Nourish Shampoo",
    unitPrice: 320,
    centralStock: 25,
    unitMasterId: "unit_liter_ml",
    purchaseUnit: "primary",
    consumptionUnit: "secondary",
    productMeasure: 1,
    productMeasureUnit: "primary",
  },
  {
    id: "inv_bleach",
    itemName: "Pro Bleach Powder",
    unitPrice: 890,
    centralStock: 9,
    unitMasterId: "unit_kg_g",
    purchaseUnit: "primary",
    consumptionUnit: "secondary",
    productMeasure: 500,
    productMeasureUnit: "secondary",
  },
  {
    id: "inv_hair_spa",
    itemName: "Spa Cream Jar",
    unitPrice: 540,
    centralStock: 14,
    unitMasterId: "unit_kg_g",
    purchaseUnit: "primary",
    consumptionUnit: "secondary",
    productMeasure: 1,
    productMeasureUnit: "primary",
  },
];

let outletInventory = [
  {
    id: "stock_hsr_loreal",
    productId: "inv_loreal_tube",
    outletId: "outlet_hsr",
    currentStock: 46,
  },
  {
    id: "stock_hsr_keratin",
    productId: "inv_keratin_serum",
    outletId: "outlet_hsr",
    currentStock: 24,
  },
  {
    id: "stock_indiranagar_shampoo",
    productId: "inv_shampoo",
    outletId: "outlet_indiranagar",
    currentStock: 62,
  },
  {
    id: "stock_indiranagar_bleach",
    productId: "inv_bleach",
    outletId: "outlet_indiranagar",
    currentStock: 19,
  },
  {
    id: "stock_banjara_spa",
    productId: "inv_hair_spa",
    outletId: "outlet_banjara",
    currentStock: 33,
  },
];

let outletProductPrices = [];

let outletServicePrices = [];

let outletPackagePrices = [];

let stockIssues = [
  {
    id: "issue_001",
    productId: "inv_loreal_tube",
    outletId: "outlet_hsr",
    qty: 10,
    createdAt: "2026-04-06T14:00:00.000Z",
  },
  {
    id: "issue_002",
    productId: "inv_hair_spa",
    outletId: "outlet_banjara",
    qty: 6,
    createdAt: "2026-04-07T16:15:00.000Z",
  },
];

let services = [
  {
    id: "svc_hair_cut",
    serviceName: "Classic Cut",
    price: 1200,
    duration: 45,
    category: "hair",
    productLinkages: [],
  },
  {
    id: "svc_hair_color",
    serviceName: "Premium Color",
    price: 2800,
    duration: 90,
    category: "hair",
    productLinkages: [{ inventoryId: "inv_loreal_tube", quantityUsed: 1, consumptionUnit: "primary" }],
  },
  {
    id: "svc_keratin",
    serviceName: "Keratin Treatment",
    price: 4800,
    duration: 120,
    category: "hair",
    productLinkages: [{ inventoryId: "inv_keratin_serum", quantityUsed: 50, consumptionUnit: "secondary" }],
  },
  {
    id: "svc_hair_spa",
    serviceName: "Hair Spa",
    price: 1800,
    duration: 60,
    category: "hair",
    productLinkages: [{ inventoryId: "inv_hair_spa", quantityUsed: 100, consumptionUnit: "secondary" }],
  },
  {
    id: "svc_beard_trim",
    serviceName: "Beard Sculpt",
    price: 650,
    duration: 25,
    category: "grooming",
    productLinkages: [],
  },
  {
    id: "svc_facial",
    serviceName: "Deep Cleansing Facial",
    price: 2200,
    duration: 75,
    category: "skin",
    productLinkages: [],
  },
  {
    id: "svc_manicure",
    serviceName: "Gel Manicure",
    price: 1500,
    duration: 60,
    category: "nails",
    productLinkages: [],
  },
];

let serviceCategories = [
  { id: "cat_hair", name: "Hair", code: "HAIR", status: "active" },
  { id: "cat_nails", name: "Nails", code: "NAILS", status: "active" },
  { id: "cat_skin", name: "Skin", code: "SKIN", status: "active" },
  { id: "cat_grooming", name: "Grooming", code: "GROOM", status: "active" },
];

// ─── Unit Masters ────────────────────────────────────────────────────────────

let unitMasters = [
  {
    id: "unit_liter_ml",
    groupName: "Volume – Liter / Milliliter",
    primaryUnit: "Liter",
    primaryAbbr: "L",
    secondaryUnit: "Milliliter",
    secondaryAbbr: "ML",
    conversionRatio: 1000,
    status: "active",
  },
  {
    id: "unit_kg_g",
    groupName: "Weight – Kilogram / Gram",
    primaryUnit: "Kilogram",
    primaryAbbr: "KG",
    secondaryUnit: "Gram",
    secondaryAbbr: "G",
    conversionRatio: 1000,
    status: "active",
  },
  {
    id: "unit_meter_cm",
    groupName: "Length – Meter / Centimeter",
    primaryUnit: "Meter",
    primaryAbbr: "M",
    secondaryUnit: "Centimeter",
    secondaryAbbr: "CM",
    conversionRatio: 100,
    status: "active",
  },
  {
    id: "unit_piece",
    groupName: "Count – Piece",
    primaryUnit: "Piece",
    primaryAbbr: "PC",
    secondaryUnit: "Piece",
    secondaryAbbr: "PC",
    conversionRatio: 1,
    status: "active",
  },
];

// Internal conversion helpers (used inside mockApi only)
const _findUnitMaster = (id) => unitMasters.find((u) => u.id === id);

const _convertToBase = (qty, unitMasterId, fromUnit) => {
  const um = _findUnitMaster(unitMasterId);
  if (!um) return Number(qty) || 0;
  if (fromUnit === "secondary" && um.conversionRatio > 0) {
    return (Number(qty) || 0) / um.conversionRatio;
  }
  return Number(qty) || 0;
};

const _convertFromBase = (baseQty, unitMasterId, toUnit) => {
  const um = _findUnitMaster(unitMasterId);
  if (!um) return Number(baseQty) || 0;
  if (toUnit === "secondary" && um.conversionRatio > 0) {
    return (Number(baseQty) || 0) * um.conversionRatio;
  }
  return Number(baseQty) || 0;
};

const cloneLinkages = (linkages = []) =>
  linkages.map((linkage) => ({
    inventoryId: linkage.inventoryId,
    quantityUsed: Number(linkage.quantityUsed),
    consumptionUnit: linkage.consumptionUnit || "primary",
  }));

const resolvePackageOutletNames = (assignedOutletIds = []) =>
  assignedOutletIds.length
    ? assignedOutletIds.map(
      (outletId) => outlets.find((outlet) => outlet.id === outletId)?.name || outletId,
    )
    : ["All outlets"];

const normalizePackageServices = (selectedServices = []) => {
  const groupedSelections = selectedServices.reduce((accumulator, selection) => {
    if (!selection?.serviceId) {
      return accumulator;
    }

    const sessions = Math.max(1, Number(selection.sessions) || 1);
    const currentSessions = accumulator.get(selection.serviceId) || 0;
    accumulator.set(selection.serviceId, currentSessions + sessions);
    return accumulator;
  }, new Map());

  return Array.from(groupedSelections.entries())
    .map(([serviceId, sessions]) => {
      const service = services.find((entry) => entry.id === serviceId);

      if (!service) {
        return null;
      }

      return {
        serviceId: service.id,
        serviceName: service.serviceName,
        price: service.price,
        duration: service.duration,
        sessions,
        totalPrice: service.price * sessions,
        totalDuration: service.duration * sessions,
        productLinkages: cloneLinkages(service.productLinkages),
      };
    })
    .filter(Boolean);
};

const buildPackageRecord = (payload, existingRecord = {}) => {
  const serviceItems = normalizePackageServices(payload.services || payload.serviceItems || []);
  const totalOriginalPrice = serviceItems.reduce((sum, service) => sum + service.totalPrice, 0);
  const totalDuration = serviceItems.reduce((sum, service) => sum + service.totalDuration, 0);
  const parsedPackagePrice = Number(payload.packagePrice);
  const packagePrice =
    Number.isFinite(parsedPackagePrice) && parsedPackagePrice > 0
      ? parsedPackagePrice
      : totalOriginalPrice;
  const slug = slugFromName(payload.packageName || existingRecord.packageName || "");
  const assignedOutletIds = Array.from(
    new Set([...(payload.assignedOutletIds || existingRecord.assignedOutletIds || [])]),
  ).filter(Boolean);
  const saleChannels = Array.from(
    new Set([...(payload.saleChannels || existingRecord.saleChannels || ["front_desk", "pos"])]),
  ).filter(Boolean);

  return {
    id: payload.id || existingRecord.id || (slug ? `pkg_${slug}` : createId("pkg")),
    packageCode:
      payload.packageCode?.trim() ||
      existingRecord.packageCode ||
      `PKG-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    packageName: payload.packageName?.trim() || existingRecord.packageName || "",
    offerLabel: payload.offerLabel?.trim() || existingRecord.offerLabel || "Offer Package",
    description: payload.description?.trim() || existingRecord.description || "",
    category: payload.category || existingRecord.category || "hair",
    validityDays: Number(payload.validityDays ?? existingRecord.validityDays ?? 30) || 30,
    status: payload.status || existingRecord.status || "active",
    assignedOutletIds,
    featured:
      typeof payload.featured === "boolean" ? payload.featured : existingRecord.featured || false,
    bookableOnline:
      typeof payload.bookableOnline === "boolean"
        ? payload.bookableOnline
        : existingRecord.bookableOnline || false,
    prepaidOnly:
      typeof payload.prepaidOnly === "boolean"
        ? payload.prepaidOnly
        : existingRecord.prepaidOnly || false,
    maxRedemptionsPerVisit: Math.max(
      1,
      Number(payload.maxRedemptionsPerVisit ?? existingRecord.maxRedemptionsPerVisit ?? 1) || 1,
    ),
    saleChannels,
    termsAndConditions:
      payload.termsAndConditions?.trim() || existingRecord.termsAndConditions || "",
    price: packagePrice,
    totalOriginalPrice,
    savings: Math.max(totalOriginalPrice - packagePrice, 0),
    totalDuration,
    serviceCount: serviceItems.length,
    serviceItems,
  };
};

let packages = [
  buildPackageRecord({
    id: "pkg_color_reset",
    packageCode: "PKG-2001",
    packageName: "Color Reset Ritual",
    offerLabel: "Most Booked",
    description: "Color touch-up plus recovery ritual for guests who want shine and softness to last.",
    category: "hair",
    validityDays: 45,
    packagePrice: 4300,
    status: "active",
    assignedOutletIds: ["outlet_hsr", "outlet_indiranagar"],
    featured: true,
    bookableOnline: true,
    prepaidOnly: true,
    maxRedemptionsPerVisit: 1,
    saleChannels: ["front_desk", "pos", "online"],
    termsAndConditions: "Package is redeemable across selected outlets and cannot be split across customers.",
    services: [
      { serviceId: "svc_hair_color", sessions: 1 },
      { serviceId: "svc_hair_spa", sessions: 1 },
    ],
  }),
  buildPackageRecord({
    id: "pkg_grooming_pass",
    packageCode: "PKG-2002",
    packageName: "Grooming Pass",
    offerLabel: "Repeat Visits",
    description: "A neat recurring bundle for guests who come in regularly for quick upkeep.",
    category: "grooming",
    validityDays: 60,
    packagePrice: 1750,
    status: "inactive",
    assignedOutletIds: [],
    featured: false,
    bookableOnline: false,
    prepaidOnly: false,
    maxRedemptionsPerVisit: 2,
    saleChannels: ["front_desk", "pos"],
    termsAndConditions: "Unused sessions expire after validity end date and are non-refundable.",
    services: [
      { serviceId: "svc_beard_trim", sessions: 2 },
      { serviceId: "svc_hair_spa", sessions: 1 },
    ],
  }),
];

let staffMembers = [
  {
    id: "staff_naina",
    name: "Naina Shah",
    phone: "+91 98765 40001",
    role: "Senior Stylist",
    assignedOutletId: "outlet_hsr",
    baseSalary: 32000,
    commissionSlab: "Tier 2",
    pfDeduction: 1800,
    taxType: "percentage",
    taxValue: 8,
    contractFileName: "naina-contract.pdf",
    advances: [],
  },
  {
    id: "staff_rohan",
    name: "Rohan Iyer",
    phone: "+91 98765 40002",
    role: "Color Specialist",
    assignedOutletId: "outlet_indiranagar",
    baseSalary: 36000,
    commissionSlab: "Tier 3",
    pfDeduction: 2200,
    taxType: "flat",
    taxValue: 2100,
    contractFileName: "rohan-contract.pdf",
    advances: [
      {
        id: "adv_rohan_1",
        totalAdvanceAmount: 18000,
        deductionStartMonth: "2026-05",
        duration: 6,
        emi: 3000,
      },
    ],
  },
  {
    id: "staff_sia",
    name: "Sia Fernandes",
    phone: "+91 98765 40003",
    role: "Reception Lead",
    assignedOutletId: "outlet_hsr",
    baseSalary: 24000,
    commissionSlab: "Tier 1",
    pfDeduction: 1400,
    taxType: "percentage",
    taxValue: 5,
    contractFileName: "sia-contract.pdf",
    advances: [],
  },
];

let expenses = [
  {
    id: "exp_1",
    itemName: "Towels",
    qty: 12,
    price: 180,
    totalAmount: 2160,
    billNo: "BL-2041",
    outletId: "outlet_hsr",
    monthKey: currentMonth,
    createdAt: "2026-04-02T10:00:00.000Z",
  },
  {
    id: "exp_2",
    itemName: "Coffee Pods",
    qty: 8,
    price: 450,
    totalAmount: 3600,
    billNo: "BL-2049",
    outletId: "outlet_hsr",
    monthKey: currentMonth,
    createdAt: "2026-04-03T09:30:00.000Z",
  },
  {
    id: "exp_3",
    itemName: "Cleaning Supplies",
    qty: 6,
    price: 500,
    totalAmount: 3000,
    billNo: "BL-1187",
    outletId: "outlet_indiranagar",
    monthKey: currentMonth,
    createdAt: "2026-04-03T13:00:00.000Z",
  },
];

const withOutletName = (record) => ({
  ...record,
  assignedOutletName:
    outlets.find((outlet) => outlet.id === record.assignedOutletId)?.name || "Unassigned",
});

const withPackagePresentation = (servicePackage) => ({
  ...servicePackage,
  assignedOutletNames: resolvePackageOutletNames(servicePackage.assignedOutletIds),
  isAvailableEverywhere: !servicePackage.assignedOutletIds.length,
});

const findProductMaster = (productId) =>
  productMasters.find((product) => product.id === productId);

const getIssuedStock = (productId) =>
  outletInventory
    .filter((record) => record.productId === productId)
    .reduce((sum, record) => sum + record.currentStock, 0);

const withProductPresentation = (product) => {
  const unitMaster = _findUnitMaster(product.unitMasterId);
  const measureLabel = unitMaster
    ? (product.productMeasureUnit === "secondary" ? `${product.productMeasure} ${unitMaster.secondaryAbbr}` : `${product.productMeasure} ${unitMaster.primaryAbbr}`)
    : "";

  return {
    ...product,
    issuedStock: getIssuedStock(product.id),
    totalNetworkStock: product.centralStock + getIssuedStock(product.id),
    unitMaster: unitMaster ? clone(unitMaster) : null,
    productMeasureLabel: measureLabel,
    purchaseUnitLabel: unitMaster
      ? (product.purchaseUnit === "secondary" ? `${unitMaster.secondaryUnit} (${unitMaster.secondaryAbbr})` : `${unitMaster.primaryUnit} (${unitMaster.primaryAbbr})`)
      : "",
    consumptionUnitLabel: unitMaster
      ? (product.consumptionUnit === "secondary" ? `${unitMaster.secondaryUnit} (${unitMaster.secondaryAbbr})` : `${unitMaster.primaryUnit} (${unitMaster.primaryAbbr})`)
      : "",
  };
};

const withInventoryPresentation = (record) => {
  const product = findProductMaster(record.productId);

  return {
    ...record,
    itemName: product?.itemName || "Unknown Product",
    unitPrice: product?.unitPrice || 0,
  };
};

const aggregateInventoryAcrossOutlets = () =>
  Array.from(
    outletInventory.reduce((accumulator, record) => {
      const existingRecord = accumulator.get(record.productId);

      if (existingRecord) {
        existingRecord.currentStock += record.currentStock;
        return accumulator;
      }

      accumulator.set(record.productId, {
        productId: record.productId,
        currentStock: record.currentStock,
      });
      return accumulator;
    }, new Map()).values(),
  ).map((record) => {
    const product = findProductMaster(record.productId);

    return {
      id: record.productId,
      productId: record.productId,
      itemName: product?.itemName || "Unknown Product",
      unitPrice: product?.unitPrice || 0,
      currentStock: record.currentStock,
    };
  });

const filterByOutlet = (records, outletId, key = "outletId") =>
  outletId ? records.filter((record) => record[key] === outletId) : records;

export const loginUser = async ({ email, password }) => {
  await delay(550);

  if (!email || !password) {
    throw new Error("Please enter both email and password.");
  }

  const normalizedEmail = email.toLowerCase().trim();
  const isAdmin = normalizedEmail.includes("admin");

  const role = isAdmin ? "admin" : "outlet_manager";
  const outletId = isAdmin ? null : "outlet_hsr";

  return clone({
    id: isAdmin ? "user_admin" : "user_manager",
    name: isAdmin ? "Glowy Super Admin" : "HSR Outlet Manager",
    email: normalizedEmail,
    role,
    outlet_id: outletId,
  });
};

export const fetchOutlets = async () => {
  await delay();
  // Add monthlyBudget field to each outlet from monthlyBudgets array
  const outletsWithBudget = outlets.map(outlet => {
    const budgetRecord = monthlyBudgets.find(
      (b) => b.outletId === outlet.id && b.monthKey === currentMonth,
    );
    return {
      ...outlet,
      monthlyBudget: budgetRecord?.amount || 0,
    };
  });
  return clone(outletsWithBudget);
};

export const fetchProductMasters = async () => {
  await delay();
  return clone(productMasters.map(withProductPresentation));
};

export const fetchInventory = async ({ outletId } = {}) => {
  await delay();
  return clone(filterByOutlet(outletInventory, outletId).map(withInventoryPresentation));
};

export const createProduct = async (payload) => {
  await delay();

  const product = {
    id:
      productMasters.find((item) => item.itemName.toLowerCase() === payload.itemName.toLowerCase())
        ? createId("inv")
        : `inv_${slugFromName(payload.itemName) || createId("item")}`,
    itemName: payload.itemName,
    unitPrice: Number(payload.unitPrice),
    centralStock: 0,
    unitMasterId: payload.unitMasterId || "unit_piece",
    purchaseUnit: payload.purchaseUnit || "primary",
    consumptionUnit: payload.consumptionUnit || "primary",
    productMeasure: Number(payload.productMeasure) || 1,
    productMeasureUnit: payload.productMeasureUnit || "primary",
  };

  productMasters = [product, ...productMasters];
  return clone(withProductPresentation(product));
};

export const createPurchaseOrder = async (payload) => {
  await delay();

  const productId = payload.productId || payload.inventoryId;
  const existingProduct = findProductMaster(productId);

  if (!existingProduct) {
    throw new Error("Product master not found.");
  }

  const rawQty = Math.max(0.001, Number(payload.qty) || 0);
  const poUnit = payload.unit || existingProduct.purchaseUnit || "primary";

  // Convert to base (primary) unit for stock storage
  const baseQty = _convertToBase(rawQty, existingProduct.unitMasterId, poUnit);

  productMasters = productMasters.map((item) =>
    item.id === productId
      ? { ...item, centralStock: item.centralStock + baseQty }
      : item,
  );

  const unitMaster = _findUnitMaster(existingProduct.unitMasterId);

  const purchaseOrder = {
    id: createId("po"),
    supplierName: payload.supplierName,
    productId,
    qty: rawQty,
    unit: poUnit,
    unitAbbr: unitMaster
      ? (poUnit === "secondary" ? unitMaster.secondaryAbbr : unitMaster.primaryAbbr)
      : "",
    baseQty,
    totalCost: Number(payload.totalCost),
    createdAt: new Date().toISOString(),
  };

  purchaseOrders = [purchaseOrder, ...purchaseOrders];

  return clone({
    ...purchaseOrder,
    itemName: existingProduct.itemName,
  });
};

export const issueProductToOutlet = async (payload) => {
  await delay();

  const product = findProductMaster(payload.productId);
  const outlet = outlets.find((entry) => entry.id === payload.outletId);
  const qty = Math.max(1, Number(payload.qty) || 0);

  if (!product) {
    throw new Error("Product master not found.");
  }

  if (!outlet) {
    throw new Error("Outlet not found.");
  }

  if (product.centralStock < qty) {
    throw new Error("Not enough central stock available to issue.");
  }

  productMasters = productMasters.map((item) =>
    item.id === payload.productId
      ? { ...item, centralStock: item.centralStock - qty }
      : item,
  );

  const existingOutletRecord = outletInventory.find(
    (record) => record.productId === payload.productId && record.outletId === payload.outletId,
  );

  if (existingOutletRecord) {
    outletInventory = outletInventory.map((record) =>
      record.id === existingOutletRecord.id
        ? { ...record, currentStock: record.currentStock + qty }
        : record,
    );
  } else {
    outletInventory = [
      {
        id: createId("stock"),
        productId: payload.productId,
        outletId: payload.outletId,
        currentStock: qty,
      },
      ...outletInventory,
    ];
  }

  const stockIssue = {
    id: createId("issue"),
    productId: payload.productId,
    outletId: payload.outletId,
    qty,
    createdAt: new Date().toISOString(),
  };

  stockIssues = [stockIssue, ...stockIssues];

  if (payload.sellingPrice !== undefined && payload.sellingPrice !== "") {
    const sellingPrice = Number(payload.sellingPrice);
    if (Number.isFinite(sellingPrice) && sellingPrice >= 0) {
      const existingPriceIdx = outletProductPrices.findIndex(
        (r) => r.productId === payload.productId && r.outletId === payload.outletId,
      );
      if (existingPriceIdx >= 0) {
        outletProductPrices[existingPriceIdx].price = sellingPrice;
      } else {
        outletProductPrices.push({ productId: payload.productId, outletId: payload.outletId, price: sellingPrice });
      }
    }
  }

  return clone({
    ...stockIssue,
    itemName: product.itemName,
    outletName: outlet.name,
  });
};

export const fetchServiceCategories = async () => {
  await delay();
  return clone(serviceCategories);
};

export const saveServiceCategory = async (payload) => {
  await delay();
  const category = {
    id: payload.id || createId("cat"),
    name: payload.name,
    code: payload.code || payload.name.substring(0, 3).toUpperCase(),
    status: payload.status || "active",
  };

  const index = serviceCategories.findIndex((c) => c.id === category.id);
  if (index >= 0) {
    serviceCategories[index] = category;
  } else {
    serviceCategories = [category, ...serviceCategories];
  }
  return clone(category);
};

export const deleteServiceCategory = async (id) => {
  await delay();
  serviceCategories = serviceCategories.filter((c) => c.id !== id);
  return { success: true };
};

// ─── Unit Master CRUD ─────────────────────────────────────────────────────────

export const fetchUnitMasters = async () => {
  await delay();
  return clone(unitMasters);
};

export const saveUnitMaster = async (payload) => {
  await delay();
  const unitMaster = {
    id: payload.id || createId("unit"),
    groupName: payload.groupName,
    primaryUnit: payload.primaryUnit,
    primaryAbbr: payload.primaryAbbr || payload.primaryUnit.substring(0, 2).toUpperCase(),
    secondaryUnit: payload.secondaryUnit,
    secondaryAbbr: payload.secondaryAbbr || payload.secondaryUnit.substring(0, 2).toUpperCase(),
    conversionRatio: Number(payload.conversionRatio) || 1,
    status: payload.status || "active",
  };

  const index = unitMasters.findIndex((u) => u.id === unitMaster.id);
  if (index >= 0) {
    unitMasters[index] = unitMaster;
  } else {
    unitMasters = [unitMaster, ...unitMasters];
  }
  return clone(unitMaster);
};

export const deleteUnitMaster = async (id) => {
  await delay();
  // Check if any product uses this unit master
  const inUse = productMasters.some((p) => p.unitMasterId === id);
  if (inUse) {
    throw new Error("Cannot delete: this unit group is used by one or more products.");
  }
  unitMasters = unitMasters.filter((u) => u.id !== id);
  return { success: true };
};

export const toggleUnitMasterStatus = async (id) => {
  await delay();
  const index = unitMasters.findIndex((u) => u.id === id);
  if (index === -1) {
    throw new Error("Unit master not found.");
  }
  unitMasters[index] = {
    ...unitMasters[index],
    status: unitMasters[index].status === "active" ? "inactive" : "active",
  };
  return clone(unitMasters[index]);
};

export const fetchServices = async () => {
  await delay();
  return clone(services);
};

export const createService = async (payload) => {
  await delay();

  const service = {
    id: payload.id || `svc_${slugFromName(payload.serviceName) || createId("service")}`,
    serviceName: payload.serviceName,
    price: Number(payload.price),
    duration: Number(payload.duration),
    category: payload.category,
    productLinkages: (payload.productLinkages || []).map((linkage) => ({
      inventoryId: linkage.inventoryId,
      quantityUsed: Number(linkage.quantityUsed),
      consumptionUnit: linkage.consumptionUnit || "primary",
    })),
  };

  const existingIndex = services.findIndex((s) => s.id === service.id);
  if (existingIndex >= 0) {
    services[existingIndex] = service;
  } else {
    services = [service, ...services];
  }

  return clone(service);
};

export const fetchPackages = async () => {
  await delay();
  return clone(packages.map(withPackagePresentation));
};

export const savePackage = async (payload) => {
  await delay();

  const existingPackage = packages.find((servicePackage) => servicePackage.id === payload.id);
  const packageRecord = buildPackageRecord(payload, existingPackage);
  const existingIndex = packages.findIndex((servicePackage) => servicePackage.id === packageRecord.id);

  if (existingIndex >= 0) {
    packages[existingIndex] = packageRecord;
  } else {
    packages = [packageRecord, ...packages];
  }

  return clone(withPackagePresentation(packageRecord));
};

export const createPackage = savePackage;

export const fetchPackageProfile = async (packageId) => {
  await delay();

  const servicePackage = packages.find((entry) => entry.id === packageId);

  if (!servicePackage) {
    throw new Error("Package not found.");
  }

  return clone(withPackagePresentation(servicePackage));
};

export const deletePackage = async (packageId) => {
  await delay();

  const existingPackage = packages.find((entry) => entry.id === packageId);

  if (!existingPackage) {
    throw new Error("Package not found.");
  }

  packages = packages.filter((entry) => entry.id !== packageId);

  return clone({ success: true });
};

export const togglePackageStatus = async (packageId) => {
  await delay();

  const existingPackage = packages.find((entry) => entry.id === packageId);

  if (!existingPackage) {
    throw new Error("Package not found.");
  }

  const nextPackage = buildPackageRecord(
    {
      ...existingPackage,
      status: existingPackage.status === "active" ? "inactive" : "active",
      services: existingPackage.serviceItems.map((serviceItem) => ({
        serviceId: serviceItem.serviceId,
        sessions: serviceItem.sessions,
      })),
    },
    existingPackage,
  );

  packages = packages.map((entry) => (entry.id === packageId ? nextPackage : entry));

  return clone(withPackagePresentation(nextPackage));
};

export const fetchStaff = async ({ outletId } = {}) => {
  await delay();
  return clone(filterByOutlet(staffMembers, outletId, "assignedOutletId").map(withOutletName));
};

export const saveStaff = async (payload) => {
  await delay();

  const staffRecord = {
    id: payload.id || `staff_${slugFromName(payload.name) || createId("member")}`,
    name: payload.name,
    phone: payload.phone,
    role: payload.role,
    assignedOutletId: payload.assignedOutletId,
    baseSalary: Number(payload.baseSalary),
    commissionSlab: payload.commissionSlab,
    pfDeduction: Number(payload.pfDeduction),
    taxType: payload.taxType,
    taxValue: Number(payload.taxValue),
    contractFileName:
      payload.contractFileName || payload.contractFile?.name || "pending-contract.pdf",
    advances: payload.advances || [],
  };

  const existingIndex = staffMembers.findIndex((member) => member.id === staffRecord.id);

  if (existingIndex >= 0) {
    staffMembers[existingIndex] = staffRecord;
  } else {
    staffMembers = [staffRecord, ...staffMembers];
  }

  return clone(withOutletName(staffRecord));
};

export const fetchStaffProfile = async (staffId) => {
  await delay();
  const staff = staffMembers.find((member) => member.id === staffId);

  if (!staff) {
    throw new Error("Staff member not found.");
  }

  return clone(withOutletName(staff));
};

export const grantAdvance = async (staffId, payload) => {
  await delay();

  const emi = Number(payload.totalAdvanceAmount) / Number(payload.duration || 1);

  staffMembers = staffMembers.map((member) =>
    member.id === staffId
      ? {
        ...member,
        advances: [
          ...member.advances,
          {
            id: createId("adv"),
            totalAdvanceAmount: Number(payload.totalAdvanceAmount),
            deductionStartMonth: payload.deductionStartMonth,
            duration: Number(payload.duration),
            emi: Number(emi.toFixed(2)),
          },
        ],
      }
      : member,
  );

  return fetchStaffProfile(staffId);
};

export const updateStaffStatus = async (staffId, status) => {
  await delay();

  const staffIndex = staffMembers.findIndex((member) => member.id === staffId);

  if (staffIndex === -1) {
    throw new Error("Staff member not found.");
  }

  staffMembers[staffIndex] = {
    ...staffMembers[staffIndex],
    status,
    deactivatedAt: status === 'inactive' ? new Date().toISOString() : undefined,
  };

  return clone(withOutletName(staffMembers[staffIndex]));
};

export const resetStaffPassword = async (staffId) => {
  await delay(400);

  const staffIndex = staffMembers.findIndex((member) => member.id === staffId);

  if (staffIndex === -1) {
    throw new Error("Staff member not found.");
  }

  const tempPassword = Math.random().toString(36).slice(-8);

  return {
    success: true,
    tempPassword,
    message: `Temporary password generated and sent to ${staffMembers[staffIndex].phone}`,
  };
};

export const fetchExpenses = async ({ outletId, monthKey } = {}) => {
  await delay();

  const targetMonth = monthKey || currentMonth;

  return clone(
    filterByOutlet(expenses, outletId)
      .filter((expense) => expense.monthKey === targetMonth)
      .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt)),
  );
};

export const createExpense = async (payload) => {
  await delay();

  const outletId = payload.outletId;
  const expenseMonth = payload.monthKey || currentMonth;
  const expenseAmount = Number(payload.totalAmount);

  // Calculate current expenses for this outlet/month
  const currentExpenses = expenses
    .filter((e) => e.monthKey === expenseMonth && e.outletId === outletId)
    .reduce((sum, e) => sum + e.totalAmount, 0);

  // Get budget for this outlet/month
  const budgetRecord = monthlyBudgets.find(
    (b) => b.outletId === outletId && b.monthKey === expenseMonth,
  );
  const monthlyBudget = budgetRecord?.amount || 0;

  // Validate against budget
  if (monthlyBudget > 0) {
    const remainingBudget = monthlyBudget - currentExpenses;
    if (expenseAmount > remainingBudget) {
      throw new Error(
        `Expense amount (${expenseAmount}) exceeds remaining budget (${remainingBudget}) for this outlet in ${expenseMonth}. Please increase the budget or reduce the expense amount.`
      );
    }
  }

  const expense = {
    id: createId("exp"),
    itemName: payload.itemName,
    qty: Number(payload.qty),
    price: Number(payload.price),
    totalAmount: expenseAmount,
    billNo: payload.billNo,
    outletId: outletId,
    monthKey: expenseMonth,
    createdAt: new Date().toISOString(),
  };

  expenses = [expense, ...expenses];
  return clone(expense);
};

export const deleteExpense = async (expenseId) => {
  await delay();
  expenses = expenses.filter((e) => e.id !== expenseId);
  return { success: true };
};

export const fetchBudgetSummary = async ({ outletId, monthKey } = {}) => {
  await delay();

  const targetMonth = monthKey || currentMonth;
  const selectedOutlets = outletId
    ? outlets.filter((outlet) => outlet.id === outletId)
    : outlets;

  const totalMonthlyBudget = selectedOutlets.reduce((sum, outlet) => {
    const budgetRecord = monthlyBudgets.find(
      (b) => b.outletId === outlet.id && b.monthKey === targetMonth,
    );
    return sum + (budgetRecord?.amount || 0);
  }, 0);

  const totalExpensesSoFar = expenses
    .filter((expense) => expense.monthKey === targetMonth)
    .filter((expense) => !outletId || expense.outletId === outletId)
    .reduce((sum, expense) => sum + expense.totalAmount, 0);

  // Calculate spend percentage for progress bar visualization
  const spendPercentage = totalMonthlyBudget > 0
    ? Math.round((totalExpensesSoFar / totalMonthlyBudget) * 100)
    : 0;

  return clone({
    totalMonthlyBudget,
    totalExpensesSoFar,
    remainingBalance: totalMonthlyBudget - totalExpensesSoFar,
    spendPercentage,
    monthKey: targetMonth,
    budgets: selectedOutlets.map(outlet => {
      const budgetRecord = monthlyBudgets.find(
        (b) => b.outletId === outlet.id && b.monthKey === targetMonth,
      );
      // Calculate per-outlet spend percentage
      const outletExpenses = expenses
        .filter((e) => e.monthKey === targetMonth && e.outletId === outlet.id)
        .reduce((sum, e) => sum + e.totalAmount, 0);
      const outletBudget = budgetRecord?.amount || 0;
      const outletSpendPercentage = outletBudget > 0
        ? Math.round((outletExpenses / outletBudget) * 100)
        : 0;

      return {
        outletId: outlet.id,
        outletName: outlet.name,
        amount: outletBudget,
        spendPercentage: outletSpendPercentage,
        currentExpenses: outletExpenses,
        remainingBudget: outletBudget - outletExpenses,
      };
    })
  });
};

export const updateMonthlyBudget = async ({ outletId, amount, monthKey, reason }) => {
  await delay();
  const targetMonth = monthKey || currentMonth;
  const newAmount = Number(amount);

  const existingIndex = monthlyBudgets.findIndex(
    (b) => b.outletId === outletId && b.monthKey === targetMonth,
  );

  let previousAmount = 0;

  if (existingIndex >= 0) {
    previousAmount = monthlyBudgets[existingIndex].amount;
    monthlyBudgets[existingIndex].amount = newAmount;
  } else {
    monthlyBudgets.push({
      outletId,
      monthKey: targetMonth,
      amount: newAmount,
    });
  }

  // Log budget change to history if amount changed
  if (previousAmount !== newAmount) {
    const changeAmount = Math.abs(newAmount - previousAmount);
    const changeType = newAmount > previousAmount ? "increase" : "decrease";

    budgetHistory.push({
      id: createId("bh"),
      outletId,
      monthKey: targetMonth,
      previousAmount,
      newAmount,
      changeAmount,
      changeType,
      changedAt: new Date().toISOString(),
      changedBy: "admin", // In real app, this would come from auth context
      reason: reason || `Budget ${changeType}d`,
    });
  }

  return fetchBudgetSummary({ outletId, monthKey: targetMonth });
};

// Fetch budget history for an outlet or all outlets
export const fetchBudgetHistory = async ({ outletId, monthKey, limit = 50 } = {}) => {
  await delay();

  let history = [...budgetHistory];

  // Filter by outlet if specified
  if (outletId) {
    history = history.filter((h) => h.outletId === outletId);
  }

  // Filter by month if specified
  if (monthKey) {
    history = history.filter((h) => h.monthKey === monthKey);
  }

  // Sort by date descending (newest first)
  history = history.sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt));

  // Add outlet names for display
  const historyWithNames = history.slice(0, limit).map((record) => {
    const outlet = outlets.find((o) => o.id === record.outletId);
    return {
      ...record,
      outletName: outlet?.name || record.outletId,
    };
  });

  return clone(historyWithNames);
};

// Helper function to get all available months - generates range from past to future
export const fetchAvailableMonths = async () => {
  await delay();

  // Generate months: 3 months ago to 3 months ahead
  const months = [];
  const today = new Date();

  for (let i = -3; i <= 3; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    months.push(`${year}-${month}`);
  }

  // Also include any existing budget/expense months that might be outside the range
  const budgetMonths = monthlyBudgets.map((b) => b.monthKey);
  const expenseMonths = expenses.map((e) => e.monthKey);

  // Combine, remove duplicates, sort descending (newest first)
  const allMonths = Array.from(new Set([...months, ...budgetMonths, ...expenseMonths]))
    .sort()
    .reverse();

  return allMonths;
};

export const fetchCatalog = async ({ outletId } = {}) => {
  await delay();

  const products = (outletId
    ? filterByOutlet(outletInventory, outletId).map(withInventoryPresentation)
    : aggregateInventoryAcrossOutlets()
  ).map((product) => {
    const outletPriceRecord = outletId
      ? outletProductPrices.find((r) => r.productId === product.productId && r.outletId === outletId)
      : null;
    return {
      id: product.productId,
      type: "product",
      name: product.itemName,
      price: outletPriceRecord ? outletPriceRecord.price : product.unitPrice,
      basePrice: product.unitPrice,
      stock: product.currentStock,
    };
  });

  const serviceCards = services.map((service) => {
    // Enrich each product linkage with its product's unit master info
    const enrichedLinkages = (service.productLinkages || []).map((link) => {
      const product = findProductMaster(link.inventoryId);
      const unitMaster = product ? _findUnitMaster(product.unitMasterId) : null;
      return {
        ...link,
        unitMasterId: product?.unitMasterId || null,
        unitMaster: unitMaster ? clone(unitMaster) : null,
        consumptionUnit: link.consumptionUnit || product?.consumptionUnit || "primary",
      };
    });
    const outletPriceRecord = outletId
      ? outletServicePrices.find((r) => r.serviceId === service.id && r.outletId === outletId)
      : null;
    return {
      id: service.id,
      type: "service",
      name: service.serviceName,
      price: service.price,
      duration: service.duration,
      productLinkages: clone(enrichedLinkages),
      price: outletPriceRecord ? outletPriceRecord.price : service.price,
      basePrice: service.price,
      duration: service.duration,
      productLinkages: clone(service.productLinkages || []),
    };
  });

  const packageCards = packages.map((servicePackage) => {
    const outletPriceRecord = outletId
      ? outletPackagePrices.find((r) => r.packageId === servicePackage.id && r.outletId === outletId)
      : null;
    return {
      id: servicePackage.id,
      type: "package",
      name: servicePackage.packageName,
      price: outletPriceRecord ? outletPriceRecord.price : servicePackage.price,
      basePrice: servicePackage.price,
      duration: servicePackage.totalDuration,
      offerLabel: servicePackage.offerLabel,
      serviceCount: servicePackage.serviceCount,
      serviceItems: clone(servicePackage.serviceItems),
      totalOriginalPrice: servicePackage.totalOriginalPrice,
      savings: servicePackage.savings,
      validityDays: servicePackage.validityDays,
      status: servicePackage.status,
      assignedOutletIds: servicePackage.assignedOutletIds,
    };
  })
    .filter((servicePackage) => servicePackage.status === "active")
    .filter(
      (servicePackage) =>
        !outletId ||
        !servicePackage.assignedOutletIds?.length ||
        servicePackage.assignedOutletIds.includes(outletId),
    );

  return clone([...serviceCards, ...packageCards, ...products]);
};

let bills = [
  {
    id: "bill_001", billNumber: "GL-2026-1001", createdAt: "2026-04-22T10:30:00.000Z",
    customer: { name: "Priya Sharma", phone: "+91 98765 10001" }, paymentMethod: "Card",
    outletId: "outlet_hsr", outletName: "HSR Layout", status: "paid", subtotal: 5000, tax: 400, total: 5400,
    lineItems: [
      {
        itemName: "Signature Hair Color", itemType: "service", qty: 1, price: 3200, staffAssigned: "staff_naina",
        productConsumption: [
          { productId: "inv_loreal_tube", qty: 1, unit: "primary" },
          { productId: "inv_bleach", qty: 250, unit: "secondary" }
        ]
      },
      {
        itemName: "Luxury Hair Spa", itemType: "service", qty: 1, price: 1800, staffAssigned: "staff_sia",
        productConsumption: [
          { productId: "inv_hair_spa", qty: 100, unit: "secondary" },
          { productId: "inv_keratin_serum", qty: 20, unit: "secondary" }
        ]
      },
    ],
  },
  {
    id: "bill_002", billNumber: "GL-2026-1002", createdAt: "2026-04-21T14:15:00.000Z",
    customer: { name: "Ananya Reddy", phone: "+91 98765 10002" }, paymentMethod: "UPI",
    outletId: "outlet_hsr", outletName: "HSR Layout", status: "paid", subtotal: 4300, tax: 344, total: 4644,
    lineItems: [
      {
        itemName: "Color Reset Ritual", itemType: "package", qty: 1, price: 4300, staffAssigned: null,
        productConsumption: [
          { productId: "inv_shampoo", qty: 50, unit: "secondary" },
          { productId: "inv_bleach", qty: 100, unit: "secondary" }
        ]
      },
    ],
  },
  {
    id: "bill_003", billNumber: "GL-2026-1003", createdAt: "2026-04-20T11:00:00.000Z",
    customer: { name: "Meera Joshi", phone: "+91 98765 10003" }, paymentMethod: "Cash",
    outletId: "outlet_hsr", outletName: "HSR Layout", status: "paid", subtotal: 2380, tax: 190.4, total: 2570.4,
    lineItems: [
      { itemName: "L'Oreal Color Tube", itemType: "product", qty: 2, price: 580, staffAssigned: null },
      { itemName: "Keratin Repair Serum", itemType: "product", qty: 1, price: 740, staffAssigned: null },
      { itemName: "Deep Nourish Shampoo", itemType: "product", qty: 1, price: 320, staffAssigned: null },
    ],
  },
  {
    id: "bill_004", billNumber: "GL-2026-1004", createdAt: "2026-04-19T16:45:00.000Z",
    customer: { name: "Kavitha Nair", phone: "+91 98765 10004" }, paymentMethod: "Card",
    outletId: "outlet_hsr", outletName: "HSR Layout", status: "paid", subtotal: 650, tax: 52, total: 702,
    lineItems: [
      {
        itemName: "Beard Sculpt", itemType: "service", qty: 1, price: 650, staffAssigned: "staff_naina",
        productConsumption: [
          { productId: "inv_hair_spa", qty: 10, unit: "secondary" }
        ]
      },
    ],
  },
  {
    id: "bill_005", billNumber: "GL-2026-1005", createdAt: "2026-04-18T09:30:00.000Z",
    customer: { name: "Divya Patel", phone: "+91 98765 10005" }, paymentMethod: "UPI",
    outletId: "outlet_hsr", outletName: "HSR Layout", status: "paid", subtotal: 5540, tax: 443.2, total: 5983.2,
    lineItems: [
      {
        itemName: "Signature Hair Color", itemType: "service", qty: 1, price: 3200, staffAssigned: "staff_naina",
        productConsumption: [
          { productId: "inv_loreal_tube", qty: 1, unit: "primary" }
        ]
      },
      { itemName: "Spa Cream Jar", itemType: "product", qty: 1, price: 540, staffAssigned: null },
      {
        itemName: "Luxury Hair Spa", itemType: "service", qty: 1, price: 1800, staffAssigned: "staff_sia",
        productConsumption: [
          { productId: "inv_hair_spa", qty: 50, unit: "secondary" }
        ]
      },
    ],
  },
  {
    id: "bill_006", billNumber: "GL-2026-1006", createdAt: "2026-04-17T13:00:00.000Z",
    customer: { name: "Ritu Kapoor", phone: "+91 98765 10006" }, paymentMethod: "Cash",
    outletId: "outlet_hsr", outletName: "HSR Layout", status: "refunded", subtotal: 1800, tax: 144, total: 1944,
    lineItems: [
      {
        itemName: "Luxury Hair Spa", itemType: "service", qty: 1, price: 1800, staffAssigned: "staff_sia",
        productConsumption: [
          { productId: "inv_hair_spa", qty: 80, unit: "secondary" }
        ]
      },
    ],
  },
];

export const fetchBills = async ({ outletId } = {}) => {
  await delay();
  const filtered = outletId ? bills.filter((b) => b.outletId === outletId) : bills;
  return clone(filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
};

export const fetchBillById = async (billId) => {
  await delay();
  const bill = bills.find((b) => b.id === billId);
  if (!bill) throw new Error("Bill not found.");
  return clone(bill);
};

export const checkoutBill = async (payload) => {
  await delay(500);

  const billNumber = `GL-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;
  const newBill = {
    id: createId("bill"),
    billNumber,
    createdAt: new Date().toISOString(),
    customer: payload.customer,
    paymentMethod: payload.paymentMethod,
    outletId: payload.outletId,
    outletName: outlets.find((o) => o.id === payload.outletId)?.name || "Unknown",
    status: "paid",
    subtotal: payload.subtotal,
    tax: payload.tax,
    total: payload.total,
    lineItems: payload.lineItems,
  };
  bills = [newBill, ...bills];

  // Deduct stock for product consumption from services
  const outletId = payload.outletId;
  for (const lineItem of (payload.lineItems || [])) {
    if (lineItem.itemType === "service" && lineItem.productConsumption) {
      for (const consumption of lineItem.productConsumption) {
        const product = findProductMaster(consumption.productId);
        if (!product) continue;

        const consumptionUnit = consumption.unit || "primary";
        const baseDeduction = _convertToBase(
          consumption.qty,
          product.unitMasterId,
          consumptionUnit,
        );

        // Deduct from outlet inventory
        const outletRecord = outletInventory.find(
          (r) => r.productId === consumption.productId && r.outletId === outletId,
        );
        if (outletRecord) {
          const newStock = Math.max(0, outletRecord.currentStock - baseDeduction);
          outletInventory = outletInventory.map((r) =>
            r.id === outletRecord.id ? { ...r, currentStock: newStock } : r,
          );
        }
      }
    }
  }

  return clone(newBill);
};

export const generatePayrollPreview = async ({ outletId } = {}) => {
  await delay(450);

  const filteredStaff = filterByOutlet(staffMembers, outletId, "assignedOutletId");

  return clone(
    filteredStaff.map((staff) => {
      const commissions = commissionMap[staff.commissionSlab] || 0;
      const taxes =
        staff.taxType === "percentage"
          ? (staff.baseSalary * staff.taxValue) / 100
          : staff.taxValue;
      const advanceEmi = staff.advances.reduce((sum, advance) => sum + advance.emi, 0);
      const netPay =
        staff.baseSalary + commissions - taxes - staff.pfDeduction - advanceEmi;

      return {
        ...withOutletName(staff),
        commissions,
        taxes,
        advanceEmi,
        netPay,
      };
    }),
  );
};

export const fetchDashboardMetrics = async ({ role, outletId } = {}) => {
  await delay();

  const scopedStaff = filterByOutlet(staffMembers, outletId, "assignedOutletId");
  const scopedInventory = outletId
    ? filterByOutlet(outletInventory, outletId)
    : productMasters;
  const scopedExpenses = filterByOutlet(expenses, outletId);

  const selectedOutletsForBudget = outletId
    ? outlets.filter((outlet) => outlet.id === outletId)
    : outlets;

  const totalMonthlyBudget = selectedOutletsForBudget.reduce((sum, outlet) => {
    const budgetRecord = monthlyBudgets.find(
      (b) => b.outletId === outlet.id && b.monthKey === currentMonth,
    );
    return sum + (budgetRecord?.amount || 0);
  }, 0);

  return clone({
    activeOutlets: role === "admin" ? outlets.length : 1,
    staffCount: scopedStaff.length,
    serviceCount: services.length,
    packageCount: packages.length,
    inventoryCount: scopedInventory.length,
    expenseCount: scopedExpenses.length,
    totalBudget: totalMonthlyBudget,
  });
};

export const createOutlet = async (payload) => {
  await delay();
  const outlet = {
    id: payload.id || `outlet_${slugFromName(payload.name) || createId("outlet")}`,
    code: payload.code,
    name: payload.name,
    city: payload.city,
    address: payload.address,
    invoicePrefix: payload.invoicePrefix,
    manager: payload.manager,
  };

  const existingIndex = outlets.findIndex((o) => o.id === outlet.id);
  if (existingIndex >= 0) {
    outlets[existingIndex] = outlet;
  } else {
    outlets = [...outlets, outlet];
  }

  return clone(outlet);
};

let attendanceRecords = [];

export const fetchAttendanceData = async ({ date, outletId }) => {
  await delay();
  const filteredStaff = filterByOutlet(staffMembers, outletId, "assignedOutletId");
  return clone(
    filteredStaff.map((staff) => {
      const record = attendanceRecords.find((r) => r.staffId === staff.id && r.date === date);
      return {
        ...withOutletName(staff),
        attendanceStatus: record?.status || "not_marked",
        checkIn: record?.checkIn || null,
        checkOut: record?.checkOut || null,
        breaks: record?.breaks || [],
      };
    }),
  );
};

export const markAttendance = async ({ staffId, date, status }) => {
  await delay();
  const index = attendanceRecords.findIndex((r) => r.staffId === staffId && r.date === date);
  if (index >= 0) {
    attendanceRecords[index].status = status;
  } else {
    attendanceRecords.push({ staffId, date, status, checkIn: null, checkOut: null, breaks: [] });
  }
  return { success: true };
};

export const checkInStaff = async ({ staffId, date, photoData }) => {
  await delay();
  const index = attendanceRecords.findIndex((r) => r.staffId === staffId && r.date === date);
  const timestamp = new Date().toISOString();
  if (index >= 0) {
    attendanceRecords[index].checkIn = { timestamp, photo: photoData };
    attendanceRecords[index].status = "present";
  } else {
    attendanceRecords.push({
      staffId,
      date,
      status: "present",
      checkIn: { timestamp, photo: photoData },
      checkOut: null,
      breaks: [],
    });
  }
  return { success: true, timestamp };
};

export const checkOutStaff = async ({ staffId, date, photoData }) => {
  await delay();
  const index = attendanceRecords.findIndex((r) => r.staffId === staffId && r.date === date);
  const timestamp = new Date().toISOString();
  if (index >= 0) {
    attendanceRecords[index].checkOut = { timestamp, photo: photoData };
  } else {
    attendanceRecords.push({
      staffId,
      date,
      status: "present",
      checkIn: null,
      checkOut: { timestamp, photo: photoData },
      breaks: [],
    });
  }
  return { success: true, timestamp };
};

export const breakInStaff = async ({ staffId, date, photoData }) => {
  await delay();
  const index = attendanceRecords.findIndex((r) => r.staffId === staffId && r.date === date);
  const timestamp = new Date().toISOString();
  if (index >= 0) {
    attendanceRecords[index].breaks = [...(attendanceRecords[index].breaks || []), { in: timestamp, out: null, photo: photoData }];
  } else {
    attendanceRecords.push({
      staffId,
      date,
      status: "present",
      checkIn: null,
      checkOut: null,
      breaks: [{ in: timestamp, out: null, photo: photoData }],
    });
  }
  return { success: true, timestamp };
};

export const breakOutStaff = async ({ staffId, date, photoData }) => {
  await delay();
  const index = attendanceRecords.findIndex((r) => r.staffId === staffId && r.date === date);
  const timestamp = new Date().toISOString();
  if (index >= 0) {
    const breaks = attendanceRecords[index].breaks || [];
    const lastBreak = breaks[breaks.length - 1];
    if (lastBreak && !lastBreak.out) {
      lastBreak.out = timestamp;
      lastBreak.outPhoto = photoData;
    }
  }
  return { success: true, timestamp };
};

export const fetchOutletProfile = async (outletId) => {
  await delay();
  const outlet = outlets.find((o) => o.id === outletId);
  if (!outlet) throw new Error("Outlet not found");
  return clone(outlet);
};

export const fetchPurchaseOrders = async ({ outletId } = {}) => {
  await delay();

  let result = purchaseOrders.map(po => ({
    ...po,
    supplierName: po.supplierName || "Unknown Supplier",
  }));

  if (outletId) {
    result = result.filter(po => po.outletId === outletId);
  }

  return clone(result);
};

export const approvePurchaseOrder = async (orderId) => {
  await delay(400);

  const orderIndex = purchaseOrders.findIndex((order) => order.id === orderId);

  if (orderIndex === -1) {
    throw new Error("Purchase order not found.");
  }

  purchaseOrders[orderIndex] = {
    ...purchaseOrders[orderIndex],
    status: "approved",
    approvedAt: new Date().toISOString(),
  };

  return clone(purchaseOrders[orderIndex]);
};

export const receivePurchaseOrder = async (orderId) => {
  await delay(400);

  const orderIndex = purchaseOrders.findIndex((order) => order.id === orderId);

  if (orderIndex === -1) {
    throw new Error("Purchase order not found.");
  }

  purchaseOrders[orderIndex] = {
    ...purchaseOrders[orderIndex],
    status: "received",
    receivedAt: new Date().toISOString(),
  };

  return clone(purchaseOrders[orderIndex]);
};

export const generatePayrollPreviewOrders = async () => {
  await delay();
  return clone(purchaseOrders);
};

let settings = {
  profile: {
    companyName: "Luxury Salon",
    email: "contact@luxurysalon.com",
    phone: "+91 98765 43210",
    address: "123 Main Street, Bangalore",
  },
  notifications: {
    emailNotifications: true,
    smsNotifications: false,
    appointmentReminders: true,
    marketingEmails: false,
  },
  appearance: {
    theme: "light",
    primaryColor: "#1e3a5f",
    language: "en",
  },
  security: {
    twoFactorAuth: false,
    sessionTimeout: 30,
  },
};

export const fetchSettings = async () => {
  await delay(300);
  return clone(settings);
};

export const saveSettings = async (newSettings) => {
  await delay(600);
  settings = {
    ...settings,
    ...newSettings,
  };
  return clone(settings);
};

export const fetchOutletPrices = async ({ outletId } = {}) => {
  await delay();
  const productPrices = (outletId
    ? outletProductPrices.filter((r) => r.outletId === outletId)
    : outletProductPrices
  ).map((r) => {
    const product = findProductMaster(r.productId);
    return { ...r, itemName: product?.itemName || r.productId, type: "product", basePrice: product?.unitPrice || 0 };
  });
  const servicePrices = (outletId
    ? outletServicePrices.filter((r) => r.outletId === outletId)
    : outletServicePrices
  ).map((r) => {
    const service = services.find((s) => s.id === r.serviceId);
    return { ...r, itemName: service?.serviceName || r.serviceId, type: "service", basePrice: service?.price || 0 };
  });
  const packagePrices = (outletId
    ? outletPackagePrices.filter((r) => r.outletId === outletId)
    : outletPackagePrices
  ).map((r) => {
    const pkg = packages.find((p) => p.id === r.packageId);
    return { ...r, itemName: pkg?.packageName || r.packageId, type: "package", basePrice: pkg?.price || 0 };
  });
  return clone([...productPrices, ...servicePrices, ...packagePrices]);
};

export const saveOutletItemPrice = async (payload) => {
  await delay();
  const { type, outletId, price } = payload;
  const parsedPrice = Number(price);
  if (!Number.isFinite(parsedPrice) || parsedPrice < 0) throw new Error("Invalid price value.");
  if (type === "product") {
    const idx = outletProductPrices.findIndex((r) => r.productId === payload.productId && r.outletId === outletId);
    if (idx >= 0) outletProductPrices[idx].price = parsedPrice;
    else outletProductPrices.push({ productId: payload.productId, outletId, price: parsedPrice });
  } else if (type === "service") {
    const idx = outletServicePrices.findIndex((r) => r.serviceId === payload.serviceId && r.outletId === outletId);
    if (idx >= 0) outletServicePrices[idx].price = parsedPrice;
    else outletServicePrices.push({ serviceId: payload.serviceId, outletId, price: parsedPrice });
  } else if (type === "package") {
    const idx = outletPackagePrices.findIndex((r) => r.packageId === payload.packageId && r.outletId === outletId);
    if (idx >= 0) outletPackagePrices[idx].price = parsedPrice;
    else outletPackagePrices.push({ packageId: payload.packageId, outletId, price: parsedPrice });
  } else {
    throw new Error("Unknown item type.");
  }
  return { success: true };
};

export const deleteOutletItemPrice = async (payload) => {
  await delay();
  const { type, outletId } = payload;
  if (type === "product") {
    outletProductPrices = outletProductPrices.filter(
      (r) => !(r.productId === payload.productId && r.outletId === outletId),
    );
  } else if (type === "service") {
    outletServicePrices = outletServicePrices.filter(
      (r) => !(r.serviceId === payload.serviceId && r.outletId === outletId),
    );
  } else if (type === "package") {
    outletPackagePrices = outletPackagePrices.filter(
      (r) => !(r.packageId === payload.packageId && r.outletId === outletId),
    );
  }
  return { success: true };
};

export const deleteService = async (serviceId) => {
  await delay(400);
  const serviceIndex = services.findIndex((s) => s.id === serviceId);
  if (serviceIndex === -1) {
    throw new Error("Service not found.");
  }
  services = services.filter((s) => s.id !== serviceId);
  return { success: true, message: "Service deleted successfully" };
};

let groups = [
  {
    id: "grp-001",
    name: "Senior Stylists",
    code: "GRP-SNR-HS",
    description: "Experienced hair stylists with 5+ years",
    members: ["staff_naina", "staff_rahul"],
    contractId: "contract_001",
  },
];

export const fetchGroups = async () => {
  await delay(300);
  return clone(groups);
};

export const saveGroup = async (groupData) => {
  await delay(500);
  const existingIndex = groups.findIndex((g) => g.id === groupData.id);
  if (existingIndex >= 0) {
    groups[existingIndex] = { ...groups[existingIndex], ...groupData };
    return clone(groups[existingIndex]);
  } else {
    const newGroup = {
      ...groupData,
      id: groupData.id || `grp_${createId("group")}`,
    };
    groups.push(newGroup);
    return clone(newGroup);
  }
};

export const deleteEmployee = async (staffId) => {
  await delay(400);
  const staffIndex = staffMembers.findIndex((s) => s.id === staffId);
  if (staffIndex === -1) {
    throw new Error("Employee not found.");
  }
  staffMembers = staffMembers.filter((s) => s.id !== staffId);
  return { success: true, message: "Employee deleted successfully" };
};

export const exportPayrollToCSV = (records) => {
  const headers = ["Employee ID", "Name", "Role", "Base Salary", "Allowances", "Commissions", "Deductions", "Net Pay", "Status"];
  const rows = records.map(r => [
    r.employeeId,
    r.name,
    r.role,
    r.baseSalary,
    r.allowances,
    r.commissions,
    r.deductions,
    r.netPay,
    r.status
  ]);
  return [headers, ...rows];
};

export const calculateAllSalaries = async (month) => {
  await delay(1000);
  return {
    success: true,
    message: `Salaries calculated for ${month}`,
    calculatedCount: staffMembers.length,
  };
};

// Calculate commission for a specific employee
export const fetchEmployeeCommission = async (staffId, month) => {
  await delay(300);
  const staff = staffMembers.find((s) => s.id === staffId);
  if (!staff) {
    throw new Error("Employee not found.");
  }

  const { totalSales, saleCount } = calculateEmployeeMonthlySales(staffId, month);
  const commissionData = calculateCommission(totalSales, saleCount);

  return clone({
    employeeId: staffId,
    employeeName: staff.name,
    month,
    ...commissionData,
  });
};

// Fetch payroll records with commission calculation for all employees
export const fetchPayrollWithCommission = async (month) => {
  await delay(800);

  const payrollRecords = staffMembers.map((staff) => {
    const { totalSales, saleCount } = calculateEmployeeMonthlySales(staff.id, month);
    const commissionData = calculateCommission(totalSales, saleCount);

    // Calculate base salary components
    const baseSalary = staff.baseSalary || 30000;
    const pfDeduction = staff.pfDeduction || Math.round(baseSalary * 0.12);
    const taxDeduction = staff.taxType === "percentage"
      ? Math.round((baseSalary * staff.taxValue) / 100)
      : staff.taxValue || 0;

    // Fixed allowances
    const allowances = 3500; // HRA + Medical + Travel

    // Total commission from badge system
    const commissionAmount = commissionData.amount;

    // Calculate net pay
    const grossPay = baseSalary + allowances + commissionAmount;
    const totalDeductions = pfDeduction + taxDeduction;
    const netPay = grossPay - totalDeductions;

    return {
      id: staff.id,
      employeeId: staff.id,
      name: staff.name,
      role: staff.role,
      baseSalary,
      allowances,
      commissions: commissionAmount,
      deductions: totalDeductions,
      netPay,
      status: 'calculated',
      attendance: { present: 24, absent: 1, leaves: 1 }, // Mock attendance
      commissionInfo: commissionData,
    };
  });

  return clone(payrollRecords);
};

// Get commission badge configuration
export const fetchCommissionBadgeConfig = async () => {
  await delay(200);
  return clone(commissionBadgeConfig);
};

export const fetchRevenueChart = async ({ outletId } = {}) => {
  await delay(200);
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const base = outletId ? [4200, 3800, 5100, 6400, 4700, 8200, 7100] : [12400, 10800, 14300, 18600, 13900, 24500, 21300];
  return clone(days.map((day, i) => ({ day, revenue: base[i] })));
};

export const fetchTodayOrders = async ({ outletId } = {}) => {
  await delay(200);
  const filtered = outletId ? bills.filter((b) => b.outletId === outletId) : bills;
  const todayCount = filtered.length > 0 ? Math.min(filtered.length, 4) : 0;
  const todayRevenue = filtered.slice(0, todayCount).reduce((sum, b) => sum + b.total, 0);
  const recentBills = filtered.slice(0, 5).map((b) => ({
    id: b.id,
    billNumber: b.billNumber,
    customer: b.customer.name,
    total: b.total,
    paymentMethod: b.paymentMethod,
    status: b.status,
  }));
  return clone({ todayCount, todayRevenue, recentBills });
};

// Contract data and APIs
let contracts = [
  {
    id: "contract_001",
    code: "CON-2026-001",
    title: "Senior Stylist Agreement",
    employeeId: "staff_naina",
    employeeName: "Naina Shah",
    groupId: "grp-001",
    groupName: "Senior Stylists",
    typeId: "type_fulltime",
    typeName: "Full-time Employment",
    templateId: "template_senior",
    templateName: "Senior Staff Template",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    status: "active",
    notes: "Annual contract with performance review",
    salaryComponents: [
      { id: "sal_basic", name: "Basic Salary", type: "earning", calculationType: "fixed", amount: 32000 },
    ],
    overtime: { enabled: true, type: "1.5x", rateCalculation: "fixed_hourly", rateValue: 200 },
    holidayGroupIds: ["hol_default"],
    leaveAllocations: [],
    shiftId: "shift_day",
    shiftEffectiveDate: "2026-01-01",
    weeklyOffPattern: ["Sunday"],
    revisions: [],
    currentVersion: 1,
  },
  {
    id: "contract_002",
    code: "CON-2026-002",
    title: "Color Specialist Agreement",
    employeeId: "staff_rohan",
    employeeName: "Rohan Iyer",
    groupId: "grp-001",
    groupName: "Senior Stylists",
    typeId: "type_fulltime",
    typeName: "Full-time Employment",
    templateId: "template_senior",
    templateName: "Senior Staff Template",
    startDate: "2026-02-01",
    endDate: "2027-01-31",
    status: "active",
    notes: "Specialist role with commission structure",
    salaryComponents: [
      { id: "sal_basic", name: "Basic Salary", type: "earning", calculationType: "fixed", amount: 36000 },
    ],
    overtime: { enabled: true, type: "1.5x", rateCalculation: "fixed_hourly", rateValue: 225 },
    holidayGroupIds: ["hol_default"],
    leaveAllocations: [],
    shiftId: "shift_day",
    shiftEffectiveDate: "2026-02-01",
    weeklyOffPattern: ["Sunday"],
    revisions: [],
    currentVersion: 1,
  },
  {
    id: "contract_003",
    code: "CON-2026-003",
    title: "Reception Lead Agreement",
    employeeId: "staff_sia",
    employeeName: "Sia Fernandes",
    groupId: "",
    groupName: "",
    typeId: "type_fulltime",
    typeName: "Full-time Employment",
    templateId: "template_standard",
    templateName: "Standard Staff Template",
    startDate: "2026-01-15",
    endDate: "2026-12-31",
    status: "active",
    notes: "Front desk management role",
    salaryComponents: [
      { id: "sal_basic", name: "Basic Salary", type: "earning", calculationType: "fixed", amount: 24000 },
    ],
    overtime: { enabled: false, type: "none", rateCalculation: "fixed_hourly", rateValue: 0 },
    holidayGroupIds: ["hol_default"],
    leaveAllocations: [],
    shiftId: "shift_day",
    shiftEffectiveDate: "2026-01-15",
    weeklyOffPattern: ["Sunday"],
    revisions: [],
    currentVersion: 1,
  },
];

// Salary Masters Data
let salaryMasters = [
  {
    id: "sal_basic",
    name: "Basic Salary",
    code: "BASIC",
    description: "Base monthly salary component",
    type: "earning",
    calculationType: "fixed",
    defaultAmount: 30000,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "sal_hra",
    name: "House Rent Allowance (HRA)",
    code: "HRA",
    description: "Housing allowance for rented accommodation",
    type: "earning",
    calculationType: "percentage",
    defaultAmount: 40,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "sal_da",
    name: "Dearness Allowance",
    code: "DA",
    description: "Cost of living adjustment allowance",
    type: "earning",
    calculationType: "percentage",
    defaultAmount: 10,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "sal_medical",
    name: "Medical Allowance",
    code: "MEDICAL",
    description: "Medical and health-related expenses",
    type: "earning",
    calculationType: "fixed",
    defaultAmount: 1500,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "sal_travel",
    name: "Travel Allowance",
    code: "TRAVEL",
    description: "Transportation and travel expenses",
    type: "earning",
    calculationType: "fixed",
    defaultAmount: 2000,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "sal_pf_emp",
    name: "Provident Fund - Employee",
    code: "PF_EMP",
    description: "Employee contribution to provident fund",
    type: "deduction",
    calculationType: "percentage",
    defaultAmount: 12,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "sal_pf_employer",
    name: "Provident Fund - Employer",
    code: "PF_EMPLOYER",
    description: "Employer contribution to provident fund",
    type: "deduction",
    calculationType: "percentage",
    defaultAmount: 12,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "sal_professional_tax",
    name: "Professional Tax",
    code: "PROF_TAX",
    description: "State professional tax deduction",
    type: "deduction",
    calculationType: "fixed",
    defaultAmount: 200,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "sal_tds",
    name: "Tax Deducted at Source (TDS)",
    code: "TDS",
    description: "Income tax deduction",
    type: "deduction",
    calculationType: "percentage",
    defaultAmount: 10,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "sal_esi",
    name: "Employee State Insurance",
    code: "ESI",
    description: "State insurance contribution",
    type: "deduction",
    calculationType: "percentage",
    defaultAmount: 1.75,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  }
];

const withContractPresentation = (contract) => {
  const employee = staffMembers.find((s) => s.id === contract.employeeId);
  return {
    ...contract,
    employeeName: employee?.name || contract.employeeName || "Unknown",
    employeeRole: employee?.role || "",
  };
};

export const fetchContracts = async () => {
  await delay(300);
  return clone(contracts.map(withContractPresentation));
};

export const fetchContractById = async (contractId) => {
  await delay(300);
  const contract = contracts.find((c) => c.id === contractId);
  if (!contract) {
    throw new Error("Contract not found");
  }
  return clone(withContractPresentation(contract));
};

export const saveContract = async (payload) => {
  await delay(500);

  const existingContract = contracts.find((c) => c.id === payload.id);
  const employee = staffMembers.find((s) => s.id === payload.employeeId);

  const contractData = {
    ...payload,
    employeeName: employee?.name || payload.employeeName || "",
  };

  if (existingContract) {
    // Update existing
    const index = contracts.findIndex((c) => c.id === payload.id);
    contracts[index] = { ...existingContract, ...contractData, updatedAt: new Date().toISOString() };
    return clone(withContractPresentation(contracts[index]));
  } else {
    // Create new
    const newContract = {
      ...contractData,
      id: payload.id || createId("contract"),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    contracts = [newContract, ...contracts];
    return clone(withContractPresentation(newContract));
  }
};

export const deleteContract = async (contractId) => {
  await delay(400);
  const contractIndex = contracts.findIndex((c) => c.id === contractId);
  if (contractIndex === -1) {
    throw new Error("Contract not found");
  }
  contracts = contracts.filter((c) => c.id !== contractId);
  return { success: true, message: "Contract deleted successfully" };
};

// Salary Masters API Functions
export const fetchSalaryMasters = async () => {
  await delay(300);
  return clone(salaryMasters);
};

export const fetchSalaryMasterById = async (id) => {
  await delay(300);
  const salaryMaster = salaryMasters.find((sm) => sm.id === id);
  if (!salaryMaster) {
    throw new Error("Salary master not found");
  }
  return clone(salaryMaster);
};

export const saveSalaryMaster = async (payload) => {
  await delay(400);

  const salaryMaster = {
    id: payload.id || createId("sal"),
    name: payload.name,
    code: payload.code || payload.name.substring(0, 3).toUpperCase(),
    description: payload.description || "",
    type: payload.type,
    calculationType: payload.calculationType,
    defaultAmount: Number(payload.defaultAmount),
    isActive: payload.isActive !== undefined ? payload.isActive : true,
    createdAt: payload.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const existingIndex = salaryMasters.findIndex((sm) => sm.id === salaryMaster.id);

  if (existingIndex >= 0) {
    salaryMasters[existingIndex] = { ...salaryMasters[existingIndex], ...salaryMaster };
  } else {
    salaryMasters = [salaryMaster, ...salaryMasters];
  }

  return clone(salaryMaster);
};

export const deleteSalaryMaster = async (id) => {
  await delay(400);
  const index = salaryMasters.findIndex((sm) => sm.id === id);
  if (index === -1) {
    throw new Error("Salary master not found");
  }
  salaryMasters = salaryMasters.filter((sm) => sm.id !== id);
  return { success: true, message: "Salary master deleted successfully" };
};

export const toggleSalaryMasterStatus = async (id) => {
  await delay(300);
  const index = salaryMasters.findIndex((sm) => sm.id === id);
  if (index === -1) {
    throw new Error("Salary master not found");
  }
  salaryMasters[index] = {
    ...salaryMasters[index],
    isActive: !salaryMasters[index].isActive,
    updatedAt: new Date().toISOString(),
  };
  return clone(salaryMasters[index]);
};

// ─── Multi-product Purchase Order ────────────────────────────────────────────

export const createMultiProductPurchaseOrder = async (payload) => {
  await delay();

  const { supplierName, items, taxRate, notes } = payload;

  if (!items || items.length === 0) {
    throw new Error("At least one product is required.");
  }

  const orderItems = items.map((item) => {
    const product = productMasters.find((p) => p.id === item.productId);
    if (!product) throw new Error(`Product not found: ${item.productId}`);
    const qty = Math.max(1, Number(item.qty) || 0);
    return {
      productId: product.id,
      productName: product.itemName,
      qty,
      unitPrice: Number(item.unitPrice) || product.unitPrice,
    };
  });

  const subtotal = orderItems.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
  const tax = Math.round(subtotal * ((Number(taxRate) || 0) / 100) * 100) / 100;
  const totalCost = subtotal + tax;

  // Update central stock for each item
  orderItems.forEach((item) => {
    productMasters = productMasters.map((p) =>
      p.id === item.productId
        ? { ...p, centralStock: p.centralStock + item.qty }
        : p,
    );
  });

  const poNumber = `PO-${new Date().getFullYear()}-${String(purchaseOrders.length + 1).padStart(3, "0")}`;

  const purchaseOrder = {
    id: createId("po"),
    poNumber,
    supplierName: supplierName || "Direct Purchase",
    supplierContact: "",
    supplierEmail: "",
    status: "pending",
    orderDate: new Date().toISOString().slice(0, 10),
    expectedDate: "",
    totalCost,
    subtotal,
    taxRate: Number(taxRate) || 0,
    taxAmount: tax,
    notes: notes || "",
    items: orderItems,
  };

  purchaseOrders = [purchaseOrder, ...purchaseOrders];

  return clone(purchaseOrder);
};
