import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Printer, X, Bluetooth, Check, Loader2 } from "lucide-react";
import {
  getBluetoothPrinterStatus,
  connectBluetoothPrinter,
  autoReconnectBluetoothPrinter,
  printBluetoothReceipt,
  onPrinterStateChange,
} from "../../utils/bluetoothPrinter";
import { useToastStore } from "../../stores/toastStore";
import { ThermalReceiptTemplate } from "./ThermalReceiptTemplate";

export function ThermalReceiptModal({ bill, onClose }) {
  if (!bill) return null;
  const toast = useToastStore();

  const [btStatus, setBtStatus] = useState(getBluetoothPrinterStatus());
  const [printingBt, setPrintingBt] = useState(false);
  const [connectingBt, setConnectingBt] = useState(false);
  const [paperWidth, setPaperWidth] = useState(() => {
    return localStorage.getItem("glowy_printer_paper_width") ? parseInt(localStorage.getItem("glowy_printer_paper_width"), 10) : 48;
  });

  useEffect(() => {
    const unsub = onPrinterStateChange((status) => {
      setBtStatus(status);
    });
    autoReconnectBluetoothPrinter().catch(() => {});
    return () => unsub();
  }, []);

  const handlePrintBrowser = () => {
    document.body.classList.add("thermal-print-mode");
    if (paperWidth === 32) document.body.classList.add("thermal-print-mode-58");

    const cleanup = () => {
      document.body.classList.remove("thermal-print-mode", "thermal-print-mode-58");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);

    window.print();
    setTimeout(cleanup, 1500);
  };

  const handlePrintBluetooth = async () => {
    setPrintingBt(true);
    try {
      if (!btStatus.connected) {
        setConnectingBt(true);
        const reconnected = await autoReconnectBluetoothPrinter();
        if (!reconnected) {
          await connectBluetoothPrinter();
        }
        setConnectingBt(false);
      }
      const res = await printBluetoothReceipt(bill, { paperWidth });
      toast.success(res.message || "Receipt printed via Bluetooth!");
    } catch (err) {
      if (err.name !== 'NotFoundError' && !err.message?.includes('User cancelled')) {
        toast.error(err.message || "Bluetooth print failed. Falling back to browser print...");
        handlePrintBrowser();
      }
    } finally {
      setPrintingBt(false);
      setConnectingBt(false);
    }
  };

  const handleConnectBt = async () => {
    setConnectingBt(true);
    try {
      const reconnected = await autoReconnectBluetoothPrinter();
      if (!reconnected) {
        const res = await connectBluetoothPrinter();
        toast.success(`Connected to ${res.deviceName}!`);
      } else {
        toast.success("Reconnected to Bluetooth printer!");
      }
    } catch (err) {
      if (err.name !== 'NotFoundError' && !err.message?.includes('User cancelled')) {
        toast.error(err.message || "Failed to connect Bluetooth printer");
      }
    } finally {
      setConnectingBt(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 thermal-receipt-overlay">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-5 space-y-3.5 border border-slate-100 max-h-[92vh] overflow-y-auto thermal-receipt-wrapper">
        <div className="flex items-center justify-between no-print border-b border-slate-100 pb-3">
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <Printer className="w-4 h-4 text-indigo-600" /> POS Thermal Receipt
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bluetooth status bar & roll toggle */}
        <div className="no-print flex items-center justify-between px-3 py-2 bg-indigo-50/70 rounded-xl border border-indigo-100 text-xs">
          <div className="flex items-center gap-2">
            <Bluetooth className={`w-4 h-4 ${btStatus.connected ? 'text-emerald-600' : 'text-indigo-500'}`} />
            <span className="font-medium text-slate-700 truncate max-w-[130px]">
              {btStatus.connected ? (
                <span className="text-emerald-700 font-bold">{btStatus.deviceName || 'BT Printer'}</span>
              ) : (
                'Bluetooth'
              )}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {btStatus.connected ? (
              <span className="flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
                <Check className="w-3 h-3" /> Ready
              </span>
            ) : (
              <button
                onClick={handleConnectBt}
                disabled={connectingBt || !btStatus.supported}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline disabled:opacity-50"
              >
                {connectingBt ? "Connecting..." : "Connect"}
              </button>
            )}
          </div>
        </div>

        {/* Printable Area Wrapper */}
        <div className="p-2 border border-slate-200 rounded-2xl bg-slate-50 flex justify-center shadow-inner thermal-preview-container">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden thermal-receipt-card">
            <ThermalReceiptTemplate bill={bill} paperWidth={paperWidth} />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row justify-end gap-2 pt-1 no-print">
          <button
            onClick={onClose}
            className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            Close
          </button>
          
          <button
            onClick={handlePrintBrowser}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
          >
            <Printer className="w-3.5 h-3.5" /> Browser Print
          </button>

          <button
            onClick={handlePrintBluetooth}
            disabled={printingBt || connectingBt}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md disabled:opacity-50"
          >
            {printingBt ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Printing...
              </>
            ) : (
              <>
                <Bluetooth className="w-3.5 h-3.5" />
                {btStatus.connected ? "Print via Bluetooth" : "Connect & Print"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
