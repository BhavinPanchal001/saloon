import { useState, useEffect } from "react";
import { Building2, Phone, Mail, Globe, FileText, Receipt, Save, Sparkles, Check, MapPin, Hash, DollarSign } from "lucide-react";
import { fetchBusinessSettingsAPI, saveBusinessSettingsAPI, DEFAULT_BUSINESS_INFO } from "../../services/api";
import { useToastStore } from "../../stores/toastStore";

export function BusinessInfoTab() {
  const toast = useToastStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(DEFAULT_BUSINESS_INFO);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchBusinessSettingsAPI();
        setFormData((prev) => ({
          ...prev,
          ...data,
        }));
      } catch (err) {
        toast.error("Could not load business settings");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveBusinessSettingsAPI(formData);
      toast.success("Business information saved successfully! All receipts and invoices updated.");
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to save business info");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent mr-3" />
        Loading business information...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-lg font-bold text-navy-900 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-indigo-600" /> Business & Store Information
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure your registered salon name, contact details, and tax ID printed on customer receipts and invoices.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="btn-premium-primary inline-flex items-center gap-2 !py-2.5 !px-5 text-xs font-bold self-start sm:self-auto"
        >
          {saving ? (
            <>
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Saving...
            </>
          ) : (
            <>
              <Save size={15} /> Save Business Info
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ─── Left Column: Input Form (7 cols) ─── */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Brand Identity Card */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" /> Brand & Salon Identity
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-navy-800">
                    Business / Salon Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="e.g. Glowy Salon & Spa"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-navy-800">Tagline / Slogan</label>
                  <input
                    type="text"
                    value={formData.tagline}
                    onChange={(e) => handleChange("tagline", e.target.value)}
                    placeholder="e.g. Glow to go with Glowy"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-navy-800 flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5 text-slate-400" /> SST / Tax / Reg Number
                  </label>
                  <input
                    type="text"
                    value={formData.taxNumber}
                    onChange={(e) => handleChange("taxNumber", e.target.value)}
                    placeholder="e.g. W10-2304-32000000 / 202601012345"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-navy-800 flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-slate-400" /> Currency Symbol
                  </label>
                  <input
                    type="text"
                    value={formData.currency || "RM"}
                    onChange={(e) => handleChange("currency", e.target.value)}
                    placeholder="e.g. RM"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                  />
                </div>
              </div>
            </div>

            {/* Address & Contact Information Card */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-indigo-500" /> Official Address & Contacts
              </h3>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-navy-800 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" /> Registered Business Address
                  </label>
                  <textarea
                    rows={2}
                    value={formData.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                    placeholder="e.g. No. 18, Jalan Telawi 3, Bangsar, 59100 Kuala Lumpur, Malaysia"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-navy-800 flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-slate-400" /> Phone Number
                    </label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      placeholder="e.g. +60 3-2282 1234 / +60 12-345 6789"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-navy-800 flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-slate-400" /> Business Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      placeholder="e.g. contact@glowy.my"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-navy-800 flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-slate-400" /> Website URL
                  </label>
                  <input
                    type="text"
                    value={formData.website}
                    onChange={(e) => handleChange("website", e.target.value)}
                    placeholder="e.g. www.glowy.my"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                  />
                </div>
              </div>
            </div>

            {/* Receipt Notes & Custom Footer Card */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Receipt className="h-4 w-4 text-emerald-500" /> POS Receipt Messages & Terms
              </h3>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-navy-800">Receipt Thank You Note</label>
                  <input
                    type="text"
                    value={formData.receiptFooter}
                    onChange={(e) => handleChange("receiptFooter", e.target.value)}
                    placeholder="e.g. Thank you for visiting! Glow to go with Glowy ✨"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-navy-800">
                      Terms & Conditions / Return Policy
                    </label>
                    <span className="text-[10px] text-slate-400">Printed at the bottom of receipts & invoices</span>
                  </div>
                  <textarea
                    rows={4}
                    value={formData.terms}
                    onChange={(e) => handleChange("terms", e.target.value)}
                    placeholder="e.g.&#10;1. Services rendered & packages are non-refundable.&#10;2. Product exchange within 7 days with original receipt.&#10;3. Computer generated invoice."
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 resize-none font-mono"
                  />
                  <p className="text-[10.5px] text-slate-400">
                    💡 Tip: Press Enter for new lines. Each bullet point or rule will print neatly wrapped on its own line.
                  </p>

                  {/* Policy Presets */}
                  <div className="pt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="text-slate-400 text-[10px] font-semibold">Insert Preset:</span>
                    <button
                      type="button"
                      onClick={() => handleChange("terms", "1. Services rendered & packages redeemed are non-refundable.\n2. Retail products exchangeable within 7 days in unopened condition with receipt.\n3. Computer-generated receipt. Thank you!")}
                      className="px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold border border-indigo-200 transition-colors"
                    >
                      + Standard Salon Policy
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChange("terms", "1. All sales are final. Strictly no cash refund.\n2. Exchange permitted for defective products within 48 hours.\n3. Services by appointment only.")}
                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-200 transition-colors"
                    >
                      + Strict No-Refund Policy
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChange("terms", "Services non-refundable once rendered.\nComputer generated invoice.")}
                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-200 transition-colors"
                    >
                      + Compact (58mm)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* ─── Right Column: Live Receipt Preview (5 cols) ─── */}
        <div className="lg:col-span-5">
          <div className="sticky top-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Receipt className="h-4 w-4 text-indigo-600" /> Live Receipt Preview
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                80mm Thermal
              </span>
            </div>

            {/* Thermal Receipt Mock View */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4 shadow-inner flex justify-center">
              <div
                className="w-full max-w-[290px] bg-white rounded-xl shadow-lg border border-slate-200 p-3.5 font-mono text-[10.5px] text-black leading-tight select-none space-y-1"
                style={{ fontFamily: "'Courier New', Courier, monospace" }}
              >
                {/* Header */}
                <div className="text-center pb-1 space-y-0.5">
                  <h4 className="text-sm font-black tracking-widest uppercase">
                    {formData.name || "GLOWY"}
                  </h4>
                  {formData.tagline && (
                    <p className="text-[9px] italic text-black/80">{formData.tagline}</p>
                  )}
                  <div className="border-t border-dashed border-black my-1" />
                  <p className="text-[9px] text-black/90">{formData.address || "Address not set"}</p>
                  {formData.phone && <p className="text-[9px] text-black/90">Ph: {formData.phone}</p>}
                  {formData.taxNumber && (
                    <p className="text-[9px] text-black/90">SST/Reg: {formData.taxNumber}</p>
                  )}
                  {formData.email && <p className="text-[9px] text-black/70">{formData.email}</p>}
                </div>

                {/* Separator */}
                <div className="border-t border-dashed border-black my-1" />

                {/* Sample metadata */}
                <div className="text-[9.5px] space-y-0.5 text-black/80">
                  <div className="flex justify-between">
                    <span>Bill#: GL-2026-0035</span>
                    <span>12:38 am</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date: 02 Sep 2026</span>
                    <span>Outlet 1</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Customer: Walk-in Guest</span>
                  </div>
                  <div className="flex justify-between font-semibold text-black">
                    <span>Served by:</span>
                    <span>Sarah</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-black my-1" />

                {/* Sample items table */}
                <div className="flex justify-between font-bold text-[9.5px]">
                  <span className="w-5">#</span>
                  <span className="flex-1 text-left">ITEM</span>
                  <span className="w-8 text-right pr-1">QTY</span>
                  <span className="w-20 text-right">AMOUNT</span>
                </div>
                <div className="border-t border-dashed border-black my-0.5" />

                <div className="space-y-0.5 text-[9.5px]">
                  <div className="flex justify-between items-start">
                    <span className="w-5">1.</span>
                    <div className="flex-1 truncate pr-1">
                      <div>Hair Styling & Wash</div>
                      <div className="text-[8px] text-black/70 italic">Served by: Sarah</div>
                    </div>
                    <span className="w-8 text-right pr-1">1</span>
                    <span className="w-20 text-right font-bold">{formData.currency || "RM"} 90.00</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="w-5">2.</span>
                    <div className="flex-1 truncate pr-1">Organic Argan Serum</div>
                    <span className="w-8 text-right pr-1">1</span>
                    <span className="w-20 text-right font-bold">{formData.currency || "RM"} 100.00</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-black my-1" />

                {/* Sample totals */}
                <div className="text-[9.5px] space-y-0.5">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formData.currency || "RM"} 190.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax (GST 8%):</span>
                    <span>{formData.currency || "RM"} 15.20</span>
                  </div>
                  <div className="border-t-2 border-b-2 border-black my-1 py-0.5 flex justify-between font-black text-xs">
                    <span>TOTAL:</span>
                    <span>{formData.currency || "RM"} 205.20</span>
                  </div>
                  <div className="flex justify-between text-[9px]">
                    <span>Payment:</span>
                    <span className="font-bold">CASH</span>
                  </div>
                </div>

                {/* Custom footer preview */}
                <div className="border-t border-dashed border-black pt-1.5 text-center space-y-0.5">
                  <p className="font-bold text-[9.5px]">
                    {formData.receiptFooter || "Thank you for visiting!"}
                  </p>
                  {formData.terms && (
                    <div className="text-[8px] text-black/60 leading-tight whitespace-pre-line text-center pt-0.5">
                      {formData.terms}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
