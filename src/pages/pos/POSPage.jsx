import { useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams, useLocation, useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { fetchStaff, fetchSettings, fetchPOSCatalogFromAPI, checkoutBillAPI, fetchOutletsFromAPI, fetchProductsFromAPI, fetchOutletInventoryFromAPI, validateCouponAPI, fetchCustomersAPI, fetchBillByIdFromAPI, updateBillAPI } from "../../services/api";
import { useAuthStore } from "../../stores/authStore";
import { useToastStore } from "../../stores/toastStore";
import { formatCurrency } from "../../utils/format";
import { getAvailableUnits, getUnitAbbr, convertToBase } from "../../utils/unitConversion";
import { InvoiceModal } from "./InvoiceModal";
import { TerminalSelectModal } from "./components/TerminalSelectModal";
import { OpenShiftModal } from "./components/OpenShiftModal";
import { CashMovementModal } from "./components/CashMovementModal";
import { XReportModal } from "./components/XReportModal";
import { CloseShiftModal } from "./components/CloseShiftModal";
import { ZReportPrintModal } from "./components/ZReportPrintModal";
import { fetchTerminalsAPI, createTerminalAPI, fetchActiveShiftAPI, openShiftAPI, addCashMovementAPI } from "../../services/posShiftApi";
import { Search, Minus, Plus, Trash2, ShoppingCart, ArrowLeftRight, Tag, AlertCircle, CreditCard, Keyboard, HelpCircle, X, User, Edit, ChevronDown, ChevronUp, Monitor, PlayCircle, StopCircle, CheckCircle2, FileText } from "lucide-react";
import BankSelector from "../../modules/bank/components/BankSelector";

const paymentMethods = ["Cash", "Card", "UPI", "Store Credit", "Split"];

const createLineId = () => `line_${Math.random().toString(36).slice(2, 9)}`;

export function POSPage() {
  const user = useAuthStore((state) => state.user);
  const toast = useToastStore();
  const [catalog, setCatalog] = useState([]);
  const [filteredCatalog, setFilteredCatalog] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [customer, setCustomer] = useState({ name: "", phone: "" });
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCrmCustomer, setSelectedCrmCustomer] = useState(null);

  const resetCustomerFields = () => {
    setSelectedCrmCustomer(null);
    setCustomer({ name: "", phone: "" });
  };

  const handleCustomerSearch = async (query) => {
    if (!query || query.trim().length < 2) {
      setCustomerSuggestions([]);
      setShowCustomerDropdown(false);
      return;
    }
    try {
      const res = await fetchCustomersAPI({ search: query });
      setCustomerSuggestions(res.customers || []);
      setShowCustomerDropdown(true);
    } catch (err) {
      console.error("Failed to fetch customer suggestions:", err);
    }
  };
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [selectedBankId, setSelectedBankId] = useState("");
  const [showInvoice, setShowInvoice] = useState(false);
  const [currentBill, setCurrentBill] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [outlets, setOutlets] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState("");
  const [productMasters, setProductMasters] = useState([]);
  const [outletInventory, setOutletInventory] = useState([]);
  const [discountType, setDiscountType] = useState("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [stockErrors, setStockErrors] = useState([]);
  const [allowOutOfStockCheckout, setAllowOutOfStockCheckout] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState([]);
  const [transactionReference, setTransactionReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [showShortcutGuide, setShowShortcutGuide] = useState(false);
  const [showBillBreakdown, setShowBillBreakdown] = useState(false);
  const searchInputRef = useRef(null);
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [editingBillId, setEditingBillId] = useState(null);
  const [editingBillNumber, setEditingBillNumber] = useState("");

  // POS Terminal & Shift state
  const [posTerminals, setPosTerminals] = useState([]);
  const [selectedTerminal, setSelectedTerminal] = useState(null);
  const [activeShift, setActiveShift] = useState(null);
  const [shiftLoading, setShiftLoading] = useState(false);

  // Shift Modals state
  const [showTerminalModal, setShowTerminalModal] = useState(false);
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [showCashMovementModal, setShowCashMovementModal] = useState(false);
  const [showXReportModal, setShowXReportModal] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [showZReportModal, setShowZReportModal] = useState(false);
  const [zReportData, setZReportData] = useState(null);

  // Load terminals and check active shift
  useEffect(() => {
    const targetOutletId = selectedOutlet || user?.outlet_id;
    if (!targetOutletId) return;

    const loadShiftData = async () => {
      setShiftLoading(true);
      try {
        const res = await fetchTerminalsAPI(targetOutletId);
        if (res.success) {
          const list = res.terminals || [];
          setPosTerminals(list);

          let currentTerm = null;
          const savedTermId = localStorage.getItem("glowy-selected-terminal-id");
          if (savedTermId) {
            currentTerm = list.find((t) => t.id === parseInt(savedTermId, 10)) || null;
          }

          if (!currentTerm && list.length > 0) {
            currentTerm = list[0];
          }

          setSelectedTerminal(currentTerm);

          if (currentTerm) {
            const shiftRes = await fetchActiveShiftAPI(currentTerm.id);
            if (shiftRes.success && shiftRes.shift) {
              setActiveShift(shiftRes.shift);
            } else {
              setActiveShift(null);
            }
          } else {
            setActiveShift(null);
          }
        }
      } catch (err) {
        console.error("Error loading terminal/shift data:", err);
      } finally {
        setShiftLoading(false);
      }
    };

    loadShiftData();
  }, [selectedOutlet, user?.outlet_id]);

  const handleSelectTerminal = async (term) => {
    setSelectedTerminal(term);
    localStorage.setItem("glowy-selected-terminal-id", term.id.toString());
    setShowTerminalModal(false);

    try {
      const shiftRes = await fetchActiveShiftAPI(term.id);
      if (shiftRes.success && shiftRes.shift) {
        setActiveShift(shiftRes.shift);
        toast.info(`Switched to terminal "${term.name}" with active shift.`);
      } else {
        setActiveShift(null);
        setShowOpenShiftModal(true);
      }
    } catch (err) {
      console.error("Error checking terminal shift:", err);
    }
  };

  const handleCreateTerminal = async (payload) => {
    try {
      const targetOutletId = selectedOutlet || user?.outlet_id;
      const res = await createTerminalAPI({ ...payload, outlet_id: targetOutletId });
      if (res.success) {
        toast.success(`Terminal "${res.terminal.name}" created successfully.`);
        const termRes = await fetchTerminalsAPI(targetOutletId);
        if (termRes.success) setPosTerminals(termRes.terminals);
        handleSelectTerminal(res.terminal);
      }
    } catch (err) {
      toast.error(err.message || "Failed to create terminal");
    }
  };

  const handleOpenShift = async (payload) => {
    setShiftLoading(true);
    try {
      const targetOutletId = selectedOutlet || user?.outlet_id;
      const res = await openShiftAPI({ ...payload, outlet_id: targetOutletId });
      if (res.success) {
        setActiveShift(res.shift);
        setShowOpenShiftModal(false);
        toast.success(`Shift opened on terminal "${selectedTerminal?.name}" with float ${formatCurrency(payload.opening_cash)}`);
      }
    } catch (err) {
      toast.error(err.message || "Failed to open shift");
    } finally {
      setShiftLoading(false);
    }
  };

  const handleAddCashMovement = async (payload) => {
    if (!activeShift) return;
    setShiftLoading(true);
    try {
      const res = await addCashMovementAPI(activeShift.id, payload);
      if (res.success) {
        toast.success(`Cash ${payload.type === 'CASH_IN' ? 'In' : 'Out'} recorded successfully.`);
        setShowCashMovementModal(false);
        const shiftRes = await fetchActiveShiftAPI(selectedTerminal.id);
        if (shiftRes.success) setActiveShift(shiftRes.shift);
      }
    } catch (err) {
      toast.error(err.message || "Failed to record cash movement");
    } finally {
      setShiftLoading(false);
    }
  };

  const handleShiftClosed = (reportData) => {
    setActiveShift(null);
    setShowCloseShiftModal(false);
    setZReportData(reportData);
    setShowZReportModal(true);
    toast.success("Shift closed successfully. Z-Report generated.");
  };

  // Load bill for editing if editBillId query param or state exists
  useEffect(() => {
    const editBillId = searchParams.get("editBillId");
    const stateBill = location.state?.editBill;

    if (!editBillId && !stateBill) return;

    const loadBillToEdit = async () => {
      try {
        let billData = stateBill;
        if (!billData && editBillId) {
          billData = await fetchBillByIdFromAPI(editBillId);
        }
        if (!billData) return;

        setEditingBillId(billData.id);
        setEditingBillNumber(billData.billNumber || "");
        if (billData.outletId) {
          setSelectedOutlet(billData.outletId);
        }

        // Predefine customer
        setCustomer({
          name: billData.customer?.name || "",
          phone: billData.customer?.phone || "",
        });

        // Predefine discounts
        setDiscountType(billData.discountType || "percent");
        setDiscountValue(billData.discountValue !== undefined && billData.discountValue !== null ? String(billData.discountValue) : "");
        if (billData.couponCode) {
          setAppliedCoupon({ code: billData.couponCode, coupon_id: billData.couponId });
        }

        // Predefine payments
        if (billData.paymentMethod) {
          setPaymentMethod(billData.paymentMethod);
        }

        const rawPayments = billData.payments || [];
        const loadedPaymentDetails = rawPayments.flatMap((p) =>
          (p.details || []).map((d) => ({
            paymentMode: d.paymentMode || d.payment_mode || "cash",
            amount: d.amount !== undefined && d.amount !== null ? String(d.amount) : "",
            bankAccountId: d.bankAccountId || d.bank_account_id || "",
          }))
        );

        if (loadedPaymentDetails.length > 0) {
          setPaymentDetails(loadedPaymentDetails);
        } else if (billData.paymentMethod && billData.paymentMethod !== "Unpaid") {
          const modeMap = { Cash: "cash", Card: "card", UPI: "upi", "Store Credit": "store_credit", Split: "cash" };
          const mode = modeMap[billData.paymentMethod] || "cash";
          setPaymentDetails([{ paymentMode: mode, amount: String(billData.total || 0), bankAccountId: "" }]);
        } else {
          setPaymentDetails([]);
        }

        const firstPayment = rawPayments[0];
        if (firstPayment?.transactionReference) {
          setTransactionReference(firstPayment.transactionReference);
        } else {
          setTransactionReference("");
        }
        if (firstPayment?.notes) {
          setPaymentNotes(firstPayment.notes);
        } else {
          setPaymentNotes("");
        }

        // Map line items to cart lines
        const loadedCart = (billData.lineItems || []).map((li) => {
          return {
            lineId: createLineId(),
            id: li.itemId || li.id,
            name: li.itemName,
            price: Number(li.price) || 0,
            type: li.itemType || "service",
            quantity: Number(li.qty) || 1,
            staffId: li.staffAssigned || "",
            unit: li.productConsumption?.unit || "primary",
            productLinkages: (li.productConsumption && Array.isArray(li.productConsumption))
              ? li.productConsumption.map((c) => ({
                  inventoryId: c.productId,
                  currentQty: c.qty,
                  currentUnit: c.unit || "primary",
                }))
              : [],
            serviceItems: (li.includedServices && Array.isArray(li.includedServices))
              ? li.includedServices.map((svc) => ({
                  serviceId: svc.serviceId,
                  serviceName: svc.serviceName,
                  sessions: svc.sessions,
                  enabled: true,
                  staffId: svc.staffAssigned || "",
                  productLinkages: (svc.productConsumption || []).map((link) => ({
                    inventoryId: link.productId,
                    currentQty: link.qty,
                    currentUnit: link.unit || "primary",
                    enabled: true,
                  })),
                }))
              : [],
          };
        });

        setCart(loadedCart);
        toast.info(`Editing Bill #${billData.billNumber}`);
      } catch (err) {
        console.error("Failed to load bill for editing:", err);
        toast.error("Failed to load bill data for editing.");
      }
    };

    loadBillToEdit();
  }, [searchParams, location.state]);

  const cancelEditingMode = () => {
    setEditingBillId(null);
    setEditingBillNumber("");
    setCart([]);
    resetCustomerFields();
    setDiscountValue("");
    setAppliedCoupon(null);
    setPaymentMethod("");
    setPaymentDetails([]);
    setTransactionReference("");
    setPaymentNotes("");
    setSearchParams({});
    toast.info("Exited bill editing mode.");
  };

  useEffect(() => {
    const loadPOSSettings = async () => {
      try {
        const data = await fetchSettings();
        if (data?.inventory?.allowOutOfStockCheckout !== undefined) {
          setAllowOutOfStockCheckout(Boolean(data.inventory.allowOutOfStockCheckout));
        }
      } catch (err) {
        console.error("Failed to load settings in POS:", err);
      }
    };
    loadPOSSettings();
  }, []);

  const productNameById = useMemo(() => {
    return Object.fromEntries(productMasters.map((p) => [p.id, p.itemName]));
  }, [productMasters]);

  // Stock lookup by product ID from outlet inventory
  const stockByProductId = useMemo(() => {
    return Object.fromEntries(outletInventory.map((item) => [String(item.productId), Number(item.currentStock || 0)]));
  }, [outletInventory]);

  // Fetch outlet inventory stock when outlet changes
  const refreshOutletInventory = async () => {
    if (!selectedOutlet) return;
    try {
      const items = await fetchOutletInventoryFromAPI({ outletId: selectedOutlet });
      setOutletInventory(items);
    } catch {
      setOutletInventory([]);
    }
  };

  useEffect(() => {
    refreshOutletInventory();
  }, [selectedOutlet]);

  // Load outlets and pre-select outlet
  useEffect(() => {
    fetchOutletsFromAPI().then((outletList) => {
      setOutlets(outletList);
      if (outletList.length > 0 && !selectedOutlet) {
        const defaultId = user?.outlet_id || outletList[0].id;
        setSelectedOutlet(defaultId);
      }
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    const loadPos = async () => {
      try {
        const outletId = isAdmin ? (selectedOutlet || undefined) : user?.outlet_id;
        const [catalogItems, staffList, products] = await Promise.all([
          fetchPOSCatalogFromAPI({ outletId }),
          fetchStaff({ outletId }),
          fetchProductsFromAPI(),
        ]);

        const productMeasureMap = Object.fromEntries(
          products.map((p) => [p.id, p.productMeasureLabel])
        );

        setCatalog(catalogItems.map(item => ({
          ...item,
          measureLabel: item.type === "product" ? productMeasureMap[item.id] : ""
        })));
        setFilteredCatalog(catalogItems.map(item => ({
          ...item,
          measureLabel: item.type === "product" ? productMeasureMap[item.id] : ""
        })));
        setStaffMembers(staffList);
        setProductMasters(products);
      } catch (err) {
        console.error("Failed to load POS catalog:", err);
        toast.error("Failed to load catalog: " + (err.message || "Server error"));
      }
    };

    if (user) {
      loadPos();
    }
  }, [user, isAdmin, selectedOutlet]);

  const addToCart = (item) => {
    setCart((current) => {
      if (item.type === "product") {
        const existing = current.find((line) => line.id === item.id && line.type === "product");
        if (existing) {
          return current.map((line) =>
            line.lineId === existing.lineId ? { ...line, quantity: line.quantity + 1 } : line,
          );
        }
      }

      return [
        ...current,
        {
          lineId: createLineId(),
          id: item.id,
          name: item.name,
          price: item.price,
          type: item.type,
          duration: item.duration,
          offerLabel: item.offerLabel,
          serviceCount: item.serviceCount,
          unit: item.type === "product" ? (item.consumptionUnit || "primary") : undefined,
          unitMaster: item.type === "product" ? item.unitMaster : undefined,
          serviceItems: (item.serviceItems || []).map((svc) => ({
            ...svc,
            enabled: true,
            staffId: "",
            productLinkages: (svc.productLinkages || []).map((link) => ({
              ...link,
              currentQty: link.quantityUsed,
              currentUnit: link.consumptionUnit || "primary",
              unitMaster: link.unitMaster || null,
              unitMasterId: link.unitMasterId || null,
              enabled: true,
            })),
          })),
          productLinkages: (item.productLinkages || []).map((link) => ({
            ...link,
            currentQty: link.quantityUsed,
            currentUnit: link.consumptionUnit || "primary",
            unitMaster: link.unitMaster || null,
            unitMasterId: link.unitMasterId || null,
          })),
          quantity: 1,
          staffId: "",
          customPrice: null,
        },
      ];
    });
  };

  const updateLine = (lineId, key, value) => {
    setCart((current) =>
      current.map((line) => (line.lineId === lineId ? { ...line, [key]: value } : line)),
    );
  };

  const updateProductLinkageQty = (lineId, inventoryId, delta) => {
    setCart((current) =>
      current.map((line) => {
        if (line.lineId !== lineId) return line;
        return {
          ...line,
          productLinkages: line.productLinkages.map((link) => {
            if (link.inventoryId !== inventoryId) return link;
            const currentQty = Number(link.currentQty) || 0;
            let nextQty;
            if (delta < 0) {
              const floor = Math.floor(currentQty);
              nextQty = floor < currentQty ? floor : floor - 1;
            } else {
              const ceil = Math.ceil(currentQty);
              nextQty = ceil > currentQty ? ceil : ceil + 1;
            }
            return { ...link, currentQty: Math.max(0, nextQty) };
          }),
        };
      })
    );
  };

  const updateProductLinkageField = (lineId, inventoryId, field, value) => {
    setCart((current) =>
      current.map((line) => {
        if (line.lineId !== lineId) return line;
        return {
          ...line,
          productLinkages: line.productLinkages.map((link) => {
            if (link.inventoryId !== inventoryId) return link;
            // If switching unit, auto-convert the quantity
            if (field === "currentUnit" && link.unitMaster) {
              const oldUnit = link.currentUnit;
              const newUnit = value;
              if (oldUnit !== newUnit) {
                const ratio = link.unitMaster.conversionRatio;
                let newQty = link.currentQty;
                if (oldUnit === "primary" && newUnit === "secondary") {
                  newQty = (Number(link.currentQty) || 0) * ratio;
                } else if (oldUnit === "secondary" && newUnit === "primary") {
                  newQty = (Number(link.currentQty) || 0) / ratio;
                }
                return { ...link, currentUnit: newUnit, currentQty: Number(newQty.toFixed(4)) };
              }
            }
            return { ...link, [field]: value };
          }),
        };
      })
    );
  };

  const updateLinePrice = (lineId, newPrice) => {
    setCart((current) =>
      current.map((line) =>
        line.lineId === lineId ? { ...line, customPrice: newPrice ? Number(newPrice) : null } : line
      )
    );
  };

  const getLinePrice = (line) => line.customPrice ?? line.price;

  const removeLine = (lineId) => {
    setCart((current) => current.filter((line) => line.lineId !== lineId));
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    setCart([]);
    setPaymentMethod("");
    setSelectedBankId("");
    setDiscountValue("");
    toast.success("Cart cleared");
  };

  const adjustQuantity = (lineId, delta) => {
    setCart((current) =>
      current.map((line) => {
        if (line.lineId === lineId) {
          const isProduct = line.type === "product";
          const minQty = isProduct ? 0.001 : 1;
          const currentQty = Number(line.quantity) || 0;
          let nextQty;
          if (delta < 0) {
            const floor = Math.floor(currentQty);
            nextQty = floor < currentQty ? floor : floor - 1;
          } else {
            const ceil = Math.ceil(currentQty);
            nextQty = ceil > currentQty ? ceil : ceil + 1;
          }
          return { ...line, quantity: Math.max(minQty, nextQty) };
        }
        return line;
      }),
    );
  };

  const unassignStaff = (lineId) => {
    updateLine(lineId, "staffId", "");
    toast.info("Staff unassigned");
  };

  const togglePackageService = (lineId, serviceId) => {
    setCart((current) =>
      current.map((line) => {
        if (line.lineId !== lineId) return line;
        return {
          ...line,
          serviceItems: line.serviceItems.map((svc) =>
            svc.serviceId === serviceId ? { ...svc, enabled: !svc.enabled } : svc
          ),
        };
      })
    );
  };

  const updatePackageServiceField = (lineId, serviceId, field, value) => {
    setCart((current) =>
      current.map((line) => {
        if (line.lineId !== lineId) return line;
        return {
          ...line,
          serviceItems: line.serviceItems.map((svc) =>
            svc.serviceId === serviceId ? { ...svc, [field]: value } : svc
          ),
        };
      })
    );
  };

  const togglePackageServiceProduct = (lineId, serviceId, inventoryId) => {
    setCart((current) =>
      current.map((line) => {
        if (line.lineId !== lineId) return line;
        return {
          ...line,
          serviceItems: line.serviceItems.map((svc) => {
            if (svc.serviceId !== serviceId) return svc;
            return {
              ...svc,
              productLinkages: svc.productLinkages.map((link) =>
                link.inventoryId === inventoryId ? { ...link, enabled: !link.enabled } : link
              ),
            };
          }),
        };
      })
    );
  };

  const updatePackageServiceProductField = (lineId, serviceId, inventoryId, field, value) => {
    setCart((current) =>
      current.map((line) => {
        if (line.lineId !== lineId) return line;
        return {
          ...line,
          serviceItems: line.serviceItems.map((svc) => {
            if (svc.serviceId !== serviceId) return svc;
            return {
              ...svc,
              productLinkages: svc.productLinkages.map((link) => {
                if (link.inventoryId !== inventoryId) return link;
                if (field === "currentUnit" && link.unitMaster) {
                  const oldUnit = link.currentUnit;
                  const newUnit = value;
                  if (oldUnit !== newUnit) {
                    const ratio = link.unitMaster.conversionRatio;
                    let newQty = link.currentQty;
                    if (oldUnit === "primary" && newUnit === "secondary") {
                      newQty = (Number(link.currentQty) || 0) * ratio;
                    } else if (oldUnit === "secondary" && newUnit === "primary") {
                      newQty = (Number(link.currentQty) || 0) / ratio;
                    }
                    return { ...link, currentUnit: newUnit, currentQty: Number(newQty.toFixed(4)) };
                  }
                }
                return { ...link, [field]: value };
              }),
            };
          }),
        };
      })
    );
  };

  const updatePackageServiceProductQty = (lineId, serviceId, inventoryId, delta) => {
    setCart((current) =>
      current.map((line) => {
        if (line.lineId !== lineId) return line;
        return {
          ...line,
          serviceItems: line.serviceItems.map((svc) => {
            if (svc.serviceId !== serviceId) return svc;
            return {
              ...svc,
              productLinkages: svc.productLinkages.map((link) => {
                if (link.inventoryId !== inventoryId) return link;
                const currentQty = Number(link.currentQty) || 0;
                let nextQty;
                if (delta < 0) {
                  const floor = Math.floor(currentQty);
                  nextQty = floor < currentQty ? floor : floor - 1;
                } else {
                  const ceil = Math.ceil(currentQty);
                  nextQty = ceil > currentQty ? ceil : ceil + 1;
                }
                return { ...link, currentQty: Math.max(0, nextQty) };
              }),
            };
          }),
        };
      })
    );
  };

  // Filter catalog based on search and category
  useEffect(() => {
    let filtered = catalog;

    if (activeCategory !== "All") {
      filtered = filtered.filter((item) => item.type === activeCategory.toLowerCase());
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          (item.category && item.category.toLowerCase().includes(query)),
      );
    }

    setFilteredCatalog(filtered);
  }, [searchQuery, activeCategory, catalog]);

  const handleApplyCoupon = async () => {
    if (!couponCodeInput.trim()) {
      toast.error("Please enter a coupon code");
      return;
    }
    try {
      setCouponLoading(true);
      const res = await validateCouponAPI(couponCodeInput, subtotal);
      if (res.success) {
        setAppliedCoupon(res.data);
        setDiscountType(res.data.discount_type);
        setDiscountValue(res.data.discount_value);
        toast.success(`Coupon ${res.data.code} applied! Saved ${formatCurrency(res.data.discount_amount)}`);
      }
    } catch (err) {
      toast.error(err.message || "Failed to apply coupon");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCodeInput("");
    setDiscountValue("");
    toast.info("Coupon removed");
  };

  const subtotal = cart.reduce((sum, line) => sum + getLinePrice(line) * line.quantity, 0);
  
  const discountAmount = appliedCoupon
    ? appliedCoupon.discount_amount
    : discountValue
      ? discountType === "percent"
        ? Math.min(subtotal, (subtotal * Math.min(100, Number(discountValue))) / 100)
        : Math.min(subtotal, Number(discountValue))
      : 0;

  const discountedSubtotal = subtotal - discountAmount;
  const tax = Math.round((discountedSubtotal * 0.08) * 100) / 100;
  const total = Math.round((discountedSubtotal + tax) * 100) / 100;

  const hasUnassignedService = cart.some(
    (line) =>
      (line.type === "service" && !line.staffId) ||
      (line.type === "package" && line.serviceItems?.some((svc) => svc.enabled && !svc.staffId))
  );

  // Validate stock for all cart items (only when a specific outlet is selected)
  const stockValidation = useMemo(() => {
    const errors = [];
    if (!selectedOutlet || outletInventory.length === 0 || cart.length === 0) return { errors, hasErrors: false };

    for (const line of cart) {
      // Check direct product sales
      if (line.type === "product") {
        const available = stockByProductId[String(line.id)] ?? 0;
        if (line.quantity > available) {
          errors.push({
            lineId: line.lineId,
            itemName: line.name,
            type: "product",
            required: line.quantity,
            available,
            shortfall: line.quantity - available,
          });
        }
      }

      // Check service product consumptions
      if (line.type === "service" && line.productLinkages?.length > 0) {
        for (const link of line.productLinkages) {
          if (!link.inventoryId || link.currentQty <= 0) continue;
          const totalNeeded = (Number(link.currentQty) || 0) * line.quantity;
          const available = stockByProductId[String(link.inventoryId)] ?? 0;
          if (totalNeeded > available) {
            errors.push({
              lineId: line.lineId,
              itemName: `${line.name} → ${productNameById[link.inventoryId] || link.inventoryId}`,
              type: "service-consumption",
              required: totalNeeded,
              available,
              shortfall: totalNeeded - available,
            });
          }
        }
      }

      // Check package service consumptions (only enabled services + enabled links)
      if (line.type === "package" && line.serviceItems?.length > 0) {
        for (const serviceItem of line.serviceItems) {
          if (!serviceItem.enabled) continue;
          if (!serviceItem.productLinkages?.length) continue;

          for (const link of serviceItem.productLinkages) {
            if (!link.enabled || !link.inventoryId || (Number(link.currentQty) || 0) <= 0) continue;
            const totalNeeded = (Number(link.currentQty) || 0) * Number(serviceItem.sessions || 1) * line.quantity;
            const available = stockByProductId[String(link.inventoryId)] ?? 0;
            if (totalNeeded > available) {
              errors.push({
                lineId: line.lineId,
                itemName: `${line.name} → ${serviceItem.serviceName} → ${productNameById[link.inventoryId] || link.inventoryId}`,
                type: "package-consumption",
                required: totalNeeded,
                available,
                shortfall: totalNeeded - available,
              });
            }
          }
        }
      }
    }

    return { errors, hasErrors: errors.length > 0 };
  }, [cart, stockByProductId, productNameById, selectedOutlet, catalog]);

  // Update stock errors when validation changes
  useEffect(() => {
    setStockErrors(stockValidation.errors);
  }, [stockValidation.errors]);

  // Bank required for any non-cash payment detail row
  const isBankRequired = paymentMethod && paymentMethod !== "Cash";
  const hasStockErrors = stockErrors.length > 0;

  const paymentModeMap = { Cash: "cash", Card: "card", UPI: "upi", "Store Credit": "store_credit", Split: "split" };

  const syncPaymentDetailsWithMethod = (method) => {
    if (method === "Split") {
      const half = Number((total / 2).toFixed(2));
      const rest = Number((total - half).toFixed(2));
      setPaymentDetails([
        { paymentMode: "cash", amount: half > 0 ? half : "", bankAccountId: "" },
        { paymentMode: "card", amount: rest > 0 ? rest : "", bankAccountId: "" },
      ]);
    } else {
      const mode = paymentModeMap[method] || "cash";
      setPaymentDetails([{ paymentMode: mode, amount: total > 0 ? total : "", bankAccountId: selectedBankId || "" }]);
    }
  };

  const addPaymentDetail = () => {
    if (paymentMethod !== "Split") {
      setPaymentMethod("Split");
    }
    const currentSum = paymentDetails.reduce((s, d) => s + (Number(d.amount) || 0), 0);
    const remaining = Math.max(0, Number((total - currentSum).toFixed(2)));
    setPaymentDetails((prev) => [
      ...prev,
      { paymentMode: "card", amount: remaining > 0 ? remaining : "", bankAccountId: "" },
    ]);
  };

  const removePaymentDetail = (idx) => {
    setPaymentDetails((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (next.length === 0) {
        setPaymentMethod("");
        setSelectedBankId("");
      }
      return next;
    });
  };

  const clearPayment = () => {
    setPaymentDetails([]);
    setPaymentMethod("");
    setSelectedBankId("");
  };

  const updatePaymentDetail = (idx, field, value) => {
    setPaymentDetails((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d))
    );
  };

  // Derive the primary bank for the Payment record: first non-cash detail's bank, fallback to selectedBankId
  const primaryBankAccountId = paymentDetails.find((d) => d.paymentMode !== "cash" && d.bankAccountId)?.bankAccountId || selectedBankId || null;

  // nonCashNeedsBank: true if any non-cash detail with an amount > 0 has no bank selected (excluding store credit)
  const nonCashNeedsBank = paymentDetails.some(
    (d) => d.paymentMode !== "cash" && d.paymentMode !== "store_credit" && Number(d.amount) > 0 && !d.bankAccountId
  );

  // Check if total entered in split breakdown matches the bill total
  const totalEnteredInBreakdown = paymentDetails.reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const isSplitCovered = paymentMethod === "Split" || paymentDetails.length > 1
    ? (paymentDetails.length === 0 || Math.abs(total - totalEnteredInBreakdown) < 0.01)
    : true;

  const canCheckout = cart.length > 0 && isSplitCovered && !nonCashNeedsBank && (!hasStockErrors || allowOutOfStockCheckout);

  const handleCheckout = async () => {
    if (hasStockErrors && !allowOutOfStockCheckout) {
      toast.error("Checkout blocked: Product(s) out of stock. Enable out-of-stock checkout in Settings to proceed.");
      return;
    }

    const resolvedDetails = paymentDetails
      .map((d) => ({ paymentMode: d.paymentMode, amount: Number(d.amount) || 0, bankAccountId: d.bankAccountId || null }))
      .filter((d) => d.amount > 0);

    // Validate outlet selection with automatic fallback
    let outletId = selectedOutlet || user?.outlet_id;
    if (!outletId) {
      try {
        const outletList = outlets.length > 0 ? outlets : await fetchOutletsFromAPI();
        if (outletList && outletList.length > 0) {
          outletId = outletId || outletList[0].id;
          setSelectedOutlet(outletId);
        }
      } catch (e) {}
    }

    if (!outletId) {
      toast.error("Please ensure at least one outlet is registered in the system.");
      return;
    }

    if (!activeShift || activeShift.status !== "OPEN") {
      toast.error("Checkout blocked: An active POS Shift is required. Please select a terminal and open a shift.");
      if (!selectedTerminal) {
        setShowTerminalModal(true);
      } else {
        setShowOpenShiftModal(true);
      }
      return;
    }

    const payload = {
      customer,
      paymentMethod: paymentMethod || "Unpaid",
      bankId: primaryBankAccountId,
      bankAccountId: primaryBankAccountId,
      outletId,
      subtotal,
      discountType: discountAmount > 0 ? discountType : null,
      discountValue: discountAmount > 0 ? Number(discountValue) : 0,
      discountAmount,
      tax,
      total,
      allowOutOfStockCheckout,
      couponId: appliedCoupon?.coupon_id || undefined,
      couponCode: appliedCoupon?.code || undefined,
      posTerminalId: selectedTerminal?.id || undefined,
      posShiftId: activeShift?.id || undefined,
      createdBy: user?.id || undefined,
      paymentDetails: resolvedDetails,
      transactionReference: transactionReference.trim() || undefined,
      paymentNotes: paymentNotes.trim() || undefined,
      lineItems: cart.map((line) => ({
        itemId: line.id,
        itemType: line.type,
        itemName: line.name,
        qty: line.quantity,
        price: getLinePrice(line),
        staffAssigned: line.type === "service" ? line.staffId : null,
        unit: line.type === "product" ? (line.unit || "primary") : undefined,
        unitAbbr: line.type === "product" && line.unitMaster
          ? (line.unit === "secondary" ? line.unitMaster.secondaryAbbr : line.unitMaster.primaryAbbr)
          : undefined,
        productConsumption:
          line.type === "service" && line.productLinkages?.length > 0
            ? line.productLinkages
              .filter((link) => link.inventoryId)
              .map((link) => ({
                productId: link.inventoryId,
                qty: (Number(link.currentQty) || 0) * line.quantity,
                unit: link.currentUnit || "primary",
              }))
            : undefined,
        includedServices:
          line.type === "package"
            ? line.serviceItems
                .filter((svc) => svc.enabled)
                .map((svc) => ({
                  serviceId: svc.serviceId,
                  serviceName: svc.serviceName,
                  sessions: svc.sessions,
                  staffAssigned: svc.staffId || null,
                  productConsumption: (svc.productLinkages || [])
                    .filter((link) => link.enabled && link.inventoryId && (Number(link.currentQty) || 0) > 0)
                    .map((link) => ({
                      productId: link.inventoryId,
                      qty: (Number(link.currentQty) || 0) * line.quantity,
                      unit: link.currentUnit || "primary",
                    })),
                }))
            : undefined,
      })),
    };

    try {
      let result;
      if (editingBillId) {
        const updateRes = await updateBillAPI(editingBillId, payload);
        result = updateRes.bill || updateRes;
        toast.success(`Bill #${editingBillNumber || result.billNumber} updated successfully!`);
        setEditingBillId(null);
        setEditingBillNumber("");
        setSearchParams({});
      } else {
        result = await checkoutBillAPI(payload);
        toast.success(`Bill ${result.billNumber} created successfully!`);
      }

      setCurrentBill(result);
      setShowInvoice(true);
      setCart([]);
      setPaymentMethod("");
      setSelectedBankId("");
      setDiscountValue("");
      resetCustomerFields();
      setPaymentDetails([{ paymentMode: "cash", amount: "", bankAccountId: "" }]);
      setTransactionReference("");
      setPaymentNotes("");
      // Refresh outlet inventory after successful checkout/update
      refreshOutletInventory();
    } catch (err) {
      console.error("Checkout/Update failed:", err);
      toast.error(err.message || "Operation failed. Please try again. Your cart has been preserved.");
    }
  };

  // POS Keyboard Shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isInput = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);

      // F1 or Shift+? -> Toggle Shortcuts Guide
      if (e.key === "F1" || (e.shiftKey && e.key === "?")) {
        e.preventDefault();
        setShowShortcutGuide((prev) => !prev);
        return;
      }

      // Esc -> Close modals or clear search query
      if (e.key === "Escape") {
        if (showShortcutGuide) {
          setShowShortcutGuide(false);
          return;
        }
        if (showInvoice) {
          setShowInvoice(false);
          return;
        }
        if (searchQuery) {
          setSearchQuery("");
          return;
        }
      }

      // F2 or Ctrl+K -> Focus Catalog Search input
      if (e.key === "F2" || (e.ctrlKey && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // F12 or Ctrl+Enter -> Complete Billing / Checkout
      if (e.key === "F12" || (e.ctrlKey && e.key === "Enter")) {
        e.preventDefault();
        if (canCheckout) {
          handleCheckout();
        } else if (cart.length === 0) {
          toast.error("Cart is empty.");
        } else if (!paymentMethod) {
          toast.error("Please select a payment method.");
        }
        return;
      }

      // Payment shortcuts (F4/Alt+1 -> Cash, F8/Alt+2 -> Card, F9/Alt+3 -> UPI, F10/Alt+4 -> Split)
      if (e.key === "F4" || (e.altKey && (e.key === "1" || e.key.toLowerCase() === "c"))) {
        e.preventDefault();
        setPaymentMethod("Cash");
        syncPaymentDetailsWithMethod("Cash");
        setSelectedBankId("");
        toast.info("Selected Cash Payment (F4)");
        return;
      }
      if (e.key === "F8" || (e.altKey && (e.key === "2" || e.key.toLowerCase() === "d"))) {
        e.preventDefault();
        setPaymentMethod("Card");
        syncPaymentDetailsWithMethod("Card");
        toast.info("Selected Card Payment (F8)");
        return;
      }
      if (e.key === "F9" || (e.altKey && (e.key === "3" || e.key.toLowerCase() === "u"))) {
        e.preventDefault();
        setPaymentMethod("UPI");
        syncPaymentDetailsWithMethod("UPI");
        toast.info("Selected UPI Payment (F9)");
        return;
      }
      if (e.key === "F11" || (e.altKey && (e.key === "5" || e.key.toLowerCase() === "r"))) {
        e.preventDefault();
        setPaymentMethod("Store Credit");
        syncPaymentDetailsWithMethod("Store Credit");
        setSelectedBankId("");
        toast.info("Selected Store Credit Payment (F11)");
        return;
      }
      if (e.key === "F10" || (e.altKey && (e.key === "4" || e.key.toLowerCase() === "s"))) {
        e.preventDefault();
        setPaymentMethod("Split");
        syncPaymentDetailsWithMethod("Split");
        toast.info("Selected Split Payment (F10)");
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canCheckout, cart.length, paymentMethod, searchQuery, showInvoice, showShortcutGuide, toast]);

  return (
    <div>
      <PageHeader
        eyebrow={editingBillId ? "POS · Edit Mode" : "POS"}
        title={editingBillId ? `Editing Bill #${editingBillNumber}` : "Point of Sale"}
      />

      {/* POS Terminal & Shift Header Widget */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border border-navy-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 font-bold">
            <Monitor className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-navy-900">
                {selectedTerminal ? selectedTerminal.name : "No Terminal Selected"}
              </span>
              <button
                type="button"
                onClick={() => setShowTerminalModal(true)}
                className="text-xs text-indigo-600 font-bold hover:underline"
              >
                {selectedTerminal ? "Switch Terminal" : "Select Terminal"}
              </button>
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
              {activeShift ? (
                <span className="text-emerald-700 font-bold inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Shift Active (Opened {new Date(activeShift.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                </span>
              ) : (
                <span className="text-amber-700 font-bold inline-flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> No Open Shift (Billing Blocked)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeShift ? (
            <>
              <button
                type="button"
                onClick={() => setShowCashMovementModal(true)}
                className="px-3.5 py-2 rounded-xl border border-navy-200 bg-navy-50/70 hover:bg-navy-100 text-navy-800 text-xs font-bold transition inline-flex items-center gap-1.5 shadow-xs"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-600" /> Cash In/Out
              </button>
              <button
                type="button"
                onClick={() => setShowXReportModal(true)}
                className="px-3.5 py-2 rounded-xl border border-navy-200 bg-navy-50/70 hover:bg-navy-100 text-navy-800 text-xs font-bold transition inline-flex items-center gap-1.5 shadow-xs"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-600" /> X-Report
              </button>
              <button
                type="button"
                onClick={() => setShowCloseShiftModal(true)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition inline-flex items-center gap-1.5 shadow-sm"
              >
                <StopCircle className="w-3.5 h-3.5" /> End Shift
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (!selectedTerminal) {
                  setShowTerminalModal(true);
                } else {
                  setShowOpenShiftModal(true);
                }
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition inline-flex items-center gap-1.5 shadow-sm"
            >
              <PlayCircle className="w-4 h-4" /> Open Register Shift
            </button>
          )}
        </div>
      </div>

      {editingBillId && (
        <div className="mb-6 flex flex-wrap items-center justify-between rounded-2xl bg-amber-500/10 border border-amber-400/30 p-4 text-amber-900 shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white font-bold shadow">
              <Edit size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Bill Editing Mode</p>
              <p className="text-sm font-bold text-navy-900">
                You are updating Invoice <span className="font-mono font-black text-amber-800">#{editingBillNumber}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={cancelEditingMode}
            className="flex items-center gap-1.5 rounded-xl border border-rose-300 bg-white px-3.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 transition shadow-sm"
          >
            <X size={14} /> Cancel Editing
          </button>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        {/* ── Catalog Panel ── */}
        <div className="glass-card !p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="premium-label !mb-0">Catalog Menu</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowShortcutGuide(true)}
                className="flex items-center gap-1.5 rounded-lg border border-navy-200 bg-white px-2.5 py-1 text-xs font-semibold text-navy-700 hover:bg-navy-50 transition-colors"
                title="Keyboard Shortcuts (F1 or Shift+?)"
              >
                <Keyboard className="h-3.5 w-3.5 text-navy-500" />
                <span className="hidden sm:inline">Shortcuts</span>
                <span className="rounded bg-navy-100 px-1 py-0.2 text-[9px] font-mono text-navy-600">F1</span>
              </button>
              {isAdmin && (
                <select
                  className="premium-input !py-1.5 !px-3 !text-xs appearance-none min-w-[140px]"
                  value={selectedOutlet}
                  onChange={(e) => setSelectedOutlet(e.target.value)}
                >
                  <option value="">All Outlets</option>
                  {outlets.map((outlet) => (
                    <option key={outlet.id} value={outlet.id}>
                      {outlet.name}
                    </option>
                  ))}
                </select>
              )}
              <span className="text-xs font-semibold text-slate-400">{filteredCatalog.length} items</span>
            </div>
          </div>

          {/* Search + filter row */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search catalog... (F2 or Ctrl+K)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="premium-input !py-2.5 !pl-9 !pr-10 !text-sm"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono font-bold text-slate-400 bg-slate-100 border border-slate-200 rounded px-1 py-0.5 pointer-events-none">
                F2
              </span>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              {["All", "Service", "Package", "Product"].map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${activeCategory === category
                      ? "bg-navy-900 text-white"
                      : "bg-white/60 text-slate-600 hover:bg-white border border-navy-50"
                    }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Empty State */}
          {filteredCatalog.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-navy-50 bg-white/40 py-10 text-center">
              <ShoppingCart className="h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm font-medium text-slate-500">
                {searchQuery ? `No results for "${searchQuery}"` : "No items in this category"}
              </p>
            </div>
          )}

          {/* Catalog grid — compact cards */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredCatalog.map((item) => (
              <button
                key={`${item.type}-${item.id}`}
                type="button"
                onClick={() => addToCart(item)}
                className="group relative flex flex-col rounded-2xl border border-navy-50 bg-white/60 p-4 text-left transition-all hover:-translate-y-1 hover:bg-white hover:shadow-lg hover:shadow-navy-950/5"
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${item.type === "service"
                        ? "bg-navy-50 text-navy-600"
                        : item.type === "package"
                          ? "bg-gold-50 text-gold-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                  >
                    {item.type}
                  </span>
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-navy-900 text-white text-xs opacity-0 group-hover:opacity-100 transition-all">
                    +
                  </div>
                </div>

                <p className="text-sm font-bold text-navy-900 leading-snug">
                  {item.name} {item.measureLabel && <span className="text-navy-400 font-normal ml-1">({item.measureLabel})</span>}
                </p>

                <p className="mt-1 text-[11px] font-medium">
                  {item.type === "service" ? (
                    <span className="text-slate-400">{item.duration} min</span>
                  ) : item.type === "package" ? (
                    <span className="text-slate-400">{item.serviceCount} items · {item.duration} min</span>
                  ) : (
                    <span className={(selectedOutlet && stockByProductId[String(item.id)] !== undefined ? stockByProductId[String(item.id)] : item.stock) <= 0 ? "text-rose-500 font-semibold" : "text-slate-400"}>
                      {selectedOutlet && stockByProductId[String(item.id)] !== undefined ? stockByProductId[String(item.id)] : item.stock} in stock
                    </span>
                  )}
                </p>

                {item.type === "package" && item.offerLabel && (
                  <span className="mt-1.5 inline-block rounded bg-gold-400/10 px-2 py-0.5 text-[9px] font-black uppercase text-gold-700">
                    {item.offerLabel}
                  </span>
                )}

                <div className="mt-2 flex items-center gap-2">
                  {item.totalOriginalPrice > item.price && (
                    <span className="text-xs text-slate-400 line-through">
                      {formatCurrency(item.totalOriginalPrice)}
                    </span>
                  )}
                  <span className="text-sm font-black text-navy-800">
                    {formatCurrency(item.price)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Cart Panel ── */}
        <div className="glass-card !p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="premium-label !mb-0">Checkout Desk</p>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear
              </button>
            )}
          </div>

          {/* Customer fields with CRM Lookup */}
          <div className="relative space-y-1">
            <div className="grid grid-cols-2 gap-2">
              <input
                className="premium-input !py-2.5 !text-sm"
                placeholder="Guest Name (Search CRM...)"
                value={customer.name}
                onChange={(event) => {
                  const val = event.target.value;
                  setCustomer((current) => ({ ...current, name: val }));
                  if (!val) setSelectedCrmCustomer(null);
                  handleCustomerSearch(val);
                }}
                onFocus={() => {
                  if (customer.name && customerSuggestions.length > 0) setShowCustomerDropdown(true);
                }}
              />
              <input
                className="premium-input !py-2.5 !text-sm"
                placeholder="Contact Number"
                value={customer.phone}
                onChange={(event) => {
                  const val = event.target.value;
                  setCustomer((current) => ({ ...current, phone: val }));
                  handleCustomerSearch(val);
                }}
              />
            </div>

            {/* Selected CRM Customer Tag */}
            {selectedCrmCustomer && (
              <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100 text-xs text-indigo-700">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-semibold flex items-center gap-1.5 truncate">
                    <User className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    CRM Client: {selectedCrmCustomer.name} ({selectedCrmCustomer.loyalty_points || 0} pts)
                  </span>
                  {Number(selectedCrmCustomer.credit_balance || 0) > 0 ? (
                    <span className="text-[10px] font-bold text-emerald-700">
                      Available Store Credit: +₹{Number(selectedCrmCustomer.credit_balance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  ) : Number(selectedCrmCustomer.credit_balance || 0) < 0 ? (
                    <span className="text-[10px] font-bold text-rose-700">
                      Outstanding Due: -₹{Math.abs(Number(selectedCrmCustomer.credit_balance)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-medium">Store Credit: ₹0.00</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={resetCustomerFields}
                  className="text-indigo-400 hover:text-indigo-600 ml-2 shrink-0"
                  title="Clear customer selection"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Autocomplete Dropdown */}
            {showCustomerDropdown && customerSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden max-h-48 overflow-y-auto">
                <div className="p-1.5 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Matching CRM Clients ({customerSuggestions.length})
                </div>
                {customerSuggestions.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setCustomer({ id: c.id, name: c.name, phone: c.phone });
                      setSelectedCrmCustomer(c);
                      setShowCustomerDropdown(false);
                    }}
                    className="p-2.5 hover:bg-indigo-50 cursor-pointer transition-colors border-b border-slate-100 last:border-0 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800">{c.name}</p>
                      <p className="text-[11px] text-slate-500">{c.phone} {c.email ? `· ${c.email}` : ''}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        {c.loyalty_points || 0} pts
                      </span>
                      {Number(c.credit_balance || 0) > 0 ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          +₹{Number(c.credit_balance).toLocaleString("en-IN")} Credit
                        </span>
                      ) : Number(c.credit_balance || 0) < 0 ? (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                          -₹{Math.abs(Number(c.credit_balance)).toLocaleString("en-IN")} Due
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart items */}
          <div>
            <p className="premium-label !mb-2">Cart Items ({cart.length})</p>
            {cart.length ? (
              <div className={`space-y-3 ${showBillBreakdown ? "max-h-[280px]" : "max-h-[480px]"} overflow-y-auto pr-1 custom-scrollbar transition-all duration-300`}>
                {cart.map((line) => (
                  <div key={line.lineId} className="rounded-xl border border-navy-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-navy-900 truncate">{line.name}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {line.type} · qty {line.quantity}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="shrink-0 text-slate-300 hover:text-rose-500 transition-colors"
                        onClick={() => removeLine(line.lineId)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-navy-300">Qty</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => adjustQuantity(line.lineId, -1)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-navy-200 bg-white text-navy-700 hover:bg-navy-50"
                            disabled={line.quantity <= (line.type === "product" ? 0.001 : 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          
                          {line.type === "product" ? (
                            <input
                              type="number"
                              min="0.001"
                              step="any"
                              value={line.quantity}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                updateLine(line.lineId, "quantity", val);
                              }}
                              className="w-16 text-center text-sm font-semibold text-navy-900 border border-navy-200 rounded px-1.5 py-0.5 bg-white focus:outline-none focus:border-navy-400"
                            />
                          ) : (
                            <span className="w-8 text-center text-sm font-semibold text-navy-900">
                              {line.quantity}
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => adjustQuantity(line.lineId, 1)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-navy-200 bg-white text-navy-700 hover:bg-navy-50"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        {line.type === "product" && line.unitMaster && (
                          <select
                            className="text-xs border border-navy-200 rounded px-1.5 py-0.5 bg-white text-navy-800 focus:outline-none focus:border-navy-400"
                            value={line.unit || "primary"}
                            onChange={(e) => {
                              const newUnit = e.target.value;
                              const oldUnit = line.unit || "primary";
                              if (newUnit !== oldUnit) {
                                const ratio = line.unitMaster.conversionRatio;
                                let newQty = line.quantity;
                                let newPrice = line.price;
                                let newCustomPrice = line.customPrice;

                                if (oldUnit === "primary" && newUnit === "secondary") {
                                  newQty = newQty * ratio;
                                  newPrice = newPrice / ratio;
                                  if (newCustomPrice !== null && newCustomPrice !== undefined) {
                                    newCustomPrice = Number(newCustomPrice) / ratio;
                                  }
                                } else if (oldUnit === "secondary" && newUnit === "primary") {
                                  newQty = newQty / ratio;
                                  newPrice = newPrice * ratio;
                                  if (newCustomPrice !== null && newCustomPrice !== undefined) {
                                    newCustomPrice = Number(newCustomPrice) * ratio;
                                  }
                                }

                                setCart((current) =>
                                  current.map((l) =>
                                    l.lineId === line.lineId
                                      ? {
                                          ...l,
                                          unit: newUnit,
                                          quantity: Number(newQty.toFixed(4)),
                                          price: Number(newPrice.toFixed(4)),
                                          customPrice: newCustomPrice !== null ? Number(newCustomPrice.toFixed(4)) : null,
                                        }
                                      : l
                                  )
                                );
                              }
                            }}
                          >
                            {getAvailableUnits(line.unitMaster).map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>

                    {line.type === "service" && (
                      <>
                        <div className="mt-2 flex items-center gap-2">
                          <select
                            className="premium-input !py-2 !px-3 !text-xs appearance-none flex-1"
                            value={line.staffId}
                            onChange={(event) => updateLine(line.lineId, "staffId", event.target.value)}
                          >
                            <option value="">Assign Talent</option>
                            {staffMembers.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name}
                              </option>
                            ))}
                          </select>
                          {line.staffId && (
                            <button
                              type="button"
                              onClick={() => unassignStaff(line.lineId)}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                            >
                              Unassign
                            </button>
                          )}
                        </div>

                        {/* Products used in service — editable measurements */}
                        {line.productLinkages && line.productLinkages.length > 0 && (
                          <div className="mt-3 space-y-2 rounded-lg bg-navy-50 p-3 border border-navy-100">
                            <p className="text-[10px] font-black uppercase tracking-widest text-navy-500">Product Consumption</p>
                            {line.productLinkages.map((link) => {
                              const finalQty = Math.max(0, Number(link.currentQty) || 0);
                              const um = link.unitMaster;
                              const unitAbbr = um ? getUnitAbbr(um, link.currentUnit || 'primary') : '';
                              const unitOptions = um ? getAvailableUnits(um) : [];
                              const showConversion = um && link.currentUnit === 'secondary' && finalQty > 0;
                              const baseEquiv = showConversion
                                ? convertToBase(finalQty, um.conversionRatio, 'secondary')
                                : null;

                              return (
                                <div key={link.inventoryId} className="space-y-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs text-navy-700 truncate flex-1">
                                      {productNameById[link.inventoryId] || link.inventoryId}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => updateProductLinkageQty(line.lineId, link.inventoryId, -1)}
                                        className="flex h-5 w-5 items-center justify-center rounded border border-navy-200 bg-white text-navy-600 hover:bg-navy-50"
                                        disabled={finalQty <= 0}
                                      >
                                        <Minus className="h-2.5 w-2.5" />
                                      </button>
                                      <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={finalQty}
                                        onChange={(e) => updateProductLinkageField(line.lineId, link.inventoryId, 'currentQty', Number(e.target.value) || 0)}
                                        className="w-16 text-center text-xs font-semibold text-navy-700 border border-navy-200 rounded px-1 py-0.5 bg-white focus:outline-none focus:border-navy-400"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => updateProductLinkageQty(line.lineId, link.inventoryId, 1)}
                                        className="flex h-5 w-5 items-center justify-center rounded border border-navy-200 bg-white text-navy-600 hover:bg-navy-50"
                                      >
                                        <Plus className="h-2.5 w-2.5" />
                                      </button>
                                      {unitOptions.length > 0 ? (
                                        <select
                                          className="text-[10px] font-semibold text-navy-600 bg-white border border-navy-200 rounded px-1 py-0.5 appearance-none"
                                          value={link.currentUnit || 'primary'}
                                          onChange={(e) => updateProductLinkageField(line.lineId, link.inventoryId, 'currentUnit', e.target.value)}
                                        >
                                          {unitOptions.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                          ))}
                                        </select>
                                      ) : null}
                                    </div>
                                  </div>
                                  {showConversion && baseEquiv !== null ? (
                                    <div className="flex items-center gap-1 text-[10px] text-slate-400 pl-1">
                                      <ArrowLeftRight className="h-2.5 w-2.5" />
                                      <span>= {baseEquiv.toFixed(4).replace(/\.?0+$/, '')} {um.primaryAbbr}</span>
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}

                    {/* Package: services + linked products */}
                    {line.type === "package" && line.serviceItems?.length > 0 && (
                      <div className="mt-3 space-y-2 rounded-xl border border-gold-200 bg-gold-50/40 p-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gold-700">Included Services</p>
                        {line.serviceItems.map((svc) => (
                          <div key={svc.serviceId} className={`rounded-lg border bg-white p-2.5 transition-opacity ${svc.enabled ? "border-navy-200 opacity-100" : "border-slate-100 opacity-50"}`}>
                            {/* Service header row */}
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => togglePackageService(line.lineId, svc.serviceId)}
                                className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${svc.enabled ? "bg-navy-700" : "bg-slate-300"}`}
                              >
                                <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${svc.enabled ? "translate-x-3" : "translate-x-0"}`} />
                              </button>
                              <span className="flex-1 text-xs font-bold text-navy-800 truncate">
                                {svc.serviceName}
                                {svc.sessions > 1 && <span className="ml-1 text-[10px] text-navy-400 font-normal">×{svc.sessions}</span>}
                              </span>
                            </div>

                            {/* Staff assignment per service */}
                            {svc.enabled && (
                              <div className="mt-2 flex items-center gap-1.5">
                                <select
                                  className="premium-input !py-1.5 !px-2 !text-xs appearance-none flex-1"
                                  value={svc.staffId || ""}
                                  onChange={(e) => updatePackageServiceField(line.lineId, svc.serviceId, "staffId", e.target.value)}
                                >
                                  <option value="">Assign Talent</option>
                                  {staffMembers.map((member) => (
                                    <option key={member.id} value={member.id}>{member.name}</option>
                                  ))}
                                </select>
                                {svc.staffId && (
                                  <button
                                    type="button"
                                    onClick={() => updatePackageServiceField(line.lineId, svc.serviceId, "staffId", "")}
                                    className="rounded border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-medium text-slate-500 hover:bg-slate-50"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Linked products per service */}
                            {svc.enabled && svc.productLinkages?.length > 0 && (
                              <div className="mt-2 space-y-1.5 rounded-lg bg-navy-50 p-2 border border-navy-100">
                                <p className="text-[9px] font-black uppercase tracking-widest text-navy-400">Product Consumption</p>
                                {svc.productLinkages.map((link) => {
                                  const finalQty = Math.max(0, Number(link.currentQty) || 0);
                                  const um = link.unitMaster;
                                  const unitOptions = um ? getAvailableUnits(um) : [];
                                  const showConv = um && link.currentUnit === "secondary" && finalQty > 0;
                                  const baseEquiv = showConv ? convertToBase(finalQty, um.conversionRatio, "secondary") : null;
                                  return (
                                    <div key={link.inventoryId} className={`space-y-0.5 transition-opacity ${link.enabled ? "opacity-100" : "opacity-40"}`}>
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => togglePackageServiceProduct(line.lineId, svc.serviceId, link.inventoryId)}
                                          className={`relative inline-flex h-3.5 w-6 shrink-0 rounded-full border-2 border-transparent transition-colors ${link.enabled ? "bg-emerald-500" : "bg-slate-300"}`}
                                        >
                                          <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white shadow transition-transform ${link.enabled ? "translate-x-2.5" : "translate-x-0"}`} />
                                        </button>
                                        <span className="flex-1 text-[11px] text-navy-700 truncate">
                                          {productNameById[link.inventoryId] || link.inventoryId}
                                        </span>
                                        {link.enabled && (
                                          <div className="flex items-center gap-1">
                                             <button
                                               type="button"
                                               onClick={() => updatePackageServiceProductQty(line.lineId, svc.serviceId, link.inventoryId, -1)}
                                               disabled={finalQty <= 0}
                                               className="flex h-4 w-4 items-center justify-center rounded border border-navy-200 bg-white text-navy-600 hover:bg-navy-50"
                                             >
                                               <Minus className="h-2 w-2" />
                                             </button>
                                             <input
                                               type="number"
                                               min="0"
                                               step="any"
                                               value={finalQty}
                                               onChange={(e) => updatePackageServiceProductField(line.lineId, svc.serviceId, link.inventoryId, "currentQty", Number(e.target.value) || 0)}
                                               className="w-12 text-center text-[11px] font-semibold text-navy-700 border border-navy-200 rounded px-1 py-0.5 bg-white focus:outline-none focus:border-navy-400"
                                             />
                                             <button
                                               type="button"
                                               onClick={() => updatePackageServiceProductQty(line.lineId, svc.serviceId, link.inventoryId, 1)}
                                               className="flex h-4 w-4 items-center justify-center rounded border border-navy-200 bg-white text-navy-600 hover:bg-navy-50"
                                             >
                                               <Plus className="h-2 w-2" />
                                             </button>
                                            {unitOptions.length > 0 && (
                                              <select
                                                className="text-[10px] font-semibold text-navy-600 bg-white border border-navy-200 rounded px-1 py-0.5 appearance-none"
                                                value={link.currentUnit || "primary"}
                                                onChange={(e) => updatePackageServiceProductField(line.lineId, svc.serviceId, link.inventoryId, "currentUnit", e.target.value)}
                                              >
                                                {unitOptions.map((opt) => (
                                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                              </select>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                      {showConv && baseEquiv !== null && (
                                        <div className="flex items-center gap-1 text-[9px] text-slate-400 pl-6">
                                          <ArrowLeftRight className="h-2 w-2" />
                                          <span>= {baseEquiv.toFixed(4).replace(/\.?0+$/, "")} {um.primaryAbbr}</span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Editable price for services with products */}
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-navy-300">Price</span>
                        <input
                          type="number"
                          min="0"
                          className="w-24 px-2 py-1 text-xs font-semibold text-navy-700 bg-white border border-navy-200 rounded-lg focus:outline-none focus:border-navy-400"
                          value={getLinePrice(line)}
                          onChange={(e) => updateLinePrice(line.lineId, e.target.value)}
                        />
                      </div>
                      <span className="text-xs font-bold text-navy-600">
                        × {line.quantity} = {formatCurrency(getLinePrice(line) * line.quantity)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-navy-100 bg-white/20 py-8 text-center">
                <ShoppingCart className="h-7 w-7 text-slate-300" />
                <p className="mt-2 text-xs font-medium text-slate-500">
                  Cart is empty. Add items from the catalog to begin.
                </p>
              </div>
            )}
          </div>

          {/* Totals + payment */}
          <div className="rounded-2xl border border-navy-100 bg-navy-950/5 p-4">
            {/* Expandable Discounts & Summary Breakdown Header */}
            <button
              type="button"
              onClick={() => setShowBillBreakdown((prev) => !prev)}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white border border-navy-100 hover:border-navy-300 hover:bg-navy-50/50 transition-all text-left mb-3 shadow-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gold-100 text-gold-700">
                  <Tag className="h-3.5 w-3.5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-navy-900 truncate">
                    Discounts & Summary Breakdown
                  </span>
                  <span className="text-[10px] text-slate-500 truncate">
                    Subtotal: <span className="font-semibold">{formatCurrency(subtotal)}</span> · Tax: <span className="font-semibold">{formatCurrency(tax)}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-2">
                {appliedCoupon ? (
                  <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-700">
                    Coupon: {appliedCoupon.code} (−{formatCurrency(appliedCoupon.discount_amount)})
                  </span>
                ) : discountAmount > 0 ? (
                  <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-700">
                    Disc (−{formatCurrency(discountAmount)})
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-navy-400">
                    Add Discount
                  </span>
                )}
                {showBillBreakdown ? (
                  <ChevronUp className="h-4 w-4 text-navy-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-navy-500" />
                )}
              </div>
            </button>

            {/* Collapsible Section */}
            {showBillBreakdown && (
              <div className="space-y-3 mb-3 rounded-xl border border-navy-100 bg-white p-3 shadow-xs transition-all">
                {/* Coupon Code Row */}
                <div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="Coupon Code"
                      value={couponCodeInput}
                      onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                      disabled={Boolean(appliedCoupon)}
                      className="flex-1 rounded-lg border border-navy-200 bg-white px-2.5 py-1 text-xs font-mono font-bold uppercase text-navy-800 focus:outline-none focus:border-navy-400 disabled:bg-gray-100"
                    />
                    {appliedCoupon ? (
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="rounded-lg bg-red-100 text-red-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider hover:bg-red-200 transition"
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={couponLoading || !couponCodeInput.trim()}
                        className="rounded-lg bg-gold-500 text-navy-950 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider hover:bg-gold-400 transition disabled:opacity-50"
                      >
                        {couponLoading ? "..." : "Apply"}
                      </button>
                    )}
                  </div>
                  {appliedCoupon && (
                    <div className="mt-1 text-[10px] font-bold text-emerald-600 flex items-center justify-between px-0.5">
                      <span>Code '{appliedCoupon.code}' Applied</span>
                      <span>- {formatCurrency(appliedCoupon.discount_amount)}</span>
                    </div>
                  )}
                </div>

                {/* Manual Discount Row (Disabled if Coupon is Applied) */}
                <div className={`flex items-center gap-2 ${appliedCoupon ? "opacity-40 pointer-events-none" : ""}`}>
                  <Tag className="h-3.5 w-3.5 text-gold-500 shrink-0" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-navy-400">Discount</span>
                  <div className="flex flex-1 items-center gap-1.5 ml-auto">
                    <button
                      type="button"
                      onClick={() => { setDiscountType("percent"); setDiscountValue(""); }}
                      className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-widest transition ${
                        discountType === "percent"
                          ? "bg-navy-900 text-white"
                          : "border border-navy-200 bg-white text-navy-600 hover:bg-navy-50"
                      }`}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDiscountType("flat"); setDiscountValue(""); }}
                      className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-widest transition ${
                        discountType === "flat"
                          ? "bg-navy-900 text-white"
                          : "border border-navy-200 bg-white text-navy-600 hover:bg-navy-50"
                      }`}
                    >
                      RM
                    </button>
                    <input
                      type="number"
                      min="0"
                      max={discountType === "percent" ? 100 : undefined}
                      placeholder={discountType === "percent" ? "0–100" : "Amount"}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      className="w-20 rounded-lg border border-navy-200 bg-white px-2 py-1 text-xs font-semibold text-navy-700 focus:outline-none focus:border-navy-400"
                    />
                  </div>
                </div>

                {/* Breakdown summary lines */}
                <div className="space-y-1.5 pt-2 border-t border-navy-100 text-xs font-medium text-navy-800">
                  <div className="flex items-center justify-between opacity-70">
                    <span>Subtotal</span>
                    <span className="font-bold">{formatCurrency(subtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex items-center justify-between text-emerald-600">
                      <span>Discount {discountType === "percent" ? `(${discountValue}%)` : "(Flat)"}</span>
                      <span className="font-bold">− {formatCurrency(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between opacity-70">
                    <span>Tax (8%)</span>
                    <span className="font-bold">{formatCurrency(tax)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Total Due (Always visible) */}
            <div className="flex items-center justify-between py-2 px-1 text-lg font-black text-navy-900 border-t border-navy-100">
              <span>Total Due</span>
              <span className="text-xl text-navy-950 font-black">{formatCurrency(total)}</span>
            </div>

            <div className="mt-3 grid grid-cols-5 gap-1 shadow-sm">
              {paymentMethods.map((method) => {
                const hotkeys = { Cash: "F4", Card: "F8", UPI: "F9", "Store Credit": "F11", Split: "F10" };
                const isSelected = paymentMethod === method;
                return (
                  <button
                    key={method}
                    type="button"
                    className={
                      isSelected
                        ? "rounded-xl bg-navy-900 py-2.5 text-[9px] font-black uppercase tracking-wider text-white ring-2 ring-navy-300"
                        : "rounded-xl border border-navy-100 bg-white py-2.5 text-[9px] font-black uppercase tracking-wider text-navy-600 transition hover:bg-navy-50"
                    }
                    onClick={() => {
                      if (isSelected) {
                        clearPayment();
                      } else {
                        setPaymentMethod(method);
                        syncPaymentDetailsWithMethod(method);
                        if (method === "Cash" || method === "Store Credit") {
                          setSelectedBankId("");
                        }
                      }
                    }}
                  >
                    <div>{method}</div>
                    <span className={`text-[8px] font-mono font-bold ${isSelected ? "text-navy-300" : "text-navy-400"}`}>
                      [{hotkeys[method]}]
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Payment Details / Breakdown */}
            {paymentMethod || paymentDetails.length > 0 ? (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-navy-400 flex items-center gap-1">
                    <CreditCard className="h-3 w-3" /> Payment Breakdown
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={clearPayment}
                      className="text-[10px] font-bold uppercase tracking-widest text-rose-500 hover:text-rose-700 transition"
                    >
                      Remove / Clear
                    </button>
                    <button
                      type="button"
                      onClick={addPaymentDetail}
                      className="text-[10px] font-black uppercase tracking-widest text-gold-600 hover:text-gold-700"
                    >
                      + Add Method
                    </button>
                  </div>
                </div>
                {paymentDetails.map((detail, idx) => (
                  <div key={idx} className="space-y-1.5 rounded-xl border border-navy-100 bg-white p-2">
                    <div className="flex items-center gap-1.5">
                      <select
                        value={detail.paymentMode}
                        onChange={(e) => {
                          updatePaymentDetail(idx, "paymentMode", e.target.value);
                          if (e.target.value === "cash") updatePaymentDetail(idx, "bankAccountId", "");
                        }}
                        className="flex-1 rounded-lg border border-navy-200 bg-white px-2 py-1.5 text-xs font-semibold text-navy-700 focus:outline-none focus:border-navy-400"
                      >
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="upi">UPI</option>
                        <option value="store_credit">Store Credit</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="cheque">Cheque</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="Amount"
                        value={detail.amount}
                        onChange={(e) => {
                          updatePaymentDetail(idx, "amount", e.target.value);
                        }}
                        className="w-28 rounded-lg border border-navy-200 bg-white px-2 py-1.5 text-xs font-semibold text-navy-700 text-right focus:outline-none focus:border-navy-400"
                      />
                      <button
                        type="button"
                        onClick={() => removePaymentDetail(idx)}
                        className="text-rose-400 hover:text-rose-600 flex-shrink-0 p-1 hover:bg-rose-50 rounded-lg transition"
                        title="Remove payment detail"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {detail.paymentMode !== "cash" && (
                      <BankSelector
                        value={detail.bankAccountId || ""}
                        onChange={(v) => updatePaymentDetail(idx, "bankAccountId", v)}
                        label=""
                        required={false}
                        placeholder="Select bank account"
                        showDefaultIndicator={true}
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 flex items-center justify-between rounded-xl border border-amber-200/70 bg-amber-50/50 p-2.5 text-xs text-amber-800">
                <span className="font-semibold">No payment detail added (Unpaid / Pay Later bill)</span>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod("Cash");
                    syncPaymentDetailsWithMethod("Cash");
                  }}
                  className="text-[10px] font-black uppercase tracking-wider text-navy-900 underline hover:text-navy-700"
                >
                  + Add Payment
                </button>
              </div>
            )}
                {/* Running total vs bill total */}
                {(() => {
                  const entered = paymentDetails.reduce((s, d) => s + (Number(d.amount) || 0), 0);
                  const balance = total - entered;
                  if (entered === 0) return null;
                  return (
                    <p className={`text-[10px] font-black uppercase tracking-widest ${
                      balance === 0 ? "text-emerald-600" : balance > 0 ? "text-amber-500" : "text-rose-500"
                    }`}>
                      {balance === 0 ? "Fully covered" : balance > 0 ? `Due: ${balance.toFixed(2)}` : `Overpaid: ${Math.abs(balance).toFixed(2)}`}
                    </p>
                  );
                })()}
              </div>

            {/* Transaction Ref + Notes */}
            {paymentMethod && (
              <div className="mt-3 space-y-2">
                <input
                  type="text"
                  value={transactionReference}
                  onChange={(e) => setTransactionReference(e.target.value)}
                  placeholder="Transaction ref (optional)"
                  className="w-full rounded-lg border border-navy-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-navy-700 placeholder:text-slate-400 focus:outline-none focus:border-navy-400"
                />
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Payment notes (optional)"
                  className="w-full rounded-lg border border-navy-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-navy-700 placeholder:text-slate-400 focus:outline-none focus:border-navy-400"
                />
              </div>
            )}

            {cart.length === 0 && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-amber-600">
                <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Add items to cart to continue checkout</span>
              </div>
            )}


            {cart.length > 0 && paymentMethod && !isSplitCovered && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-amber-600">
                <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Split breakdown total ({totalEnteredInBreakdown.toFixed(2)}) must equal total ({total.toFixed(2)})</span>
              </div>
            )}

            {cart.length > 0 && nonCashNeedsBank && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-amber-600">
                <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Select a bank account for each non-cash payment row</span>
              </div>
            )}

            {hasUnassignedService && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-amber-600">
                <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Talent not assigned — you can still proceed</span>
              </div>
            )}

            {/* Stock Validation Warnings */}
            {stockErrors.length > 0 && (
              <div className={`mt-3 rounded-xl border p-3 ${
                allowOutOfStockCheckout
                  ? "bg-amber-50 border-amber-200"
                  : "bg-rose-50 border-rose-200"
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className={`h-4 w-4 flex-shrink-0 ${
                    allowOutOfStockCheckout ? "text-amber-600" : "text-rose-600"
                  }`} />
                  <span className={`text-xs font-black uppercase tracking-widest ${
                    allowOutOfStockCheckout ? "text-amber-700" : "text-rose-700"
                  }`}>
                    {allowOutOfStockCheckout ? "Stock Warning (Checkout Allowed)" : "Stock Error (Checkout Blocked)"}
                  </span>
                </div>
                <p className={`text-[11px] mb-1.5 ${
                  allowOutOfStockCheckout ? "text-amber-600" : "text-rose-600"
                }`}>
                  {allowOutOfStockCheckout
                    ? "Some items have insufficient stock. Proceeding as out-of-stock checkout is enabled in Settings."
                    : "Some items are out of stock. Enable out-of-stock checkout in Settings to proceed."}
                </p>
                <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                  {stockErrors.map((error, idx) => (
                    <div key={idx} className={`text-[11px] leading-tight ${
                      allowOutOfStockCheckout ? "text-amber-700" : "text-rose-700"
                    }`}>
                      <span className="font-semibold">{error.itemName}</span>: need {error.required}, have {error.available}
                      <span className={allowOutOfStockCheckout ? "text-amber-500" : "text-rose-500"}> (short {error.shortfall})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              className="btn-premium-primary mt-3 w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale"
              onClick={handleCheckout}
              disabled={!canCheckout}
            >
              <span>{editingBillId ? `Update Invoice #${editingBillNumber}` : "Complete Billing"}</span>
              <kbd className="rounded bg-white/20 px-1.5 py-0.5 text-[9px] font-mono font-bold text-white">Ctrl+↵ / F12</kbd>
            </button>
          </div>
        </div>

      {showInvoice && (
        <InvoiceModal
          bill={currentBill}
          onClose={() => setShowInvoice(false)}
        />
      )}

      {/* Keyboard Shortcuts Reference Guide Modal */}
      {showShortcutGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl border border-white/20 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-navy-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-900 text-white">
                  <Keyboard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-navy-900">Keyboard Shortcuts Guide</h3>
                  <p className="text-xs font-medium text-slate-500">Fast hands-on-keyboard POS controls</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowShortcutGuide(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-navy-400 mb-2">POS & Billing Controls</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5">
                    <span className="text-xs font-semibold text-navy-800">Focus Catalog Search</span>
                    <div className="flex gap-1">
                      <kbd className="rounded bg-white border border-slate-200 px-2 py-0.5 text-xs font-mono font-bold text-navy-700 shadow-sm">F2</kbd>
                      <kbd className="rounded bg-white border border-slate-200 px-2 py-0.5 text-xs font-mono font-bold text-navy-700 shadow-sm">Ctrl+K</kbd>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5">
                    <span className="text-xs font-semibold text-navy-800">Select Cash Payment</span>
                    <div className="flex gap-1">
                      <kbd className="rounded bg-white border border-slate-200 px-2 py-0.5 text-xs font-mono font-bold text-navy-700 shadow-sm">F4</kbd>
                      <kbd className="rounded bg-white border border-slate-200 px-2 py-0.5 text-xs font-mono font-bold text-navy-700 shadow-sm">Alt+1</kbd>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5">
                    <span className="text-xs font-semibold text-navy-800">Select Card Payment</span>
                    <div className="flex gap-1">
                      <kbd className="rounded bg-white border border-slate-200 px-2 py-0.5 text-xs font-mono font-bold text-navy-700 shadow-sm">F8</kbd>
                      <kbd className="rounded bg-white border border-slate-200 px-2 py-0.5 text-xs font-mono font-bold text-navy-700 shadow-sm">Alt+2</kbd>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5">
                    <span className="text-xs font-semibold text-navy-800">Select UPI Payment</span>
                    <div className="flex gap-1">
                      <kbd className="rounded bg-white border border-slate-200 px-2 py-0.5 text-xs font-mono font-bold text-navy-700 shadow-sm">F9</kbd>
                      <kbd className="rounded bg-white border border-slate-200 px-2 py-0.5 text-xs font-mono font-bold text-navy-700 shadow-sm">Alt+3</kbd>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5">
                    <span className="text-xs font-semibold text-navy-800">Select Split Payment</span>
                    <div className="flex gap-1">
                      <kbd className="rounded bg-white border border-slate-200 px-2 py-0.5 text-xs font-mono font-bold text-navy-700 shadow-sm">F10</kbd>
                      <kbd className="rounded bg-white border border-slate-200 px-2 py-0.5 text-xs font-mono font-bold text-navy-700 shadow-sm">Alt+4</kbd>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-100 p-2.5">
                    <span className="text-xs font-bold text-emerald-900">Complete Billing</span>
                    <div className="flex gap-1">
                      <kbd className="rounded bg-emerald-700 px-2 py-0.5 text-xs font-mono font-bold text-white shadow-sm">Ctrl+↵</kbd>
                      <kbd className="rounded bg-emerald-700 px-2 py-0.5 text-xs font-mono font-bold text-white shadow-sm">F12</kbd>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-navy-400 mb-2">Global Navigation Hotkeys</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5">
                    <span className="text-xs font-semibold text-navy-800">Go to POS Desk</span>
                    <kbd className="rounded bg-white border border-slate-200 px-2 py-0.5 text-xs font-mono font-bold text-navy-700 shadow-sm">Alt+P</kbd>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5">
                    <span className="text-xs font-semibold text-navy-800">Go to Billing Invoices</span>
                    <kbd className="rounded bg-white border border-slate-200 px-2 py-0.5 text-xs font-mono font-bold text-navy-700 shadow-sm">Alt+B</kbd>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5">
                    <span className="text-xs font-semibold text-navy-800">Go to Inventory</span>
                    <kbd className="rounded bg-white border border-slate-200 px-2 py-0.5 text-xs font-mono font-bold text-navy-700 shadow-sm">Alt+I</kbd>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5">
                    <span className="text-xs font-semibold text-navy-800">Go to Expenses</span>
                    <kbd className="rounded bg-white border border-slate-200 px-2 py-0.5 text-xs font-mono font-bold text-navy-700 shadow-sm">Alt+E</kbd>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5">
                    <span className="text-xs font-semibold text-navy-800">Toggle Sidebar</span>
                    <kbd className="rounded bg-white border border-slate-200 px-2 py-0.5 text-xs font-mono font-bold text-navy-700 shadow-sm">Ctrl+B</kbd>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-navy-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowShortcutGuide(false)}
                className="btn-premium-primary !py-2 !px-6 !text-xs"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {showInvoice && currentBill && (
        <InvoiceModal bill={currentBill} onClose={() => setShowInvoice(false)} />
      )}

      {/* POS Shift Modals */}
      <TerminalSelectModal
        isOpen={showTerminalModal}
        onClose={() => setShowTerminalModal(false)}
        terminals={posTerminals}
        selectedTerminal={selectedTerminal}
        onSelectTerminal={handleSelectTerminal}
        onCreateTerminal={handleCreateTerminal}
        loading={shiftLoading}
      />

      <OpenShiftModal
        isOpen={showOpenShiftModal}
        onClose={() => setShowOpenShiftModal(false)}
        terminal={selectedTerminal}
        outletName={outlets?.find((o) => o.id === (selectedOutlet || user?.outlet_id))?.name || user?.outlet_name}
        user={user}
        onOpenShift={handleOpenShift}
        loading={shiftLoading}
      />

      <CashMovementModal
        isOpen={showCashMovementModal}
        onClose={() => setShowCashMovementModal(false)}
        onSubmit={handleAddCashMovement}
        loading={shiftLoading}
      />

      <XReportModal
        isOpen={showXReportModal}
        onClose={() => setShowXReportModal(false)}
        shiftId={activeShift?.id}
      />

      <CloseShiftModal
        isOpen={showCloseShiftModal}
        onClose={() => setShowCloseShiftModal(false)}
        shiftId={activeShift?.id}
        onShiftClosed={handleShiftClosed}
      />

      <ZReportPrintModal
        isOpen={showZReportModal}
        onClose={() => setShowZReportModal(false)}
        report={zReportData}
      />
    </div>
  );
}
