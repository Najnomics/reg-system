import { useState, useEffect } from 'react';
import { useApp } from '../../contexts/SimpleAppContext';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/apiService';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  DocumentArrowUpIcon,
  DocumentArrowDownIcon,
  PencilIcon,
  TrashIcon,
  EnvelopeIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';

const CompleteMembersPage = () => {
  const { members, setMembers, fetchMembers, loading, showSuccess, showError } = useApp();
  const { logout, userType } = useAuth();
  const isAdmin = userType === 'admin';
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    // Only fetch if members array is empty to avoid duplicate calls
    if (members.length === 0 && !loading) {
      fetchMembers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredMembers(members);
    } else {
      const filtered = members.filter(member =>
        (member.name && member.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (member.phone && member.phone.includes(searchTerm)) ||
        (member.pin && member.pin.includes(searchTerm))
      );
      setFilteredMembers(filtered);
    }
  }, [searchTerm, members]);

  const handleAddMember = async (memberData) => {
    try {
      // Transform frontend data format to match backend API
      const apiData = {
        name: `${memberData.firstName} ${memberData.lastName}`,
        email: memberData.email,
        phone: memberData.phone || null
      };
      
      const response = await apiService.createMember(apiData);
      const newMember = response?.data?.member || response?.member || response;
      
      // Update local state
      setMembers(prev => [...prev, newMember]);
      
      showSuccess(`Member ${memberData.firstName} ${memberData.lastName} added successfully!`);
      setShowAddModal(false);
      setSelectedMember(null);
      fetchMembers(); // Refresh the list
    } catch (error) {
      console.error('Failed to create member:', error);
      showError('Failed to create member. Please try again.');
    }
  };

  const handleEditMember = (member) => {
    setSelectedMember(member);
    setShowAddModal(true);
  };

  const handleDeleteMember = async (memberId) => {
    if (confirm('Are you sure you want to delete this member?')) {
      try {
        console.log('Deleting member with ID:', memberId);
        await apiService.deleteMember(memberId);
        
        // Update local state by removing the member immediately
        setMembers(prev => prev.filter(m => m.id !== memberId));
        
        showSuccess('Member deleted successfully!');
        // Refresh the list to ensure consistency
        fetchMembers(); 
      } catch (error) {
        console.error('Failed to delete member:', error);
        showError('Failed to delete member. Please try again.');
      }
    }
  };

  const handleResendPIN = async (member) => {
    try {
      console.log(`Resending PIN to ${member.email}...`);
      const response = await apiService.resendPin(member.id);
      console.log('Resend PIN response:', response);
      showSuccess(`PIN email sent successfully to ${member.email}`);
    } catch (error) {
      console.error('Failed to resend PIN:', error);
      const errorMessage = error.message || error.response?.data?.message || 'Failed to resend PIN. Please check email configuration.';
      showError(errorMessage);
    }
  };

  const handleBulkResendPIN = async () => {
    if (selectedMembers.size === 0) {
      showError('Please select at least one member to resend PIN');
      return;
    }

    const count = selectedMembers.size;
    const confirmMessage = `Are you sure you want to resend PIN emails to ${count} member(s)?`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const memberIds = Array.from(selectedMembers);
      const response = await apiService.bulkResendPin(memberIds);
      
      const successful = response.data?.successful || 0;
      const failed = response.data?.failed || 0;
      
      if (failed === 0) {
        showSuccess(`PIN emails sent successfully to ${successful} member(s)`);
      } else {
        showError(`PIN emails sent to ${successful} member(s), but ${failed} failed. Check console for details.`);
        console.error('Failed PIN sends:', response.data?.results?.failed);
      }
      
      setSelectedMembers(new Set());
      setSelectAll(false);
    } catch (error) {
      console.error('Failed to bulk resend PINs:', error);
      showError(error.message || 'Failed to resend PINs. Please try again.');
    }
  };

  const handleResendPINToAll = async () => {
    const confirmMessage = `Are you sure you want to resend PIN emails to ALL active members? This may take a while.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await apiService.resendPinToAll();
      
      const successful = response.data?.successful || 0;
      const failed = response.data?.failed || 0;
      const total = response.data?.totalMembers || 0;
      
      if (failed === 0) {
        showSuccess(`PIN emails sent successfully to all ${successful} active member(s)`);
      } else {
        showError(`PIN emails sent to ${successful} out of ${total} member(s). ${failed} failed. Check console for details.`);
        console.error('Failed PIN sends:', response.data?.results?.failed);
      }
    } catch (error) {
      console.error('Failed to resend PINs to all:', error);
      showError(error.message || 'Failed to resend PINs. Please try again.');
    }
  };

  const handleSelectMember = (memberId) => {
    setSelectedMembers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(memberId)) {
        newSet.delete(memberId);
      } else {
        newSet.add(memberId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedMembers(new Set());
      setSelectAll(false);
    } else {
      const allIds = new Set(filteredMembers.map(m => m.id));
      setSelectedMembers(allIds);
      setSelectAll(true);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedMembers.size === 0) {
      showError('Please select at least one member to delete');
      return;
    }

    const count = selectedMembers.size;
    const confirmMessage = `Are you sure you want to delete ${count} member(s)? This action cannot be undone.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const memberIds = Array.from(selectedMembers);
      await apiService.bulkDeleteMembers(memberIds);
      
      // Update local state by removing deleted members
      setMembers(prev => prev.filter(m => !selectedMembers.has(m.id)));
      setSelectedMembers(new Set());
      setSelectAll(false);
      
      showSuccess(`Successfully deleted ${count} member(s)`);
      fetchMembers(); // Refresh the list
    } catch (error) {
      console.error('Failed to bulk delete members:', error);
      showError(error.message || 'Failed to delete members. Please try again.');
    }
  };

  // Update selectAll state when selectedMembers changes
  useEffect(() => {
    if (filteredMembers.length > 0) {
      const allSelected = filteredMembers.every(m => selectedMembers.has(m.id));
      setSelectAll(allSelected);
    } else {
      setSelectAll(false);
    }
  }, [selectedMembers, filteredMembers]);

  const handleBulkUpload = (file) => {
    // Mock implementation
    showSuccess(`Uploaded ${file.name} successfully! Processing members...`);
    setShowUploadModal(false);
  };

  const exportMembers = () => {
    // Mock implementation
    showSuccess('Members exported to Excel successfully!');
  };

  const handleLogout = () => {
    logout();
    showSuccess('Logged out successfully');
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Members</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Manage church members and their information</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportMembers}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 touch-manipulation"
          >
            <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Export</span>
          </button>
          {isAdmin && (
            <>
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 touch-manipulation"
              >
                <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Bulk Upload</span>
                <span className="sm:hidden">Upload</span>
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-3 sm:px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 touch-manipulation"
              >
                <PlusIcon className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Add Member</span>
                <span className="sm:hidden">Add</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2.5 sm:py-2 border border-gray-300 rounded-md text-sm bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Search by name, email, phone, or PIN..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Members Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-1.5 sm:p-2 bg-blue-100 rounded-md flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-2 sm:ml-3 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900">{members.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-1.5 sm:p-2 bg-green-100 rounded-md flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-2 sm:ml-3 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Active</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900">{members.filter(m => m.isActive !== false).length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-1.5 sm:p-2 bg-yellow-100 rounded-md flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-2 sm:ml-3 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Recent</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900">12</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-1.5 sm:p-2 bg-purple-100 rounded-md flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="ml-2 sm:ml-3 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Avg Rate</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900">78%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {isAdmin && selectedMembers.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm font-medium text-blue-900">
              {selectedMembers.size} member{selectedMembers.size !== 1 ? 's' : ''} selected
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleBulkResendPIN}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 touch-manipulation"
              >
                <EnvelopeIcon className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">Resend PIN</span>
                <span className="sm:hidden">Resend</span>
              </button>
              <button
                onClick={handleBulkDelete}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 touch-manipulation"
              >
                <TrashIcon className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">Delete Selected</span>
                <span className="sm:hidden">Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Actions */}
      {isAdmin && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleResendPINToAll}
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 touch-manipulation"
          >
            <PaperAirplaneIcon className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Resend PIN to All</span>
            <span className="sm:hidden">Resend All</span>
          </button>
        </div>
      )}

      {/* Members List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-4 sm:px-6 sm:py-5">
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4">
            Members ({filteredMembers.length})
          </h3>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-500">Loading members...</p>
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">
                    <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-gray-900">No members found</h3>
                  <p className="text-sm text-gray-500">
                    {isAdmin ? 'Get started by adding your first member.' : 'No members available yet.'}
                  </p>
                  {isAdmin && (
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add Member
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-3">
                    {isAdmin && (
                      <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
                        <label className="flex items-center text-sm font-medium text-gray-700">
                          <input
                            type="checkbox"
                            checked={selectAll}
                            onChange={handleSelectAll}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-2"
                          />
                          Select All
                        </label>
                      </div>
                    )}
                    {filteredMembers.map((member) => (
                      <div
                        key={member.id}
                        className={`border rounded-lg p-4 ${selectedMembers.has(member.id) ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1 min-w-0">
                            {isAdmin && (
                              <input
                                type="checkbox"
                                checked={selectedMembers.has(member.id)}
                                onChange={() => handleSelectMember(member.id)}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mt-1 flex-shrink-0"
                              />
                            )}
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                <span className="text-sm font-medium text-indigo-600">
                                  {member.name?.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                </span>
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-medium text-gray-900 truncate">
                                    {member.name}
                                  </div>
                                  <div className="text-xs text-gray-500 truncate mt-0.5">
                                    {member.email}
                                  </div>
                                </div>
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ml-2 flex-shrink-0 ${
                                  member.isActive !== false 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {member.isActive !== false ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                              <div className="mt-2 space-y-1">
                                <div className="text-xs text-gray-600">
                                  <span className="font-medium">Phone:</span> {member.phone || 'N/A'}
                                </div>
                                <div className="text-xs text-gray-600">
                                  <span className="font-medium">PIN:</span>{' '}
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    {member.pin || '12345'}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-600">
                                  <span className="font-medium">Joined:</span> {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : 'N/A'}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-start space-x-2 ml-2 flex-shrink-0">
                            <button
                              onClick={() => handleResendPIN(member)}
                              className="p-1.5 text-green-600 hover:text-green-900 hover:bg-green-50 rounded touch-manipulation"
                              title="Resend PIN"
                            >
                              <EnvelopeIcon className="h-5 w-5" />
                            </button>
                            {isAdmin && (
                              <>
                                <button
                                  onClick={() => handleEditMember(member)}
                                  className="p-1.5 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded touch-manipulation"
                                  title="Edit Member"
                                >
                                  <PencilIcon className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteMember(member.id)}
                                  className="p-1.5 text-red-600 hover:text-red-900 hover:bg-red-50 rounded touch-manipulation"
                                  title="Delete Member"
                                >
                                  <TrashIcon className="h-5 w-5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {isAdmin && (
                            <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                              <input
                                type="checkbox"
                                checked={selectAll}
                                onChange={handleSelectAll}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                              />
                            </th>
                          )}
                          <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Member
                          </th>
                          <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Contact
                          </th>
                          <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            PIN
                          </th>
                          <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Joined
                          </th>
                          <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredMembers.map((member) => (
                          <tr key={member.id} className={`hover:bg-gray-50 ${selectedMembers.has(member.id) ? 'bg-blue-50' : ''}`}>
                            {isAdmin && (
                              <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  checked={selectedMembers.has(member.id)}
                                  onChange={() => handleSelectMember(member.id)}
                                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />
                              </td>
                            )}
                            <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                    <span className="text-sm font-medium text-indigo-600">
                                      {member.name?.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                    </span>
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {member.name}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    ID: {member.id.substring(0, 8)}...
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{member.email}</div>
                              <div className="text-sm text-gray-500">{member.phone || 'No phone'}</div>
                            </td>
                            <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {member.pin || '12345'}
                              </span>
                            </td>
                            <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                member.isActive !== false 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {member.isActive !== false ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                              <button
                                onClick={() => handleResendPIN(member)}
                                className="text-green-600 hover:text-green-900 inline-flex items-center touch-manipulation"
                                title="Resend PIN"
                              >
                                <EnvelopeIcon className="h-4 w-4" />
                              </button>
                              {isAdmin && (
                                <>
                                  <button
                                    onClick={() => handleEditMember(member)}
                                    className="text-indigo-600 hover:text-indigo-900 inline-flex items-center touch-manipulation"
                                    title="Edit Member"
                                  >
                                    <PencilIcon className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteMember(member.id)}
                                    className="text-red-600 hover:text-red-900 inline-flex items-center touch-manipulation"
                                    title="Delete Member"
                                  >
                                    <TrashIcon className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
        </div>
      </div>

      {/* Add/Edit Member Modal */}
      {showAddModal && (
        <AddMemberModal
          member={selectedMember}
          onSave={handleAddMember}
          onCancel={() => {
            setShowAddModal(false);
            setSelectedMember(null);
          }}
        />
      )}

      {/* Bulk Upload Modal */}
      {showUploadModal && (
        <BulkUploadModal
          onUpload={handleBulkUpload}
          onCancel={() => setShowUploadModal(false)}
        />
      )}
    </div>
  );
};

