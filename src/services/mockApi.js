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

let productMasters = [
  {
    id: "inv_loreal_tube",
    itemName: "L'Oreal Color Tube",
    unitPrice: 580,
    centralStock: 18,
  },
  {
    id: "inv_keratin_serum",
    itemName: "Keratin Repair Serum",
    unitPrice: 740,
    centralStock: 12,
  },
  {
    id: "inv_shampoo",
    itemName: "Deep Nourish Shampoo",
    unitPrice: 320,
    centralStock: 25,
  },
  {
    id: "inv_bleach",
    itemName: "Pro Bleach Powder",
    unitPrice: 890,
    centralStock: 9,
  },
  {
    id: "inv_hair_spa",
    itemName: "Spa Cream Jar",
    unitPrice: 540,
    centralStock: 14,
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

let purchaseOrders = [
  {
    id: "po_001",
    supplierName: "L'Oreal Professional",
    productId: "inv_loreal_tube",
    qty: 12,
    totalCost: 6960,
    createdAt: "2026-04-03T09:00:00.000Z",
  },
  {
    id: "po_002",
    supplierName: "Keracare Distributors",
    productId: "inv_keratin_serum",
    qty: 8,
    totalCost: 5920,
    createdAt: "2026-04-05T11:30:00.000Z",
  },
];

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
    id: "svc_hair_color",
    serviceName: "Signature Hair Color",
    price: 3200,
    duration: 120,
    productLinkages: [
      { inventoryId: "inv_loreal_tube", quantityUsed: 1 },
      { inventoryId: "inv_keratin_serum", quantityUsed: 1 },
    ],
  },
  {
    id: "svc_hair_spa",
    serviceName: "Luxury Hair Spa",
    price: 1800,
    duration: 60,
    productLinkages: [{ inventoryId: "inv_hair_spa", quantityUsed: 1 }],
  },
  {
    id: "svc_beard_trim",
    serviceName: "Beard Sculpt",
    price: 650,
    duration: 25,
    productLinkages: [],
  },
];

let serviceCategories = [
  { id: "cat_hair", name: "Hair", code: "HAIR", status: "active" },
  { id: "cat_nails", name: "Nails", code: "NAILS", status: "active" },
  { id: "cat_skin", name: "Skin", code: "SKIN", status: "active" },
  { id: "cat_grooming", name: "Grooming", code: "GROOM", status: "active" },
];

