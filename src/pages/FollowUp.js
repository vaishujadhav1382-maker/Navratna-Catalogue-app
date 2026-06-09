import React, { useState, useEffect, useCallback } from 'react';
import { collectionGroup, getDocs, collection, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useApp } from '../context/AppContext';
import { MessageCircle, ChevronDown, ChevronUp, Filter, XCircle, Clock, Download, Trash2, User, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';

const FollowUp = () => {
    // Add FollowUp to Firestore
    // const addFollowUpToFirestore = async (followUpData) => {
    //     try {
    //         const docRef = await addDoc(collection(db, 'appointments'), followUpData);
    //         return docRef.id;
    //     } catch (error) {
    //         console.error('Error adding follow-up:', error);
    //         return null;
    //     }
    // };
    const { employees } = useApp();
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedRow, setExpandedRow] = useState(null);
    const [salesmen, setSalesmen] = useState([]);

    // Filter States
    const [selectedEmployee, setSelectedEmployee] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFilterStart, setDateFilterStart] = useState('');
    const [dateFilterEnd, setDateFilterEnd] = useState('');
    const [dateFilterType, setDateFilterType] = useState('creation');
    const [sortOrder, setSortOrder] = useState('newest');
    // Search bar state
    const [searchTerm, setSearchTerm] = useState("");
    // Delete confirmation state
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    // Get salesman name from ID
    const getSalesmanNameById = useCallback((salesmanId) => {
        if (!salesmanId) return 'Unassigned';
        // Try to find in employees first (which contains all roles: admin, telecaller, salesman)
        const emp = employees.find(e => e.id === salesmanId || e.empId === salesmanId);
        if (emp) return emp.name;
        // Fallback to local salesmen list
        const salesman = salesmen.find(s => s.id === salesmanId);
        return salesman ? salesman.name : 'Unknown';
    }, [employees, salesmen]);


    useEffect(() => {
        let isMounted = true;

        const fetchAppointments = async () => {
            try {
                // Use collectionGroup to fetch 'appointments' from any depth
                const querySnapshot = await getDocs(collectionGroup(db, 'appointments'));
                const fetchedData = querySnapshot.docs.map((doc) => {
                    const data = doc.data();
                    const salesmanName = getSalesmanNameById(data.assignedTo);

                    return {
                        id: doc.id,
                        ...data,
                        salesmanName
                    };
                });

                if (isMounted) {
                    setAppointments(fetchedData);
                }
            } catch (error) {
                console.error("Error fetching appointments:", error);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchAppointments();

        return () => {
            isMounted = false;
        };
    }, [salesmen, getSalesmanNameById]);

    // Fetch salesmen from Firestore
    useEffect(() => {
        const fetchSalesmen = async () => {
            try {
                const salesmenSnapshot = await getDocs(collection(db, 'admin-data', 'root', 'employees', 'salesman', 'salesman'));
                const salesmenList = salesmenSnapshot.docs.map(doc => ({
                    id: doc.id,
                    name: doc.data().name,
                    ...doc.data()
                }));
                setSalesmen(salesmenList);
            } catch (error) {
                console.error('Error fetching salesmen:', error);
                setSalesmen([]);
            }
        };
        fetchSalesmen();
    }, []);

    const toggleExpand = (id) => {
        setExpandedRow(expandedRow === id ? null : id);
    };

    // Helper to get employee name from ID
    const getEmployeeName = (empId) => {
        if (!empId) return 'Unknown';
        const emp = employees.find(e => e.id === empId || e.empId === empId);
        return emp ? emp.name : empId;
    };

    // Helper to format date for comparison (YYYY-MM-DD -> DD/MM/YYYY)
    const formatDateForComparison = (isoDate) => {
        if (!isoDate) return '';
        const [year, month, day] = isoDate.split('-');
        return `${day}/${month}/${year}`;
    };

    const handleTodayClick = () => {
        const today = new Date().toISOString().split('T')[0];
        setDateFilterStart(today);
        setDateFilterEnd(today);
    };

    const clearFilters = () => {
        setSelectedEmployee('all');
        setStatusFilter('all');
        setDateFilterStart('');
        setDateFilterEnd('');
        setDateFilterType('creation');
        setSortOrder('newest');
    };

    const handleDeleteAppointment = async (appointmentId) => {
        try {
            // Find the appointment to get its path
            const appointment = appointments.find(apt => apt.id === appointmentId);
            if (!appointment) return;

            // Query to find the document in the nested structure
            const querySnapshot = await getDocs(collectionGroup(db, 'appointments'));
            const docToDelete = querySnapshot.docs.find(doc => doc.id === appointmentId);

            if (docToDelete) {
                await deleteDoc(docToDelete.ref);
                // Remove from state
                setAppointments(appointments.filter(apt => apt.id !== appointmentId));
                setDeleteConfirm(null);
            }
        } catch (error) {
            console.error('Error deleting appointment:', error);
            alert('Error deleting appointment');
        }
    };

    const exportToExcel = () => {
        // Prepare data for Excel export
        const excelData = filteredAppointments.map((apt) => {
            // Determine display date
            let displayDate = apt.createdDate || apt.date || 'N/A';

            // Determine display status
            let displayStatus = (apt.status || 'Pending');
            const rootStatus = (apt.status || '').toLowerCase();
            if (rootStatus.includes('cancel')) {
                displayStatus = 'Cancelled';
            } else if (rootStatus === 'complete' || rootStatus === 'purchased') {
                displayStatus = 'Purchased';
            } else if (apt.products && apt.products.some(p => (p.status || '').toLowerCase().includes('cancel'))) {
                displayStatus = 'Cancelled (Product)';
            }

            // Compile follow-up history
            const followUpHistory = apt.followUps && apt.followUps.length > 0
                ? apt.followUps.map((f, idx) => `${idx + 1}. ${f.date}: ${f.text}`).join(' | ')
                : 'No follow-ups';

            return {
                'Customer Name': apt.customerName || 'N/A',
                'Last Interaction': displayDate,
                'Employee Name': getEmployeeName(apt.employeeId),
                'Salesman Name': apt.salesmanName || 'Unassigned',
                'Status': displayStatus,
                'Follow-ups Count': apt.followUps?.length || 0,
                'Follow-up History': followUpHistory,
                'Customer Mobile': apt.customerMobile || apt.mobileNumber || 'N/A',
                'Created Date': apt.createdDate || 'N/A',
            };
        });

        // Create worksheet
        const ws = XLSX.utils.json_to_sheet(excelData);

        // Set column widths
        const colWidths = [
            { wch: 20 }, // Customer Name
            { wch: 15 }, // Last Interaction
            { wch: 20 }, // Employee Name
            { wch: 20 }, // Salesman Name
            { wch: 15 }, // Status
            { wch: 15 }, // Follow-ups Count
            { wch: 50 }, // Follow-up History
            { wch: 15 }, // Customer Mobile
            { wch: 15 }, // Created Date
        ];
        ws['!cols'] = colWidths;

        // Create workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Follow Up Data');

        // Generate filename with current date
        const today = new Date().toISOString().split('T')[0];
        const filename = `FollowUp_Data_${today}.xlsx`;

        // Save file
        XLSX.writeFile(wb, filename);
    };

    // Filter Logic
    const filteredAppointments = appointments.filter(apt => {
        // 1. Employee Filter
        const matchEmployee = selectedEmployee === 'all' || apt.employeeId === selectedEmployee;

        // 2. Status Filter
        let matchStatus = true;
        if (statusFilter !== 'all') {
            const filter = statusFilter.toLowerCase();

            // Check root status
            const rootStatus = (apt.status || '').toLowerCase().trim();
            // Check nested products status
            const productsStatus = apt.products && apt.products.some(p => (p.status || '').toLowerCase().includes(filter));

            // Handle special cases
            if (filter === 'cancel' || filter === 'cancelled') {
                const isRootCancel = rootStatus.includes('cancel');
                matchStatus = isRootCancel || productsStatus;
            } else if (filter === 'complete') {
                // Treat both 'complete' and 'purchased' as complete
                const isRootComplete = rootStatus === 'complete' || rootStatus === 'purchased';
                matchStatus = isRootComplete || productsStatus;
            } else {
                matchStatus = rootStatus === filter || productsStatus;
            }
        }

        // 3. Date Filter (Range)
        let matchDate = true;
        if (dateFilterStart || dateFilterEnd) {
            const startDate = dateFilterStart ? formatDateForComparison(dateFilterStart) : null;
            const endDate = dateFilterEnd ? formatDateForComparison(dateFilterEnd) : null;

            let dateToCheck = null;
            if (dateFilterType === 'interaction' && apt.followUps && apt.followUps.length > 0) {
                dateToCheck = apt.followUps[apt.followUps.length - 1].date;
            } else {
                dateToCheck = apt.createdDate || apt.date || apt.firstVisitDate;
                if (!dateToCheck && apt.createdAt) {
                    if (typeof apt.createdAt.toDate === 'function') {
                        dateToCheck = apt.createdAt.toDate().toLocaleDateString('en-GB');
                    } else if (apt.createdAt.seconds) {
                        dateToCheck = new Date(apt.createdAt.seconds * 1000).toLocaleDateString('en-GB');
                    }
                }
            }

            if (dateToCheck) {
                const [d, m, y] = dateToCheck.split('/');
                const checkDateObj = new Date(y, m - 1, d);

                let inRange = true;
                if (startDate) {
                    const [sd, sm, sy] = startDate.split('/');
                    const startDateObj = new Date(sy, sm - 1, sd);
                    inRange = inRange && checkDateObj >= startDateObj;
                }
                if (endDate) {
                    const [ed, em, ey] = endDate.split('/');
                    const endDateObj = new Date(ey, em - 1, ed);
                    inRange = inRange && checkDateObj <= endDateObj;
                }
                matchDate = inRange;
            } else {
                matchDate = false;
            }
        }

        // 4. Search Filter
        const search = searchTerm.trim().toLowerCase();
        let matchSearch = true;
        if (search) {
            matchSearch = (
                (apt.customerName && apt.customerName.toLowerCase().includes(search)) ||
                (apt.customerMobile && apt.customerMobile.toLowerCase().includes(search)) ||
                (apt.products && apt.products[0] && apt.products[0].name && apt.products[0].name.toLowerCase().includes(search))
            );
        }

        return matchEmployee && matchStatus && matchDate && matchSearch;
    });

    // Helper for sorting
    const getTimestamp = (apt) => {
        if (!apt) return 0;
        if (typeof apt.createdAt === 'number') return apt.createdAt;
        if (apt.createdAt && typeof apt.createdAt.toDate === 'function') return apt.createdAt.toDate().getTime();
        if (apt.createdAt && apt.createdAt.seconds) return apt.createdAt.seconds * 1000;
        
        // Fallback to parse other date fields (DD/MM/YYYY format)
        const dateStr = apt.createdDate || apt.firstVisitDate || apt.date;
        if (dateStr && typeof dateStr === 'string') {
            const parts = dateStr.split('/');
            if (parts.length === 3) {
                const parsed = new Date(parts[2], parts[1] - 1, parts[0]);
                if (!isNaN(parsed.getTime())) return parsed.getTime();
            }
            const parsed = new Date(dateStr);
            if (!isNaN(parsed.getTime())) return parsed.getTime();
        }
        return 0;
    };

    const sortedAndFilteredAppointments = [...filteredAppointments].sort((a, b) => {
        const timeA = getTimestamp(a);
        const timeB = getTimestamp(b);
        return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Example usage: Add a new follow-up record */}
            {/*
            <button
                onClick={() => {
                    const newFollowUp = {
                        customerName: "Test Name",
                        customerMobile: "9999999999",
                        firstVisitDate: "29/12/2025",
                        products: [{ name: "Product 1" }],
                        followUps: [],
                        status: "Pending",
                        createdDate: new Date().toLocaleDateString('en-GB'),
                    };
                    addFollowUpToFirestore(newFollowUp);
                }}
            >
                Add Test FollowUp
            </button>
            */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Follow Up Management</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Track and manage customer interactions</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-lg font-medium text-sm">
                            Total Records: {sortedAndFilteredAppointments.length}
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={exportToExcel}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-colors shadow-sm"
                        >
                            <Download className="w-4 h-4" />
                            Export to Excel
                        </motion.button>
                    </div>
                </div>

                {/* Filters Section */}
                <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            <Filter className="w-4 h-4" /> Filters:
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                            {/* Search Bar */}
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Search..."
                                className="px-2 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs focus:ring-2 focus:ring-primary/50 outline-none"
                            />

                            {/* Employee Filter */}
                            <select
                                value={selectedEmployee}
                                onChange={(e) => setSelectedEmployee(e.target.value)}
                                className="px-2 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs focus:ring-2 focus:ring-primary/50 outline-none cursor-pointer"
                            >
                                <option value="all">All Employees</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                                ))}
                            </select>

                            {/* Status Filter */}
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-2 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs focus:ring-2 focus:ring-primary/50 outline-none cursor-pointer"
                            >
                                <option value="all">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="complete">Purchased</option>
                                <option value="cancelled">Cancelled</option>
                            </select>

                            {/* Sort Filter */}
                            <select
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value)}
                                className="px-2 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs focus:ring-2 focus:ring-primary/50 outline-none cursor-pointer"
                            >
                                <option value="newest">Sort: Newest First</option>
                                <option value="oldest">Sort: Oldest First</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                            {/* Date Filter Type */}
                            <select
                                value={dateFilterType}
                                onChange={(e) => setDateFilterType(e.target.value)}
                                className="px-2 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs focus:ring-2 focus:ring-primary/50 outline-none cursor-pointer"
                            >
                                <option value="creation">By Creation Date</option>
                                <option value="interaction">By Last Interaction</option>
                            </select>

                            {/* Date Filter From */}
                            <div className="flex items-center bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                                <span className="px-2 py-2 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">From:</span>
                                <input
                                    type="date"
                                    value={dateFilterStart}
                                    onChange={(e) => setDateFilterStart(e.target.value)}
                                    className="px-1 py-2 bg-transparent text-xs outline-none cursor-pointer dark:text-white flex-1"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                            {/* Date Filter To */}
                            <div className="flex items-center bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                                <span className="px-2 py-2 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">To:</span>
                                <input
                                    type="date"
                                    value={dateFilterEnd}
                                    onChange={(e) => setDateFilterEnd(e.target.value)}
                                    className="px-1 py-2 bg-transparent text-xs outline-none cursor-pointer dark:text-white flex-1"
                                />
                            </div>

                            {/* Filter Actions */}
                            <button
                                onClick={handleTodayClick}
                                className="px-2 py-2 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg text-xs font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center justify-center gap-1 whitespace-nowrap"
                            >
                                <Clock className="w-3 h-3" />
                                Today
                            </button>

                            {(selectedEmployee !== 'all' || statusFilter !== 'all' || dateFilterStart || dateFilterEnd || sortOrder !== 'newest' || dateFilterType !== 'creation') && (
                                <button
                                    onClick={clearFilters}
                                    className="px-2 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xs font-medium underline rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors whitespace-nowrap"
                                >
                                    Clear All
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Number</th>
                                <th 
                                    className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors group"
                                    onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
                                    title="Click to toggle sort order"
                                >
                                    <div className="flex items-center gap-1">
                                        Creation Date
                                        <span className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200">
                                            {sortOrder === 'newest' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                                        </span>
                                    </div>
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">1st Visit</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Product</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Salesman</th>
                                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">F/U</th>
                                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {sortedAndFilteredAppointments.map((apt) => {
                                // Determine the display date
                                // let displayDate = apt.createdDate || apt.date || 'N/A';
                                // Determine display status
                                let displayStatus = (apt.status || 'Pending');
                                let statusColor = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
                                // Check for cancelled in products if root is not explicitly cancelled
                                const rootStatus = (apt.status || '').toLowerCase();
                                if (rootStatus.includes('cancel')) {
                                    displayStatus = 'Cancelled';
                                    statusColor = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
                                } else if (rootStatus === 'complete' || rootStatus === 'purchased') {
                                    displayStatus = 'Purchased';
                                    statusColor = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
                                } else if (apt.products && apt.products.some(p => (p.status || '').toLowerCase().includes('cancel'))) {
                                    displayStatus = 'Cancelled (Product)';
                                    statusColor = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
                                }
                                // If filtering by date, show last interaction
                                if (dateFilterStart || dateFilterEnd) {
                                    // if (apt.followUps && apt.followUps.length > 0) {
                                    //     const lastFollowUp = apt.followUps[apt.followUps.length - 1];
                                    //     if (lastFollowUp && lastFollowUp.date) {
                                    //         displayDate = lastFollowUp.date;
                                    //     }
                                    // }
                                } else {
                                    // No filter: Show last interaction date (latest follow-up)
                                    // if (apt.followUps && apt.followUps.length > 0) {
                                    //     const lastFollowUp = apt.followUps[apt.followUps.length - 1];
                                    //     // if (lastFollowUp && lastFollowUp.date) {
                                    //     //     displayDate = lastFollowUp.date;
                                    //     // }
                                    // }
                                }
                                // Product 1 name
                                const product1 = apt.products && apt.products[0] ? apt.products[0].name : "-";
                                // Format creation date
                                let creationDateDisplay = apt.createdDate || "-";
                                if (apt.createdAt) {
                                    if (typeof apt.createdAt.toDate === 'function') {
                                        creationDateDisplay = apt.createdAt.toDate().toLocaleDateString('en-GB');
                                    } else if (apt.createdAt.seconds) {
                                        creationDateDisplay = new Date(apt.createdAt.seconds * 1000).toLocaleDateString('en-GB');
                                    } else if (typeof apt.createdAt === 'number') {
                                        creationDateDisplay = new Date(apt.createdAt).toLocaleDateString('en-GB');
                                    } else if (typeof apt.createdAt === 'string') {
                                        const d = new Date(apt.createdAt);
                                        if (!isNaN(d)) creationDateDisplay = d.toLocaleDateString('en-GB');
                                    }
                                }
                                // First visit date
                                const firstVisitDate = apt.firstVisitDate || apt.date || "-";
                                
                                // Robust mobile number extraction
                                const displayMobile = apt.customerMobile || apt.mobileNumber || apt.mobile || apt.phone || apt.phoneNumber || apt.contactNumber || apt.contact || "-";

                                return (
                                    <React.Fragment key={apt.id}>
                                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td
                                                className="px-3 py-2 whitespace-nowrap cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                onClick={() => toggleExpand(apt.id)}
                                                title="Click to view details"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                        {apt.customerName?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-xs font-medium text-primary hover:underline truncate">{apt.customerName}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                <div className="text-xs text-gray-900 dark:text-white">{displayMobile}</div>
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                <div className="text-xs text-gray-900 dark:text-white">{creationDateDisplay}</div>
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                <div className="text-xs text-gray-900 dark:text-white">{firstVisitDate}</div>
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                <div className="text-xs text-gray-900 dark:text-white truncate max-w-[100px]">{product1}</div>
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                <div className="text-xs text-gray-900 dark:text-white truncate max-w-[100px]">{apt.salesmanName || 'Unassigned'}</div>
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap text-center">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${(apt.followUps?.length || 0) > 0
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                                    }`}>
                                                    {apt.followUps?.length || 0}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap text-center">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                                                    {displayStatus}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => toggleExpand(apt.id)}
                                                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                                                        title={expandedRow === apt.id ? 'Hide' : 'View'}
                                                    >
                                                        {expandedRow === apt.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteConfirm(apt.id)}
                                                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1"
                                                        title="Delete entry"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {/* Expanded Detail Row */}
                                        <AnimatePresence>
                                            {expandedRow === apt.id && (
                                                <motion.tr
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                >
                                                    <td colSpan="9" className="px-3 py-3 bg-gray-50 dark:bg-gray-800/50">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {/* Customer Details */}
                                                            <div className="space-y-3">
                                                                <h4 className="text-xs font-semibold text-gray-900 dark:text-white flex items-center">
                                                                    <User className="w-3 h-3 mr-2" />
                                                                    Customer Details
                                                                </h4>
                                                                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-300 space-y-1">
                                                                    <p><strong className="font-medium text-gray-900 dark:text-gray-200">Name:</strong> {apt.customerName || 'N/A'}</p>
                                                                    <p><strong className="font-medium text-gray-900 dark:text-gray-200">Mobile:</strong> {displayMobile}</p>
                                                                    {(apt.address || apt.city) && (
                                                                        <p><strong className="font-medium text-gray-900 dark:text-gray-200">Address:</strong> {[apt.address, apt.city].filter(Boolean).join(', ')}</p>
                                                                    )}
                                                                    <p><strong className="font-medium text-gray-900 dark:text-gray-200">Added By:</strong> {getEmployeeName(apt.employeeId)}</p>
                                                                    <p><strong className="font-medium text-gray-900 dark:text-gray-200">Salesman:</strong> {apt.salesmanName || 'Unassigned'}</p>
                                                                    <p><strong className="font-medium text-gray-900 dark:text-gray-200">Current Status:</strong> {apt.status || 'Pending'}</p>
                                                                </div>
                                                            </div>

                                                            {/* Product Details */}
                                                            <div className="space-y-3">
                                                                <h4 className="text-xs font-semibold text-gray-900 dark:text-white flex items-center">
                                                                    <Package className="w-3 h-3 mr-2" />
                                                                    Product Details
                                                                </h4>
                                                                {apt.products && apt.products.length > 0 ? (
                                                                    <div className="space-y-2">
                                                                        {apt.products.map((p, i) => (
                                                                            <div key={i} className="bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs">
                                                                                <p className="font-semibold text-gray-900 dark:text-white">{p.name || p.productName || 'Unknown Product'}</p>
                                                                                {p.status && <p className="text-gray-600 dark:text-gray-400 mt-1">Status: {p.status}</p>}
                                                                                {p.price && <p className="text-gray-600 dark:text-gray-400">Price: {p.price}</p>}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-xs text-gray-500 italic bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">No products assigned.</p>
                                                                )}
                                                            </div>

                                                            {/* Follow-up History */}
                                                            <div className="space-y-3 md:col-span-2 mt-2">
                                                                <h4 className="text-xs font-semibold text-gray-900 dark:text-white flex items-center border-t border-gray-200 dark:border-gray-700 pt-4">
                                                                    <MessageCircle className="w-3 h-3 mr-2" />
                                                                    Follow-up History
                                                                </h4>
                                                                {apt.followUps && apt.followUps.length > 0 ? (
                                                                    <div className="space-y-2">
                                                                        {apt.followUps.map((followUp, index) => (
                                                                            <div key={index} className="flex gap-3 p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                                                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400">
                                                                                    {index + 1}
                                                                                </div>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <div className="flex items-center justify-between mb-0.5">
                                                                                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                                                                            {followUp.date}
                                                                                        </span>
                                                                                    </div>
                                                                                    <p className="text-xs text-gray-700 dark:text-gray-300 break-words">
                                                                                        {followUp.text}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-xs text-gray-500 italic">No follow-up history records found.</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            )}
                                        </AnimatePresence>
                                    </React.Fragment>
                                );
                            })}
                            {sortedAndFilteredAppointments.length === 0 && (
                                <tr>
                                    <td colSpan="9" className="px-3 py-8 text-center text-gray-500 text-sm">
                                        No appointments found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={() => setDeleteConfirm(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full p-5 border border-gray-200 dark:border-gray-700"
                        >
                            <div className="flex items-center justify-center w-10 h-10 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                            </div>
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white text-center mb-1">
                                Delete Entry
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-5">
                                Are you sure? This action cannot be undone.
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg text-sm font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDeleteAppointment(deleteConfirm)}
                                    className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
                                >
                                    <Trash2 className="w-3 h-3" />
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FollowUp;