// Add Member Modal Component
const AddMemberModal = ({ member, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    firstName: member?.firstName || '',
    lastName: member?.lastName || '',
    email: member?.email || '',
    phone: member?.phone || '',
    dateOfBirth: member?.dateOfBirth || '',
    address: member?.address || '',
    emergencyContact: member?.emergencyContact || '',
    emergencyPhone: member?.emergencyPhone || '',
  });

  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Basic validation
    const newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave(formData);
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    // Clear error when user starts typing
    if (errors[e.target.name]) {
      setErrors(prev => ({
        ...prev,
        [e.target.name]: ''
      }));
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {member ? 'Edit Member' : 'Add New Member'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">First Name</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className={`mt-1 block w-full border rounded-md px-3 py-2 ${
                  errors.firstName ? 'border-red-500' : 'border-gray-300'
                } focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
              />
              {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Last Name</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className={`mt-1 block w-full border rounded-md px-3 py-2 ${
                  errors.lastName ? 'border-red-500' : 'border-gray-300'
                } focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
              />
              {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`mt-1 block w-full border rounded-md px-3 py-2 ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              } focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
            <input
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              {member ? 'Update' : 'Add'} Member
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Bulk Upload Modal Component
const BulkUploadModal = ({ onUpload, onCancel }) => {
  const { showSuccess, showError } = useApp();
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv'))) {
      setSelectedFile(file);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      onUpload(selectedFile);
    }
  };

  const downloadTemplate = async (format = 'xlsx') => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/members/template?format=${format}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Template download failed:', response.status, errorText);
        showError(`Failed to download template: ${response.statusText}`);
        return;
      }
      
      // Check if response has content
      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');
      
      console.log('Template download response:', {
        contentType,
        contentLength,
        status: response.status
      });
      
      const blob = await response.blob();
      
      // Verify blob is not empty
      if (blob.size === 0) {
        showError('Downloaded template file is empty. Please try again.');
        return;
      }
      
      console.log('Template blob size:', blob.size, 'bytes');
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `members_template.${format}`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      
      // Clean up after a short delay
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
      
      showSuccess(`Template downloaded successfully (${Math.round(blob.size / 1024)}KB)`);
    } catch (err) {
      console.error('Template download error:', err);
      showError(err.message || 'Failed to download template. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Bulk Upload Members</h3>
        
        <div className="mb-4">
          <div className="flex gap-3">
            <button
              onClick={() => downloadTemplate('xlsx')}
              className="text-indigo-600 hover:text-indigo-800 text-sm underline"
            >
              Download Excel Template
            </button>
            <span className="text-gray-400">|</span>
            <button
              onClick={() => downloadTemplate('csv')}
              className="text-indigo-600 hover:text-indigo-800 text-sm underline"
            >
              Download CSV Template
            </button>
          </div>
        </div>

        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center ${
            dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {selectedFile ? (
            <div>
              <p className="text-sm text-gray-600">Selected file:</p>
              <p className="font-medium text-gray-900">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          ) : (
            <div>
              <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                Drop your Excel file here, or{' '}
                <label className="text-indigo-600 hover:text-indigo-800 cursor-pointer underline">
                  browse
                  <input
                    type="file"
                    className="hidden"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                  />
                </label>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Supports .xlsx, .xls, .csv files
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile}
            className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Upload Members
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompleteMembersPage;