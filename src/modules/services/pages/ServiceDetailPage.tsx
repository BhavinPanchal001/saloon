import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { PageHeader } from '../../../components/ui/PageHeader';
import { LoadingState } from '../../../components/ui/LoadingState';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useToastStore } from '../../../stores/toastStore';
import { fetchServiceByIdFromAPI, deleteServiceAPI } from '../../../services/api';
import { formatCurrency } from '../../../utils/format';
import {
  Scissors,
  Clock,
  DollarSign,
  Package,
  ArrowLeft,
  Edit,
  Trash2,
  ChevronRight,
  Tag,
  CheckCircle,
  AlertCircle,
  BarChart3,
  TrendingUp,
  Users,
  Calendar
} from 'lucide-react';

// Mock service usage data
const generateMockUsageData = () => ({
  totalBookings: 156,
  revenue: 78000,
  thisMonth: 28,
  lastMonth: 32,
  growth: -12.5,
  averageDuration: 45,
  topStaff: [
    { name: "Priya Sharma", count: 45 },
    { name: "Rahul Verma", count: 38 },
    { name: "Anita Patel", count: 32 },
  ],
  monthlyTrend: [
    { month: "Jan", count: 24 },
    { month: "Feb", count: 28 },
    { month: "Mar", count: 26 },
    { month: "Apr", count: 32 },
    { month: "May", count: 28 },
    { month: "Jun", count: 18 },
  ]
});

const ServiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToastStore();
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [usageData] = useState(generateMockUsageData());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadService();
  }, [id]);

  const loadService = async () => {
    try {
      setLoading(true);
      const found = await fetchServiceByIdFromAPI(id);
      setService({
        ...found,
        serviceName: found.service_name,
        servicePrice: found.price,
        serviceDuration: found.duration,
        serviceDescription: found.description || '',
        serviceType: found.category?.name || 'Standard Service',
        category: found.category?.name || '',
        productLinkages: found.product_linkages || [],
        active: found.status === 'active',
      });
    } catch (err) {
      toast.error('Service not found');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!id) return;
    try {
      await deleteServiceAPI(id);
      toast.success('Service deleted successfully');
      navigate('/services');
    } catch (err) {
      toast.error('Failed to delete service');
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Service Details" />
        <LoadingState message="Loading service information..." />
      </div>
    );
  }

  if (!service) {
    return (
      <div>
        <PageHeader title="Service Not Found" />
        <EmptyState
          icon="search"
          title="Service not found"
          description="The requested service could not be found."
          action={<button onClick={() => navigate('/services')} className="btn-premium-primary">Back to Services</button>}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/services"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-navy-900">{service.serviceName}</h1>
            <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
              <span>Service ID: {service.id}</span>
              <span>•</span>
              <span className={service.active ? 'text-emerald-600' : 'text-rose-600'}>
                {service.active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-100"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
          <Link
            to={`/services/edit/${id}`}
            className="btn-premium-primary flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit Service
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="glass-card p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Price</p>
              <p className="mt-2 text-2xl font-black text-navy-900">{formatCurrency(service.servicePrice)}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-50 text-gold-600">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Duration</p>
              <p className="mt-2 text-2xl font-black text-navy-900">{service.serviceDuration} min</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Clock className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Total Bookings</p>
              <p className="mt-2 text-2xl font-black text-navy-900">{usageData.totalBookings}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Calendar className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">This Month</p>
              <p className="mt-2 text-2xl font-black text-navy-900">{usageData.thisMonth}</p>
              <p className={`text-xs ${usageData.growth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {usageData.growth >= 0 ? '+' : ''}{usageData.growth}% vs last month
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Service Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-navy-900">Service Information</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-100 bg-white/50 p-4">
                <p className="text-xs font-medium text-slate-500 uppercase">Service Type</p>
                <p className="mt-1 font-medium text-navy-900">{service.serviceType || 'Standard Service'}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white/50 p-4">
                <p className="text-xs font-medium text-slate-500 uppercase">Category</p>
                <p className="mt-1 font-medium text-navy-900">{service.category || 'General'}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white/50 p-4">
                <p className="text-xs font-medium text-slate-500 uppercase">Gender</p>
                <p className="mt-1 font-medium text-navy-900">{service.gender || 'Unisex'}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white/50 p-4">
                <p className="text-xs font-medium text-slate-500 uppercase">Status</p>
                <div className="mt-1 flex items-center gap-2">
                  {service.active ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                      <span className="font-medium text-emerald-600">Active</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-rose-600" />
                      <span className="font-medium text-rose-600">Inactive</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {service.serviceDescription && (
              <div className="mt-6">
                <p className="text-xs font-medium text-slate-500 uppercase">Description</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">{service.serviceDescription}</p>
              </div>
            )}
          </div>

          {/* Usage Trend */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-navy-900">Monthly Usage Trend</h3>
            <div className="mt-4 space-y-3">
              {usageData.monthlyTrend.map((month) => (
                <div key={month.month} className="flex items-center gap-4">
                  <span className="w-12 text-sm text-slate-600">{month.month}</span>
                  <div className="flex-1">
                    <div className="h-8 rounded-lg bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-lg bg-gradient-to-r from-navy-500 to-navy-400"
                        style={{ width: `${(month.count / 40) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-10 text-right text-sm font-semibold text-navy-900">{month.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {/* Top Staff */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-navy-900">Top Performing Staff</h3>
            <div className="mt-4 space-y-3">
              {usageData.topStaff.map((staff, index) => (
                <div
                  key={staff.name}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-white/50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-100 text-sm font-bold text-navy-700">
                      {index + 1}
                    </div>
                    <span className="font-medium text-navy-900">{staff.name}</span>
                  </div>
                  <span className="text-sm text-slate-500">{staff.count} services</span>
                </div>
              ))}
            </div>
          </div>

          {/* Linked Products */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-navy-900">Linked Products</h3>
            {service.products && service.products.length > 0 ? (
              <div className="mt-4 space-y-3">
                {service.products.map((product: any) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-white/50 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-50">
                        <Package className="h-4 w-4 text-gold-600" />
                      </div>
                      <div>
                        <p className="font-medium text-navy-900">{product.name}</p>
                        <p className="text-xs text-slate-500">Qty: {product.quantity}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
                <Package className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">No products linked</p>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-navy-900">Quick Actions</h3>
            <div className="mt-4 space-y-2">
              <Link
                to={`/services/edit/${id}`}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-sm font-medium text-navy-700 transition-colors hover:bg-slate-50"
              >
                Edit Service Details
                <ChevronRight className="h-4 w-4" />
              </Link>
              <button
                onClick={() => toast.info('Duplicate feature coming soon')}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-sm font-medium text-navy-700 transition-colors hover:bg-slate-50"
              >
                Duplicate Service
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceDetailPage;