const cloneLinkages = (linkages = []) =>
  linkages.map((linkage) => ({
    inventoryId: linkage.inventoryId,
    quantityUsed: Number(linkage.quantityUsed),
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

const withProductPresentation = (product) => ({
  ...product,
  issuedStock: getIssuedStock(product.id),
  totalNetworkStock: product.centralStock + getIssuedStock(product.id),
});

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
  return clone(outlets);
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

  const qty = Math.max(1, Number(payload.qty) || 0);

  productMasters = productMasters.map((item) =>
    item.id === productId
      ? { ...item, centralStock: item.centralStock + qty }
      : item,
  );

  const purchaseOrder = {
    id: createId("po"),
    supplierName: payload.supplierName,
    productId,
    qty,
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
    productLinkages: payload.productLinkages.map((linkage) => ({
      inventoryId: linkage.inventoryId,
      quantityUsed: Number(linkage.quantityUsed),
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

export const fetchExpenses = async ({ outletId } = {}) => {
  await delay();

  return clone(
    filterByOutlet(expenses, outletId)
      .filter((expense) => expense.monthKey === currentMonth)
      .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt)),
  );
};

export const createExpense = async (payload) => {
  await delay();

  const expense = {
    id: createId("exp"),
    itemName: payload.itemName,
    qty: Number(payload.qty),
    price: Number(payload.price),
    totalAmount: Number(payload.totalAmount),
    billNo: payload.billNo,
    outletId: payload.outletId,
    monthKey: currentMonth,
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

export const fetchBudgetSummary = async ({ outletId } = {}) => {
  await delay();

  const selectedOutlets = outletId
    ? outlets.filter((outlet) => outlet.id === outletId)
    : outlets;
  
  const totalMonthlyBudget = selectedOutlets.reduce((sum, outlet) => {
    const budgetRecord = monthlyBudgets.find(
      (b) => b.outletId === outlet.id && b.monthKey === currentMonth,
    );
    return sum + (budgetRecord?.amount || 0);
  }, 0);

  const totalExpensesSoFar = expenses
    .filter((expense) => expense.monthKey === currentMonth)
    .filter((expense) => !outletId || expense.outletId === outletId)
    .reduce((sum, expense) => sum + expense.totalAmount, 0);

  return clone({
    totalMonthlyBudget,
    totalExpensesSoFar,
    remainingBalance: totalMonthlyBudget - totalExpensesSoFar,
    monthKey: currentMonth,
    budgets: selectedOutlets.map(outlet => {
      const budgetRecord = monthlyBudgets.find(
        (b) => b.outletId === outlet.id && b.monthKey === currentMonth,
      );
      return {
        outletId: outlet.id,
        outletName: outlet.name,
        amount: budgetRecord?.amount || 0
      };
    })
  });
};

export const updateMonthlyBudget = async ({ outletId, amount }) => {
  await delay();
  const existingIndex = monthlyBudgets.findIndex(
    (b) => b.outletId === outletId && b.monthKey === currentMonth,
  );

  if (existingIndex >= 0) {
    monthlyBudgets[existingIndex].amount = Number(amount);
  } else {
    monthlyBudgets.push({
      outletId,
      monthKey: currentMonth,
      amount: Number(amount),
    });
  }

  return fetchBudgetSummary({ outletId });
};

export const fetchCatalog = async ({ outletId } = {}) => {
  await delay();

  const products = (outletId
    ? filterByOutlet(outletInventory, outletId).map(withInventoryPresentation)
    : aggregateInventoryAcrossOutlets()
  ).map((product) => ({
    id: product.productId,
    type: "product",
    name: product.itemName,
    price: product.unitPrice,
    stock: product.currentStock,
  }));

  const serviceCards = services.map((service) => ({
    id: service.id,
    type: "service",
    name: service.serviceName,
    price: service.price,
    duration: service.duration,
  }));

  const packageCards = packages.map((servicePackage) => ({
    id: servicePackage.id,
    type: "package",
    name: servicePackage.packageName,
    price: servicePackage.price,
    duration: servicePackage.totalDuration,
    offerLabel: servicePackage.offerLabel,
    serviceCount: servicePackage.serviceCount,
    serviceItems: clone(servicePackage.serviceItems),
    totalOriginalPrice: servicePackage.totalOriginalPrice,
    savings: servicePackage.savings,
    validityDays: servicePackage.validityDays,
    status: servicePackage.status,
    assignedOutletIds: servicePackage.assignedOutletIds,
  }))
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
      { itemName: "Signature Hair Color", itemType: "service", qty: 1, price: 3200, staffAssigned: "staff_naina" },
      { itemName: "Luxury Hair Spa", itemType: "service", qty: 1, price: 1800, staffAssigned: "staff_sia" },
    ],
  },
  {
    id: "bill_002", billNumber: "GL-2026-1002", createdAt: "2026-04-21T14:15:00.000Z",
    customer: { name: "Ananya Reddy", phone: "+91 98765 10002" }, paymentMethod: "UPI",
    outletId: "outlet_hsr", outletName: "HSR Layout", status: "paid", subtotal: 4300, tax: 344, total: 4644,
    lineItems: [
      { itemName: "Color Reset Ritual", itemType: "package", qty: 1, price: 4300, staffAssigned: null },
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
      { itemName: "Beard Sculpt", itemType: "service", qty: 1, price: 650, staffAssigned: "staff_naina" },
    ],
  },
  {
    id: "bill_005", billNumber: "GL-2026-1005", createdAt: "2026-04-18T09:30:00.000Z",
    customer: { name: "Divya Patel", phone: "+91 98765 10005" }, paymentMethod: "UPI",
    outletId: "outlet_hsr", outletName: "HSR Layout", status: "paid", subtotal: 5540, tax: 443.2, total: 5983.2,
    lineItems: [
      { itemName: "Signature Hair Color", itemType: "service", qty: 1, price: 3200, staffAssigned: "staff_naina" },
      { itemName: "Spa Cream Jar", itemType: "product", qty: 1, price: 540, staffAssigned: null },
      { itemName: "Luxury Hair Spa", itemType: "service", qty: 1, price: 1800, staffAssigned: "staff_sia" },
    ],
  },
  {
    id: "bill_006", billNumber: "GL-2026-1006", createdAt: "2026-04-17T13:00:00.000Z",
    customer: { name: "Ritu Kapoor", phone: "+91 98765 10006" }, paymentMethod: "Cash",
    outletId: "outlet_hsr", outletName: "HSR Layout", status: "refunded", subtotal: 1800, tax: 144, total: 1944,
    lineItems: [
      { itemName: "Luxury Hair Spa", itemType: "service", qty: 1, price: 1800, staffAssigned: "staff_sia" },
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
    attendanceRecords.push({ staffId, date, status });
  }
  return { success: true };
};

export const fetchOutletProfile = async (outletId) => {
  await delay();
  const outlet = outlets.find((o) => o.id === outletId);
  if (!outlet) throw new Error("Outlet not found");
  return clone(outlet);
};
