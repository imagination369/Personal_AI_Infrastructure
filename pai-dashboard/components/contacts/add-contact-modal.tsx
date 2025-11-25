'use client';

import { useState } from 'react';
import { ContactStatus, useContactsStore } from '@/lib/stores/contacts-store';
import { X, Plus, Tag as TagIcon, User, Mail, Phone, Building2, Briefcase } from 'lucide-react';

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AVAILABLE_TAGS = [
  'VIP',
  'Enterprise',
  'Startup',
  'Hot Lead',
  'Agency',
  'Marketing',
  'Partner',
  'Strategic',
  'Long-term',
  'Churned',
  'Finance',
  'Qualified',
  'Retail',
  'Mid-market',
];

export default function AddContactModal({ isOpen, onClose }: AddContactModalProps) {
  const { addContact } = useContactsStore();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    status: 'lead' as ContactStatus,
    tags: [] as string[],
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customTag, setCustomTag] = useState('');

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    addContact({
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      company: formData.company.trim() || undefined,
      position: formData.position.trim() || undefined,
      status: formData.status,
      tags: formData.tags,
      notes: formData.notes.trim() || undefined,
      lastContact: new Date(),
    });

    handleClose();
  };

  const handleClose = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      company: '',
      position: '',
      status: 'lead',
      tags: [],
      notes: '',
    });
    setErrors({});
    setCustomTag('');
    onClose();
  };

  const toggleTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const addCustomTag = () => {
    if (customTag.trim() && !formData.tags.includes(customTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, customTag.trim()],
      }));
      setCustomTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-gray-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Add New Contact</h2>
                <p className="text-sm text-gray-400">Create a new contact in your CRM</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-800 text-gray-400 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4" />
                Personal Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    First Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => {
                      setFormData({ ...formData, firstName: e.target.value });
                      if (errors.firstName) {
                        setErrors({ ...errors, firstName: '' });
                      }
                    }}
                    className={`w-full bg-gray-800 border ${
                      errors.firstName ? 'border-red-500' : 'border-gray-700'
                    } rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors`}
                    placeholder="John"
                  />
                  {errors.firstName && (
                    <p className="text-xs text-red-400 mt-1">{errors.firstName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Last Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => {
                      setFormData({ ...formData, lastName: e.target.value });
                      if (errors.lastName) {
                        setErrors({ ...errors, lastName: '' });
                      }
                    }}
                    className={`w-full bg-gray-800 border ${
                      errors.lastName ? 'border-red-500' : 'border-gray-700'
                    } rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors`}
                    placeholder="Doe"
                  />
                  {errors.lastName && (
                    <p className="text-xs text-red-400 mt-1">{errors.lastName}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Contact Information
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (errors.email) {
                      setErrors({ ...errors, email: '' });
                    }
                  }}
                  className={`w-full bg-gray-800 border ${
                    errors.email ? 'border-red-500' : 'border-gray-700'
                  } rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors`}
                  placeholder="john.doe@example.com"
                />
                {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Phone <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData({ ...formData, phone: e.target.value });
                    if (errors.phone) {
                      setErrors({ ...errors, phone: '' });
                    }
                  }}
                  className={`w-full bg-gray-800 border ${
                    errors.phone ? 'border-red-500' : 'border-gray-700'
                  } rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors`}
                  placeholder="+1 (555) 123-4567"
                />
                {errors.phone && <p className="text-xs text-red-400 mt-1">{errors.phone}</p>}
              </div>
            </div>

            {/* Company Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Company Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Company</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    placeholder="Acme Inc"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Position</label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    placeholder="CEO"
                  />
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Status
              </h3>

              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as ContactStatus })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                <option value="lead">Lead</option>
                <option value="active">Active</option>
                <option value="customer">Customer</option>
                <option value="partner">Partner</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Tags */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <TagIcon className="w-4 h-4" />
                Tags
              </h3>

              {/* Selected Tags */}
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-gray-800/50 border border-gray-800 rounded-lg">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:text-blue-300 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Available Tags */}
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_TAGS.filter((tag) => !formData.tags.includes(tag)).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className="px-3 py-1 rounded-md text-sm font-medium bg-gray-800 text-gray-300 border border-gray-700 hover:border-blue-500/50 hover:bg-blue-500/5 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* Custom Tag Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomTag();
                    }
                  }}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  placeholder="Add custom tag..."
                />
                <button
                  type="button"
                  onClick={addCustomTag}
                  className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg transition-colors font-medium"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Notes</h3>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors resize-none"
                placeholder="Add any additional notes about this contact..."
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="border-t border-gray-800 px-6 py-4 flex items-center justify-end gap-3 bg-gray-800/50">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-gray-400 hover:bg-gray-800 rounded-lg transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-lg transition-colors font-medium shadow-lg shadow-blue-500/20"
          >
            Create Contact
          </button>
        </div>
      </div>
    </div>
  );
}
