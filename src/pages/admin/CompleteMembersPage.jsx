import { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../../contexts/SimpleAppContext';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/apiService';
import { debounce } from '../../utils/debounce';
import { TableRowSkeleton } from '../../components/common/SkeletonLoader';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  DocumentArrowUpIcon,
  DocumentArrowDownIcon,
  PencilIcon,
  TrashIcon,
  EnvelopeIcon,
  PaperAirplaneIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

const CompleteMembersPage = () => {
  const { showSuccess, showError } = useApp();
  const { logout, userType } = useAuth();
  const isAdmin = userType === 'admin';
  const [searchTerm, setSearchTerm] = useState('');
  const [chapelRoleFilter, setChapelRoleFilter] = useState('all');
  const [chapelFilter, setChapelFilter] = useState('all');
  const [chapels, setChapels] = useState([]);
  const [loadingChapels, setLoadingChapels] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [members, setMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [sortBy, setSortBy] = useState('name'); // 'name' or 'createdAt'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'
  const [currentPage, setCurrentPage] = useState(1);
  const [totalMembers, setTotalMembers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const membersPerPage = 20;
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteType, setDeleteType] = useState(null); // 'single' or 'bulk'
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleMember, setRoleMember] = useState(null);
  const [roleSelection, setRoleSelection] = useState('worker');
  const [roleSaving, setRoleSaving] = useState(false);
  const [chapelModalOpen, setChapelModalOpen] = useState(false);
  const [chapelMember, setChapelMember] = useState(null);
  const [chapelSelection, setChapelSelection] = useState('unassigned');
  const [chapelRoleSelection, setChapelRoleSelection] = useState('member');
  const [chapelSaving, setChapelSaving] = useState(false);

  const formatChapelRole = (role) => {
    if (role === 'INVITEE') return 'Invitee';
    if (role === 'WORKER') return 'Worker';
    return 'Member';
  };

  const getMemberRoleLabel = (member) =>
    member?.chapelRole ? formatChapelRole(member.chapelRole) : 'Not assigned';

  const getMemberChariotLabel = (member) => {
    const labels = [];
    (member?.chariotLeader || []).forEach((chariot) => {
      labels.push(`${chariot.name} (Leader)`);
    });
    (member?.chariotAssistants || []).forEach((assistant) => {
      if (assistant?.chariot?.name) {
        labels.push(`${assistant.chariot.name} (Assistant)`);
      }
    });
    (member?.chariotMembers || []).forEach((chariotMember) => {
      if (chariotMember?.chariot?.name) {
        labels.push(chariotMember.chariot.name);
      }
    });
    return labels.length > 0 ? labels.join(', ') : 'Not assigned';
  };

  // Fetch members with pagination - memoized
  const fetchMembers = useCallback(async (page = currentPage, forceRefresh = false) => {
    try {
      setLoading(true);
      const chapelRoleParam = chapelRoleFilter === 'invitee'
        ? 'INVITEE'
        : chapelRoleFilter === 'member'
          ? 'MEMBER'
          : chapelRoleFilter === 'worker'
            ? 'WORKER'
            : chapelRoleFilter === 'unassigned'
              ? 'UNASSIGNED'
              : undefined;
      const chapelFilterParam = chapelFilter === 'all'
        ? undefined
        : chapelFilter === 'unassigned'
          ? 'UNASSIGNED'
          : chapelFilter;

      const response = await apiService.getMembers({
        page,
        limit: membersPerPage,
        sortBy: sortBy === 'date' ? 'createdAt' : 'name',
        sortOrder,
        query: searchTerm.trim() || undefined,
        chapelRole: chapelRoleParam,
        chapelId: chapelFilterParam,
        forceRefresh,
      });
      
      if (response?.success && response?.data) {
        const membersData = response.data.members || [];
        setMembers(membersData);
        setTotalMembers(response.data.pagination?.total || 0);
        setTotalPages(response.data.pagination?.pages || 1);
        setCurrentPage(response.data.pagination?.page || page);
      }
    } catch (error) {
      console.error('Failed to fetch members:', error);
      showError('Failed to load members');
    } finally {
      setLoading(false);
    }
  }, [currentPage, sortBy, sortOrder, searchTerm, chapelRoleFilter, chapelFilter, membersPerPage, showError]);

  const fetchChapels = useCallback(async () => {
    try {
      setLoadingChapels(true);
      const response = await apiService.getChapels(true);
      const chapelList = response?.data?.chapels || [];
      setChapels(Array.isArray(chapelList) ? chapelList : []);
    } catch (error) {
      console.error('Failed to fetch chapels:', error);
      showError('Failed to load chapels');
    } finally {
      setLoadingChapels(false);
    }
  }, [showError]);

  useEffect(() => {
    // Fetch members on mount - show cached data immediately if available
    fetchMembers(1, false); // Use cache first for instant display
    fetchChapels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search handler
  const debouncedSearch = useMemo(
    () => debounce((term) => {
      if (term.trim() || !term) {
        fetchMembers(1, true); // Reset to page 1, force refresh
      }
    }, 500),
    [fetchMembers]
  );

  // Refetch when search, sort changes
  useEffect(() => {
    if (searchTerm.trim()) {
      debouncedSearch(searchTerm);
    } else {
      fetchMembers(1, true);
    }
  }, [searchTerm, sortBy, sortOrder, chapelRoleFilter, chapelFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle page change
  useEffect(() => {
    fetchMembers(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Use members directly (already filtered and sorted by backend)
  const filteredMembers = members;

  const [isSubmittingMember, setIsSubmittingMember] = useState(false);

  const handleAddMember = async (memberData) => {
    // Prevent double submission
    if (isSubmittingMember) {
      return;
    }

    setIsSubmittingMember(true);
    try {
      // Transform frontend data format to match backend API
      const apiData = {
        name: `${memberData.firstName} ${memberData.lastName}`,
        email: memberData.email
      };
      
      const response = await apiService.createMember(apiData);
      const newMember = response?.data?.member || response?.member || response;
      
      // Update local state
      setMembers(prev => [...prev, newMember]);
      
      // Show success message
      showSuccess(`Member ${memberData.firstName} ${memberData.lastName} added successfully! You can send the PIN email manually using the "Resend PIN" button.`);
      
      // Close modal and reset
      setShowAddModal(false);
      setSelectedMember(null);
      
      // Refresh the list to get latest data (stay on current page)
      await fetchMembers(currentPage);
    } catch (error) {
      console.error('Failed to create member:', error);
      
      // Handle specific error cases
      const errorMessage = error.message || '';
      if (errorMessage.includes('Name already exists') || errorMessage.includes('name already exists')) {
        showError('A user with this name already exists');
      } else if (errorMessage.includes('Email already exists')) {
        showError(`A member with email ${memberData.email} already exists. Please use a different email address.`);
      } else {
        showError(errorMessage || 'Failed to create member. Please try again.');
      }
    } finally {
      setIsSubmittingMember(false);
    }
  };

  const handleEditMember = (member) => {
    setSelectedMember(member);
    setShowAddModal(true);
  };

  const openRoleModal = (member) => {
    setRoleMember(member);
    setRoleSelection(member?.chapelRole ? member.chapelRole.toLowerCase() : 'unassigned');
    setRoleModalOpen(true);
  };

  const closeRoleModal = () => {
    setRoleModalOpen(false);
    setRoleMember(null);
    setRoleSelection('worker');
  };

  const handleRoleUpdate = async () => {
    if (!roleMember) return;
    setRoleSaving(true);
    try {
      const response = await apiService.updateMember(roleMember.id, {
        chapelRole: roleSelection,
      });
      const updatedMember = response?.data?.member || response?.member || response;
      setMembers((prev) => prev.map((m) => (m.id === roleMember.id ? updatedMember : m)));
      showSuccess(`Role updated to ${roleSelection}`);
      closeRoleModal();
    } catch (error) {
      console.error('Failed to update role:', error);
      showError(error.message || 'Failed to update role');
    } finally {
      setRoleSaving(false);
    }
  };

  const openChapelModal = (member) => {
    setChapelMember(member);
    setChapelSelection(member?.chapel?.id || 'unassigned');
    setChapelRoleSelection(member?.chapelRole ? member.chapelRole.toLowerCase() : 'member');
    setChapelModalOpen(true);
  };

  const closeChapelModal = () => {
    setChapelModalOpen(false);
    setChapelMember(null);
    setChapelSelection('unassigned');
    setChapelRoleSelection('member');
  };

  const handleChapelUpdate = async () => {
    if (!chapelMember) return;
    setChapelSaving(true);
    try {
      const payload = {
        chapelId: chapelSelection === 'unassigned' ? 'UNASSIGNED' : chapelSelection,
        chapelRole: chapelSelection === 'unassigned' ? 'unassigned' : chapelRoleSelection,
      };
      const response = await apiService.updateMember(chapelMember.id, payload);
      const updatedMember = response?.data?.member || response?.member || response;
      setMembers((prev) => prev.map((m) => (m.id === chapelMember.id ? updatedMember : m)));
      showSuccess('Chapel updated successfully');
      closeChapelModal();
    } catch (error) {
      console.error('Failed to update chapel:', error);
      showError(error.message || 'Failed to update chapel');
    } finally {
      setChapelSaving(false);
    }
  };

  const handleDeleteMember = (memberId) => {
    const member = members.find(m => m.id === memberId);
    setMemberToDelete(member);
    setDeleteType('single');
    setDeleteModalOpen(true);
    setDeleteConfirmText('');
  };

  const confirmDeleteMember = async () => {
    if (deleteConfirmText.toLowerCase() !== 'delete') {
      showError('Please type "delete" to confirm');
      return;
    }

    try {
      console.log('Deleting member with ID:', memberToDelete.id);
      await apiService.deleteMember(memberToDelete.id);
      
      // Update local state by removing the member immediately
      setMembers(prev => prev.filter(m => m.id !== memberToDelete.id));
      
      showSuccess('Member deleted successfully!');
      // Refresh the list to ensure consistency
      fetchMembers(currentPage);
      
      // Close modal
      setDeleteModalOpen(false);
      setDeleteConfirmText('');
      setMemberToDelete(null);
      setDeleteType(null);
    } catch (error) {
      console.error('Failed to delete member:', error);
      showError('Failed to delete member. Please try again.');
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

  const handleBulkDelete = () => {
    if (selectedMembers.size === 0) {
      showError('Please select at least one member to delete');
      return;
    }

    setDeleteType('bulk');
    setDeleteModalOpen(true);
    setDeleteConfirmText('');
  };

  const confirmBulkDelete = async () => {
    if (deleteConfirmText.toLowerCase() !== 'delete') {
      showError('Please type "delete" to confirm');
      return;
    }

    const count = selectedMembers.size;
    try {
      const memberIds = Array.from(selectedMembers);
      await apiService.bulkDeleteMembers(memberIds);
      
      // Update local state by removing deleted members
      setMembers(prev => prev.filter(m => !selectedMembers.has(m.id)));
      setSelectedMembers(new Set());
      setSelectAll(false);
      
      showSuccess(`Successfully deleted ${count} member(s)`);
      fetchMembers(currentPage); // Refresh the list
      
      // Close modal
      setDeleteModalOpen(false);
      setDeleteConfirmText('');
      setDeleteType(null);
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

  const handleBulkUpload = async (file) => {
    if (!file) {
      showError('Please select a file to upload');
      return;
    }

    // Validate file type
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!validExtensions.includes(fileExtension)) {
      showError('Invalid file type. Please upload an Excel (.xlsx, .xls) or CSV file.');
      return;
    }

    const maxFileSize = 10 * 1024 * 1024;
    if (file.size > maxFileSize) {
      showError('File size must be less than 10MB.');
      return;
    }

    try {
      // Create FormData for multipart/form-data upload
      const formData = new FormData();
      formData.append('file', file);

      // Get auth token
      const token = localStorage.getItem('token');
      if (!token) {
        showError('You are not authenticated. Please log in again.');
        return;
      }

      // Show loading state
      showSuccess(`Uploading ${file.name}...`);

      // Make API call
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      const response = await fetch(`${API_BASE_URL}/members/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Don't set Content-Type header - browser will set it with boundary for FormData
        },
        body: formData
      });

      // Parse response - handle both JSON and text responses
      let result;
      try {
        const responseText = await response.text();
        result = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        showError(`Upload failed: ${response.statusText}. Unable to parse server response.`);
        return;
      }

      if (!response.ok) {
        // Handle error response
        const errorMessage = result.message || result.error || `Upload failed: ${response.statusText}`;
        const errorDetails = Array.isArray(result.details) ? result.details : (Array.isArray(result.errors) ? result.errors : []);
        
        if (errorDetails.length > 0) {
          // Show detailed errors
          const errorSummary = errorDetails.slice(0, 5).map(err => {
            if (typeof err === 'string') return err;
            return `Row ${err.row || '?'}: ${err.error || err.message || err}`;
          }).join('\n');
          showError(`${errorMessage}\n\nFirst few errors:\n${errorSummary}`);
        } else {
          // Show backend error details if available
          const backendError = result.details || result.error || errorMessage;
          showError(`Upload failed: ${backendError}`);
        }
        
        // Log full error for debugging
        console.error('Upload error response:', result);
        return;
      }

      // Handle success response
      const summary = result.summary || {};
      const successful = summary.imported || result.data?.successful || result.successful || 0;
      const totalRows = summary.totalRows || 0;
      const failed = summary.failed || 0;
      
      // Ensure errorData is an object and all error arrays are arrays
      const errorData = result.data?.errors || {};
      const allErrors = Array.isArray(errorData.all) ? errorData.all : (Array.isArray(result.errors) ? result.errors : []);
      const retriedErrors = Array.isArray(errorData.retriedErrors) ? errorData.retriedErrors : [];
      const permanentErrors = Array.isArray(errorData.permanentErrors) ? errorData.permanentErrors : [];
      const transientErrors = Array.isArray(errorData.transientErrors) ? errorData.transientErrors : [];
      const duplicates = Array.isArray(errorData.duplicateInDatabase) ? errorData.duplicateInDatabase : (Array.isArray(errorData.duplicates) ? errorData.duplicates : []);
      const duplicateInFile = Array.isArray(errorData.duplicateInFile) ? errorData.duplicateInFile : [];
      const validationErrors = Array.isArray(errorData.validationErrors) ? errorData.validationErrors : [];
      const invalidEmails = Array.isArray(errorData.invalidEmails) ? errorData.invalidEmails : [];
      
      const successfulWithRetries = Array.isArray(result.data?.successfulWithRetries) ? result.data.successfulWithRetries : [];
      
      // Build detailed success message
      let successMessage = `Successfully uploaded ${successful} member(s)`;
      
      if (successfulWithRetries.length > 0) {
        successMessage += ` (${successfulWithRetries.length} succeeded after retries)`;
      }
      
      if (failed > 0) {
        successMessage += `\n\nFailed: ${failed} row(s)`;
        
        if (retriedErrors.length > 0) {
          successMessage += `\n- ${retriedErrors.length} failed after retries`;
        }
        if (permanentErrors.length > 0) {
          successMessage += `\n- ${permanentErrors.length} permanent errors (duplicates, validation)`;
        }
        if (transientErrors.length > 0) {
          successMessage += `\n- ${transientErrors.length} transient errors (retries exhausted)`;
        }
        if (duplicates.length > 0) {
          successMessage += `\n- ${duplicates.length} duplicate name(s) in database`;
        }
        if (duplicateInFile.length > 0) {
          successMessage += `\n- ${duplicateInFile.length} duplicate name(s) in file`;
        }
        if (validationErrors.length > 0) {
          successMessage += `\n- ${validationErrors.length} validation error(s)`;
        }
        if (invalidEmails.length > 0) {
          successMessage += `\n- ${invalidEmails.length} invalid email(s)`;
        }
      }

      // Show success message (even with errors, if some succeeded)
      if (successful > 0) {
        showSuccess(successMessage);
      } else {
        // All failed
        showError(`Upload failed: ${failed} row(s) had errors. See console for details.`);
      }
      
      // Close modal
      setShowUploadModal(false);
      
      // Refresh members list
      await fetchMembers(currentPage);
      
      // Log detailed results for debugging
      if (failed > 0) {
        console.group('📊 Bulk Upload Results');
        console.log(`✅ Successful: ${successful}`);
        console.log(`❌ Failed: ${failed}`);
        
        if (successfulWithRetries.length > 0) {
          console.log(`🔄 Succeeded after retries:`, successfulWithRetries);
        }
        
        if (retriedErrors.length > 0) {
          console.log(`🔄 Failed after retries (${retriedErrors.length}):`, retriedErrors.slice(0, 10));
        }
        
        if (permanentErrors.length > 0) {
          console.log(`🚫 Permanent errors (${permanentErrors.length}):`, permanentErrors.slice(0, 10));
        }
        
        if (transientErrors.length > 0) {
          console.log(`⏱️ Transient errors (${transientErrors.length}):`, transientErrors.slice(0, 10));
        }
        
        if (duplicates.length > 0) {
          console.log(`🔁 Database duplicates (${duplicates.length}):`, duplicates.slice(0, 10));
        }
        
        if (duplicateInFile.length > 0) {
          console.log(`🔁 File duplicates (${duplicateInFile.length}):`, duplicateInFile.slice(0, 10));
        }
        
        if (validationErrors.length > 0) {
          console.log(`⚠️ Validation errors (${validationErrors.length}):`, validationErrors.slice(0, 10));
        }
        
        if (invalidEmails.length > 0) {
          console.log(`📧 Invalid emails (${invalidEmails.length}):`, invalidEmails.slice(0, 10));
        }
        
        console.log('Full error details:', allErrors.slice(0, 20));
        console.groupEnd();
      }
    } catch (error) {
      console.error('Bulk upload error:', error);
      showError(`Failed to upload file: ${error.message || 'Unknown error'}`);
    }
  };

  const exportMembers = async () => {
    try {
      const blob = await apiService.exportMembersCSV();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `members-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showSuccess('Members exported successfully!');
    } catch (error) {
      console.error('Export members error:', error);
      showError('Failed to export members CSV');
    }
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

      {/* Search and Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        {/* Search */}
        <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
            className="block w-full pl-10 pr-3 py-2.5 sm:py-2 border border-gray-300 rounded-md text-sm bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Search by name, email, or PIN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
        
        {/* Filters and Sort Controls */}
        <div className="flex flex-wrap gap-2">
          <select
            value={chapelRoleFilter}
            onChange={(e) => setChapelRoleFilter(e.target.value)}
            className="block px-3 py-2.5 sm:py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Chapel Roles</option>
            <option value="invitee">Invitees</option>
            <option value="member">Members</option>
            <option value="worker">Workers</option>
            <option value="unassigned">Unassigned</option>
          </select>

          <select
            value={chapelFilter}
            onChange={(e) => setChapelFilter(e.target.value)}
            disabled={loadingChapels}
            className="block px-3 py-2.5 sm:py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Chapels</option>
            <option value="unassigned">Unassigned</option>
            {chapels.map((chapel) => (
              <option key={chapel.id} value={chapel.id}>
                {chapel.name}
              </option>
            ))}
          </select>

          {/* Sort By Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="block px-3 py-2.5 sm:py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="name">Sort by Name</option>
            <option value="date">Sort by Date Added</option>
          </select>
          
          {/* Sort Order Toggle */}
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="inline-flex items-center px-3 py-2.5 sm:py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            title={sortOrder === 'asc' ? 'Ascending (A-Z, Oldest First)' : 'Descending (Z-A, Newest First)'}
          >
            {sortOrder === 'asc' ? (
              <ArrowUpIcon className="h-5 w-5 text-gray-600" />
            ) : (
              <ArrowDownIcon className="h-5 w-5 text-gray-600" />
            )}
          </button>
            </div>
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
              <p className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900">{totalMembers}</p>
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
              <p className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900">{totalMembers}</p>
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
                Members {searchTerm.trim() ? `(${filteredMembers.length} found)` : `(${totalMembers} total)`}
              </h3>
              
              {loading ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chapel</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member Code</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <TableRowSkeleton columns={8} rows={10} />
                    </tbody>
                  </table>
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
                    {filteredMembers.map((member) => {
                      const isInvitee = member.chapelRole === 'INVITEE';
                      return (
                      <div
                        key={member.id}
                        className={`border rounded-lg p-4 ${
                          selectedMembers.has(member.id)
                            ? 'bg-blue-50 border-blue-200'
                            : isInvitee
                              ? 'bg-yellow-50 border-yellow-200'
                              : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          {isAdmin && (
                            <input
                              type="checkbox"
                              checked={selectedMembers.has(member.id)}
                              onChange={() => handleSelectMember(member.id)}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mt-1 flex-shrink-0"
                            />
                          )}
                          
                          {/* Avatar */}
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-indigo-600 uppercase">
                                {member.name?.split(' ').map(n => n[0]).join('').substring(0, 2) || 'NA'}
                              </span>
                            </div>
                          </div>
                          
                          {/* Member Info */}
                          <div className="flex-1 min-w-0">
                            {/* Name, Email, and Badge Row */}
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-gray-900 break-words">
                                  {member.name || 'Unnamed Member'}
                                </div>
                                <div className="text-xs text-gray-500 truncate mt-0.5">
                                  {member.email}
                                </div>
                              <div className="text-xs text-gray-600 mt-1">
                                {member.chapel
                                  ? `Chapel: ${member.chapel.name} (${getMemberRoleLabel(member)})`
                                  : 'Chapel: Not assigned'}
                              </div>
                              <div className="text-xs text-gray-600 mt-1">
                                Role: {getMemberRoleLabel(member)}
                              </div>
                              <div className="text-xs text-gray-600 mt-1">
                                Chariot: {getMemberChariotLabel(member)}
                              </div>
                              </div>
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full flex-shrink-0 ${
                                member.isActive !== false 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {member.isActive !== false ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            
                            {/* Action Icons Row */}
                            <div className="flex items-center justify-end gap-2 mb-2">
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
                                    onClick={() => openRoleModal(member)}
                                    className="p-1.5 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded touch-manipulation"
                                    title="Assign Role"
                                    aria-label="Assign Role"
                                  >
                                    <UserGroupIcon className="h-5 w-5" />
                                  </button>
                                  <button
                                    onClick={() => openChapelModal(member)}
                                    className="p-1.5 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded touch-manipulation"
                                    title="Assign Chapel"
                                    aria-label="Assign Chapel"
                                  >
                                    <UserGroupIcon className="h-5 w-5" />
                                  </button>
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
                            
                            {/* Details Section */}
                            <div className="space-y-1 pt-2 border-t border-gray-100">
                              <div className="text-xs text-gray-600">
                                <span className="font-medium">PIN:</span>{' '}
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                  {member.pin || 'N/A'}
                                </span>
                              </div>
                              <div className="text-xs text-gray-600">
                                <span className="font-medium">Joined:</span>{' '}
                                {member.createdAt ? new Date(member.createdAt).toLocaleDateString('en-GB', { 
                                  day: 'numeric', 
                                  month: 'short', 
                                  year: 'numeric' 
                                }) : 'N/A'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      );
                    })}
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
                          Chapel
                        </th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Chariot
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
                      {filteredMembers.map((member) => {
                        const isInvitee = member.chapelRole === 'INVITEE';
                        return (
                          <tr
                            key={member.id}
                            className={`${
                              selectedMembers.has(member.id)
                                ? 'bg-blue-50 hover:bg-blue-100'
                                : isInvitee
                                  ? 'bg-yellow-50 hover:bg-yellow-100'
                                  : 'hover:bg-gray-50'
                            }`}
                          >
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
                          </td>
                            <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {member.chapel
                                  ? `${member.chapel.name} (${getMemberRoleLabel(member)})`
                                  : 'Not assigned'}
                              </div>
                            </td>
                            <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {getMemberRoleLabel(member)}
                              </div>
                            </td>
                            <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {getMemberChariotLabel(member)}
                              </div>
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
                                    onClick={() => openRoleModal(member)}
                                    className="text-blue-600 hover:text-blue-900 inline-flex items-center touch-manipulation"
                                    title="Assign Role"
                                    aria-label="Assign Role"
                                  >
                                    <UserGroupIcon className="h-4 w-4" />
                                    <span className="hidden lg:inline ml-1">Role</span>
                                  </button>
                                  <button
                                    onClick={() => openChapelModal(member)}
                                    className="text-purple-600 hover:text-purple-900 inline-flex items-center touch-manipulation"
                                    title="Assign Chapel"
                                    aria-label="Assign Chapel"
                                  >
                                    <UserGroupIcon className="h-4 w-4" />
                                    <span className="hidden lg:inline ml-1">Chapel</span>
                                  </button>
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
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                </>
              )}

              {/* Pagination Controls */}
              {!loading && totalPages > 1 && (
                <div className="bg-white px-4 py-3 sm:px-6 border-t border-gray-200 sm:flex sm:items-center sm:justify-between">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                    >
                      Next
                    </button>
            </div>
                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing <span className="font-medium">{(currentPage - 1) * membersPerPage + 1}</span> to{' '}
                        <span className="font-medium">{Math.min(currentPage * membersPerPage, totalMembers)}</span> of{' '}
                        <span className="font-medium">{totalMembers}</span> members
                      </p>
          </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                        >
                          <span className="sr-only">Previous</span>
                          <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                        </button>
                        
                        {/* Page Numbers */}
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium touch-manipulation ${
                                currentPage === pageNum
                                  ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                        
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                        >
                          <span className="sr-only">Next</span>
                          <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
                        </button>
                      </nav>
        </div>
                  </div>
                </div>
              )}
            </div>
          </div>

      {/* Add/Edit Member Modal */}
      {showAddModal && (
        <AddMemberModal
          member={selectedMember}
          onSave={handleAddMember}
          isSubmitting={isSubmittingMember}
          onCancel={() => {
            setShowAddModal(false);
            setSelectedMember(null);
            setIsSubmittingMember(false);
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

      {/* Role Assignment Modal */}
      {roleModalOpen && roleMember && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900">Assign Role</h3>
              <button
                onClick={closeRoleModal}
                className="text-gray-400 hover:text-gray-500"
                aria-label="Close"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <p className="text-sm text-gray-600">Member</p>
                <p className="text-sm font-medium text-gray-900">{roleMember.name}</p>
              </div>
              <div>
                <label htmlFor="roleSelection" className="block text-sm font-medium text-gray-700">
                  Role
                </label>
                <select
                  id="roleSelection"
                  value={roleSelection}
                  onChange={(e) => setRoleSelection(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="invitee">Invitee</option>
                  <option value="member">Member</option>
                  <option value="worker">Worker</option>
                  <option value="unassigned">Unassigned</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200">
              <button
                onClick={closeRoleModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRoleUpdate}
                disabled={roleSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {roleSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chapel Assignment Modal */}
      {chapelModalOpen && chapelMember && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900">Assign Chapel</h3>
              <button
                onClick={closeChapelModal}
                className="text-gray-400 hover:text-gray-500"
                aria-label="Close"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <p className="text-sm text-gray-600">Member</p>
                <p className="text-sm font-medium text-gray-900">{chapelMember.name}</p>
              </div>
              <div>
                <label htmlFor="chapelSelection" className="block text-sm font-medium text-gray-700">
                  Chapel
                </label>
                <select
                  id="chapelSelection"
                  value={chapelSelection}
                  onChange={(e) => setChapelSelection(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="unassigned">Unassigned</option>
                  {chapels.map((chapel) => (
                    <option key={chapel.id} value={chapel.id}>
                      {chapel.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="chapelRoleSelection" className="block text-sm font-medium text-gray-700">
                  Role
                </label>
                <select
                  id="chapelRoleSelection"
                  value={chapelRoleSelection}
                  onChange={(e) => setChapelRoleSelection(e.target.value)}
                  disabled={chapelSelection === 'unassigned'}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-50"
                >
                  <option value="invitee">Invitee</option>
                  <option value="member">Member</option>
                  <option value="worker">Worker</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200">
              <button
                onClick={closeChapelModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleChapelUpdate}
                disabled={chapelSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {chapelSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <DeleteConfirmationModal
          isOpen={deleteModalOpen}
          deleteType={deleteType}
          memberName={memberToDelete?.name}
          memberCount={selectedMembers.size}
          confirmText={deleteConfirmText}
          onConfirmTextChange={setDeleteConfirmText}
          onConfirm={deleteType === 'bulk' ? confirmBulkDelete : confirmDeleteMember}
          onCancel={() => {
            setDeleteModalOpen(false);
            setDeleteConfirmText('');
            setMemberToDelete(null);
            setDeleteType(null);
          }}
        />
      )}
    </div>
  );
};

// Add Member Modal Component
const AddMemberModal = ({ member, onSave, onCancel, isSubmitting = false }) => {
  const splitName = (fullName = '') => {
    const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
    return {
      firstName: parts[0] || '',
      lastName: parts.slice(1).join(' ') || '',
    };
  };

  const initialNames = splitName(member?.name || '');

  const [formData, setFormData] = useState({
    firstName: member?.firstName || initialNames.firstName,
    lastName: member?.lastName || initialNames.lastName,
    email: member?.email || '',
    dateOfBirth: member?.dateOfBirth || '',
    address: member?.address || '',
    emergencyContact: member?.emergencyContact || '',
  });

  useEffect(() => {
    const updatedNames = splitName(member?.name || '');
    setFormData({
      firstName: member?.firstName || updatedNames.firstName,
      lastName: member?.lastName || updatedNames.lastName,
      email: member?.email || '',
      dateOfBirth: member?.dateOfBirth || '',
      address: member?.address || '',
      emergencyContact: member?.emergencyContact || '',
    });
  }, [member]);

  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmitting) {
      return;
    }
    
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
              disabled={isSubmitting}
              className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Adding...' : (member ? 'Update' : 'Add') + ' Member'}
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

// Delete Confirmation Modal Component
const DeleteConfirmationModal = ({
  isOpen,
  deleteType,
  memberName,
  memberCount,
  confirmText,
  onConfirmTextChange,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const isBulk = deleteType === 'bulk';
  const isValid = confirmText.toLowerCase() === 'delete';

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-lg font-medium text-gray-900">
                Confirm Deletion
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  {isBulk ? (
                    <>
                      You are about to delete <strong>{memberCount} member(s)</strong>. This action cannot be undone.
                    </>
                  ) : (
                    <>
                      You are about to delete <strong>{memberName}</strong>. This action cannot be undone.
                    </>
                  )}
                </p>
                <p className="text-sm text-gray-700 mt-3 font-medium">
                  Type <span className="font-mono bg-gray-100 px-2 py-1 rounded">delete</span> to confirm:
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Confirmation Input */}
          <div className="mt-4">
            <input
              type="text"
              value={confirmText}
              onChange={(e) => onConfirmTextChange(e.target.value)}
              placeholder="Type 'delete' to confirm"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
              autoFocus
            />
            {confirmText && !isValid && (
              <p className="mt-2 text-sm text-red-600">
                Please type exactly "delete" to confirm
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 space-y-3 space-y-reverse sm:space-y-0">
            <button
              type="button"
              onClick={onCancel}
              className="w-full sm:w-auto inline-flex justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={!isValid}
              className="w-full sm:w-auto inline-flex justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isBulk ? `Delete ${memberCount} Member(s)` : 'Delete Member'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompleteMembersPage;
