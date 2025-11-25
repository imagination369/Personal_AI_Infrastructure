'use client';

import { useState } from 'react';
import { Contact, useContactsStore } from '@/lib/stores/contacts-store';
import {
  X,
  Mail,
  Phone,
  MessageSquare,
  Building2,
  Briefcase,
  Calendar,
  Clock,
  Edit2,
  Save,
  Tag,
  Activity,
} from 'lucide-react';

interface ContactCardProps {
  contact: Contact;
  onClose: () => void;
}

export default function ContactCard({ contact, onClose }: ContactCardProps) {
  const { updateContact } = useContactsStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContact, setEditedContact] = useState(contact);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getStatusColor = (status: Contact['status']) => {
    const colors = {
      active: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      inactive: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
      lead: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      customer: 'bg-green-500/10 text-green-400 border-green-500/20',
      partner: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    };
    return colors[status] || colors.active;
  };

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call':
        return <Phone className="w-4 h-4" />;
      case 'email':
        return <Mail className="w-4 h-4" />;
      case 'meeting':
        return <Calendar className="w-4 h-4" />;
      case 'sms':
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    const colors = {
      call: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      email: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      meeting: 'bg-green-500/10 text-green-400 border-green-500/20',
      sms: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      note: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    };
    return colors[type] || colors.note;
  };

  const handleSave = () => {
    updateContact(contact.id, editedContact);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedContact(contact);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-gray-800 px-6 py-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                {getInitials(contact.firstName, contact.lastName)}
              </div>
              <div>
                {isEditing ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editedContact.firstName}
                      onChange={(e) =>
                        setEditedContact({ ...editedContact, firstName: e.target.value })
                      }
                      className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="First name"
                    />
                    <input
                      type="text"
                      value={editedContact.lastName}
                      onChange={(e) =>
                        setEditedContact({ ...editedContact, lastName: e.target.value })
                      }
                      className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Last name"
                    />
                  </div>
                ) : (
                  <h2 className="text-2xl font-bold text-white">
                    {contact.firstName} {contact.lastName}
                  </h2>
                )}
                {contact.position && (
                  <p className="text-sm text-gray-400 mt-1 flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    {contact.position}
                    {contact.company && ` at ${contact.company}`}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSave}
                    className="p-2 hover:bg-green-500/10 text-green-400 rounded-lg transition-colors"
                    title="Save"
                  >
                    <Save className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleCancel}
                    className="p-2 hover:bg-gray-800 text-gray-400 rounded-lg transition-colors"
                    title="Cancel"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 hover:bg-gray-800 text-gray-400 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-800 text-gray-400 rounded-lg transition-colors"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Contact Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Quick Actions */}
              <div className="flex gap-2">
                <a
                  href={`tel:${contact.phone}`}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg transition-colors font-medium"
                >
                  <Phone className="w-4 h-4" />
                  Call
                </a>
                <a
                  href={`mailto:${contact.email}`}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded-lg transition-colors font-medium"
                >
                  <Mail className="w-4 h-4" />
                  Email
                </a>
                <a
                  href={`sms:${contact.phone}`}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-lg transition-colors font-medium"
                >
                  <MessageSquare className="w-4 h-4" />
                  SMS
                </a>
              </div>

              {/* Contact Details */}
              <div className="bg-gray-800/50 border border-gray-800 rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                  Contact Information
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-500" />
                    {isEditing ? (
                      <input
                        type="email"
                        value={editedContact.email}
                        onChange={(e) =>
                          setEditedContact({ ...editedContact, email: e.target.value })
                        }
                        className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <span className="text-gray-200">{contact.email}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-gray-500" />
                    {isEditing ? (
                      <input
                        type="tel"
                        value={editedContact.phone}
                        onChange={(e) =>
                          setEditedContact({ ...editedContact, phone: e.target.value })
                        }
                        className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <span className="text-gray-200">{contact.phone}</span>
                    )}
                  </div>
                  {contact.company && (
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-gray-500" />
                      <span className="text-gray-200">{contact.company}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {(contact.notes || isEditing) && (
                <div className="bg-gray-800/50 border border-gray-800 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    Notes
                  </h3>
                  {isEditing ? (
                    <textarea
                      value={editedContact.notes || ''}
                      onChange={(e) =>
                        setEditedContact({ ...editedContact, notes: e.target.value })
                      }
                      rows={4}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="Add notes about this contact..."
                    />
                  ) : (
                    <p className="text-gray-300 text-sm leading-relaxed">{contact.notes}</p>
                  )}
                </div>
              )}

              {/* Activity Timeline */}
              <div className="bg-gray-800/50 border border-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Activity Timeline
                </h3>
                {contact.activities && contact.activities.length > 0 ? (
                  <div className="space-y-4">
                    {contact.activities.map((activity) => (
                      <div key={activity.id} className="flex gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center border ${getActivityColor(
                            activity.type
                          )}`}
                        >
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-gray-200">{activity.title}</h4>
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDateTime(activity.timestamp)}
                            </span>
                          </div>
                          {activity.description && (
                            <p className="text-sm text-gray-400 mt-1">{activity.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No activity recorded yet</p>
                )}
              </div>
            </div>

            {/* Right Column - Metadata */}
            <div className="space-y-6">
              {/* Status */}
              <div className="bg-gray-800/50 border border-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Status
                </h3>
                {isEditing ? (
                  <select
                    value={editedContact.status}
                    onChange={(e) =>
                      setEditedContact({
                        ...editedContact,
                        status: e.target.value as Contact['status'],
                      })
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="lead">Lead</option>
                    <option value="customer">Customer</option>
                    <option value="partner">Partner</option>
                  </select>
                ) : (
                  <span
                    className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium border ${getStatusColor(
                      contact.status
                    )}`}
                  >
                    {contact.status.charAt(0).toUpperCase() + contact.status.slice(1)}
                  </span>
                )}
              </div>

              {/* Tags */}
              <div className="bg-gray-800/50 border border-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {contact.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-800 text-gray-300 border border-gray-700"
                    >
                      {tag}
                    </span>
                  ))}
                  {contact.tags.length === 0 && (
                    <span className="text-sm text-gray-500">No tags</span>
                  )}
                </div>
              </div>

              {/* Dates */}
              <div className="bg-gray-800/50 border border-gray-800 rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                  Important Dates
                </h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-500">Last Contact</p>
                    <p className="text-sm text-gray-200 mt-1">
                      {contact.lastContact
                        ? formatDateTime(contact.lastContact)
                        : 'Never'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Created</p>
                    <p className="text-sm text-gray-200 mt-1">
                      {formatDateTime(contact.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
