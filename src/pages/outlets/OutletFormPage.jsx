import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { createOutlet, fetchOutletProfile } from "../../services/mockApi";
import { ArrowLeft } from "lucide-react";

export function OutletFormPage() {
  const { outletId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    city: "",
    manager: "",
    monthlyBudget: "",
  });

  useEffect(() => {
    if (outletId) {
      fetchOutletProfile(outletId).then((data) => {
        setFormData({
          name: data.name,
          city: data.city,
          manager: data.manager,
          monthlyBudget: data.monthlyBudget.toString(),
        });
      });
    }
  }, [outletId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createOutlet({
        ...formData,
        id: outletId,
      });
      navigate("/outlets");
    } catch (error) {
      console.error("Failed to save outlet:", error);
      alert("Failed to save outlet");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="max-w-4xl">
      <button
        onClick={() => navigate("/outlets")}
        className="mb-6 flex items-center gap-2 text-sm font-bold text-navy-500 hover:text-navy-700"
      >
        <ArrowLeft size={16} />
        Back to Outlets
      </button>

      <PageHeader
        eyebrow="Network"
        title={outletId ? "Edit Outlet" : "Add New Outlet"}
        description="Configure branch-level details, manager assignment, and operating budget."
      />

      <form onSubmit={handleSubmit} className="glass-card">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <label className="premium-label">Outlet Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. HSR Layout"
              className="premium-input"
              required
            />
          </div>

          <div>
            <label className="premium-label">City</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="e.g. Bengaluru"
              className="premium-input"
              required
            />
          </div>

          <div>
            <label className="premium-label">Branch Manager</label>
            <input
              type="text"
              name="manager"
              value={formData.manager}
              onChange={handleChange}
              placeholder="Enter name of the manager"
              className="premium-input"
              required
            />
          </div>

          <div>
            <label className="premium-label">Monthly Operating Budget</label>
            <input
              type="number"
              name="monthlyBudget"
              value={formData.monthlyBudget}
              onChange={handleChange}
              placeholder="0.00"
              className="premium-input"
              required
            />
          </div>
        </div>

        <div className="mt-10 flex justify-end gap-3 border-t border-navy-50 pt-8">
          <button
            type="button"
            onClick={() => navigate("/outlets")}
            className="btn-premium-outline"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-premium-primary min-w-[140px]"
          >
            {loading ? "Saving..." : outletId ? "Update Outlet" : "Create Outlet"}
          </button>
        </div>
      </form>
    </div>
  );
}
