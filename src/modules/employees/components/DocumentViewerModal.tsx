import React from 'react';
import { FileText, Download, X, FileImage, FileSpreadsheet, File, CheckCircle } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';

interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'spreadsheet' | 'other';
  size: string;
  uploadedAt: string;
  status: 'verified' | 'pending' | 'rejected';
}

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeName: string;
}

const mockDocuments: Document[] = [
  { id: 'doc_1', name: 'Contract Agreement.pdf', type: 'pdf', size: '2.4 MB', uploadedAt: '2026-03-15', status: 'verified' },
  { id: 'doc_2', name: 'ID Proof.jpg', type: 'image', size: '1.2 MB', uploadedAt: '2026-03-15', status: 'verified' },
  { id: 'doc_3', name: 'Resume.pdf', type: 'pdf', size: '850 KB', uploadedAt: '2026-03-10', status: 'verified' },
  { id: 'doc_4', name: 'Certification.xlsx', type: 'spreadsheet', size: '156 KB', uploadedAt: '2026-03-20', status: 'pending' },
];

const getDocumentIcon = (type: string) => {
  switch (type) {
    case 'pdf':
      return <FileText className="h-8 w-8 text-red-500" />;
    case 'image':
      return <FileImage className="h-8 w-8 text-purple-500" />;
    case 'spreadsheet':
      return <FileSpreadsheet className="h-8 w-8 text-green-500" />;
    default:
      return <File className="h-8 w-8 text-slate-500" />;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'verified':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
          <CheckCircle className="h-3 w-3" />
          Verified
        </span>
      );
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
          Pending Review
        </span>
      );
    case 'rejected':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
          Rejected
        </span>
      );
    default:
      return null;
  }
};

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  isOpen,
  onClose,
  employeeName,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Documents - ${employeeName}`} size="lg">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">
            <span className="font-semibold text-navy-900">{mockDocuments.length}</span> documents total
          </div>
          <button className="flex items-center gap-2 rounded-lg border border-navy-200 px-4 py-2 text-sm font-medium text-navy-700 hover:bg-navy-50">
            <Download className="h-4 w-4" />
            Download All
          </button>
        </div>

        <div className="grid gap-3">
          {mockDocuments.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-navy-200 hover:shadow-sm"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50">
                {getDocumentIcon(doc.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-navy-900 truncate">{doc.name}</h4>
                  {getStatusBadge(doc.status)}
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <span>{doc.size}</span>
                  <span>•</span>
                  <span>Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                </div>
              </div>
              <button className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-navy-600 hover:bg-navy-50">
                <Download className="h-4 w-4" />
                Download
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
