import React, { useState, useEffect } from 'react';
import { collectionGroup, getDocs, addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { useApp } from '../context/AppContext';
import { ClipboardList, Calendar, User, MessageCircle, ChevronDown, ChevronUp, Filter, CheckCircle, XCircle, Clock, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';

const FollowUp = () => {
        // Add FollowUp to Firestore
        const addFollowUpToFirestore = async (followUpData) => {
            try {
                const docRef = await addDoc(collection(db, 'appointments'), followUpData);
                return docRef.id;
            } catch (error) {
                console.error('Error adding follow-up:', error);
                return null;
            }
        };
    const { employees } = useApp();
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedRow, setExpandedRow] = useState(null);

    // Filter States
    const [selectedEmployee, setSelectedEmployee] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('');
    // Search bar state
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        let isMounted = true;

        const fetchAppointments = async () => {
            try {
                // Use collectionGroup to fetch 'appointments' from any depth
                const querySnapshot = await getDocs(collectionGroup(db, 'appointments'));
                const fetchedData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                // Sort by number of follow-ups (descending)
                const sortedData = fetchedData.sort((a, b) => {
                    const countA = a.followUps ? a.followUps.length : 0;
                    const countB = b.followUps ? b.followUps.length : 0;
                    return countB - countA;
                });

                if (isMounted) {
                    setAppointments(sortedData);
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
        setDateFilter(today);
    };

    const clearFilters = () => {
        setSelectedEmployee('all');
        setStatusFilter('all');
        setDateFilter('');
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
                displayStatus = 'Complete';
            } else if (apt.products && apt.products.some(p => (p.status || '').toLowerCase().includes('cancel'))) {
                displayStatus = 'Cancelled (Product)';
            }

            // If filtering by date, show the matched date
            if (dateFilter) {
                const formattedFilterDate = formatDateForComparison(dateFilter);
                const mainMatch = (apt.date === formattedFilterDate) || (apt.createdDate === formattedFilterDate);

                if (mainMatch) {
                    displayDate = formattedFilterDate;
                } else if (apt.followUps) {
                    const matchedFollowUp = apt.followUps.find(f => (f.date || '').trim() === formattedFilterDate);
                    if (matchedFollowUp) {
                        displayDate = matchedFollowUp.date;
                    }
                }
            } else {
                // Show last interaction date
                if (apt.followUps && apt.followUps.length > 0) {
                    const lastFollowUp = apt.followUps[apt.followUps.length - 1];
                    if (lastFollowUp && lastFollowUp.date) {
                        displayDate = lastFollowUp.date;
                    }
                }
            }

            // Compile follow-up history
            const followUpHistory = apt.followUps && apt.followUps.length > 0
                ? apt.followUps.map((f, idx) => `${idx + 1}. ${f.date}: ${f.text}`).join(' | ')
                : 'No follow-ups';

            return {
                'Customer Name': apt.customerName || 'N/A',
                'Last Interaction': displayDate,
                'Employee Name': getEmployeeName(apt.employeeId),
                'Status': displayStatus,
                'Follow-ups Count': apt.followUps?.length || 0,
                'Follow-up History': followUpHistory,
                'Customer Mobile': apt.customerMobile || 'N/A',
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

            // Handle "Cancel" vs "Cancelled" discrepancy
            if (filter === 'cancel' || filter === 'cancelled') {
                const isRootCancel = rootStatus.includes('cancel');
                matchStatus = isRootCancel || productsStatus;
            } else {
                matchStatus = rootStatus === filter || productsStatus;
            }
        }

        // 3. Date Filter
        // DB Format: "20/12/2025" (DD/MM/YYYY)
        let matchDate = true;
        if (dateFilter) {
            const formattedFilterDate = formatDateForComparison(dateFilter);

            // Check formatted date against apt.date, createdDate, OR nested followUps
            const checkDate = (d) => (d || '').trim() === formattedFilterDate;

            const mainDateMatch = checkDate(apt.date) || checkDate(apt.createdDate);
            // Check if ANY follow-up in the history matches the date
            const followUpMatch = apt.followUps && apt.followUps.some(f => checkDate(f.date));

            matchDate = mainDateMatch || followUpMatch;
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
                            Total Records: {filteredAppointments.length}
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
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
                        <Filter className="w-4 h-4" /> Filters:
                    </div>

                    {/* Search Bar */}
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search by name, number, product..."
                        className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                        style={{ minWidth: 200 }}
                    />

                    {/* Employee Filter */}
                    <select
                        value={selectedEmployee}
                        onChange={(e) => setSelectedEmployee(e.target.value)}
                        className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-primary/50 outline-none cursor-pointer"
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
                        className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-primary/50 outline-none cursor-pointer"
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="complete">Complete</option>
                        <option value="cancelled">Cancelled</option>
                    </select>

                    {/* Date Filter */}
                    <div className="flex items-center bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="pl-3 pr-2 py-2 bg-transparent text-sm outline-none cursor-pointer dark:text-white"
                        />
                    </div>

                    {/* Filter Actions */}
                    <button
                        onClick={handleTodayClick}
                        className="px-3 py-2 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-1"
                    >
                        <Clock className="w-3.5 h-3.5" />
                        Today
                    </button>

                    {(selectedEmployee !== 'all' || statusFilter !== 'all' || dateFilter) && (
                        <button
                            onClick={clearFilters}
                            className="px-3 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm font-medium underline"
                        >
                            Clear All
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Number</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">First Visit Date</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Product 1</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Follow Ups</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredAppointments.map((apt) => {
                                // Determine the display date
                                let displayDate = apt.createdDate || apt.date || 'N/A';
                                // Determine display status
                                let displayStatus = (apt.status || 'Pending');
                                let statusColor = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
                                // Check for cancelled in products if root is not explicitly cancelled
                                const rootStatus = (apt.status || '').toLowerCase();
                                if (rootStatus.includes('cancel')) {
                                    displayStatus = 'Cancelled';
                                    statusColor = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
                                } else if (rootStatus === 'complete' || rootStatus === 'purchased') {
                                    statusColor = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
                                } else if (apt.products && apt.products.some(p => (p.status || '').toLowerCase().includes('cancel'))) {
                                    displayStatus = 'Cancelled (Product)';
                                    statusColor = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
                                }
                                // If filtering by date, we prefer to show the date that MATCHED the filter
                                if (dateFilter) {
                                    const formattedFilterDate = formatDateForComparison(dateFilter);
                                    // Check if main date matches
                                    const mainMatch = (apt.date === formattedFilterDate) || (apt.createdDate === formattedFilterDate);
                                    if (mainMatch) {
                                        displayDate = formattedFilterDate;
                                    } else if (apt.followUps) {
                                        // Find the follow-up that matched
                                        const matchedFollowUp = apt.followUps.find(f => (f.date || '').trim() === formattedFilterDate);
                                        if (matchedFollowUp) {
                                            displayDate = matchedFollowUp.date;
                                        }
                                    }
                                } else {
                                    // No filter: Show last interaction date (latest follow-up)
                                    if (apt.followUps && apt.followUps.length > 0) {
                                        const lastFollowUp = apt.followUps[apt.followUps.length - 1];
                                        if (lastFollowUp && lastFollowUp.date) {
                                            displayDate = lastFollowUp.date;
                                        }
                                    }
                                }
                                // Product 1 name
                                const product1 = apt.products && apt.products[0] ? apt.products[0].name : "-";
                                // First visit date
                                const firstVisitDate = apt.firstVisitDate || apt.createdDate || apt.date || "-";
                                return (
                                    <React.Fragment key={apt.id}>
                                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                        {apt.customerName?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900 dark:text-white">{apt.customerName}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900 dark:text-white">{apt.customerMobile || "-"}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900 dark:text-white">{firstVisitDate}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900 dark:text-white">{product1}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${(apt.followUps?.length || 0) > 0
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                                    }`}>
                                                    {apt.followUps?.length || 0} Count
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                                                    {displayStatus}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => toggleExpand(apt.id)}
                                                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 flex items-center justify-end w-full"
                                                >
                                                    {expandedRow === apt.id ? 'Hide Details' : 'View Details'}
                                                    {expandedRow === apt.id ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                                                </button>
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
                                                    <td colSpan="5" className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50">
                                                        <div className="space-y-4">
                                                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
                                                                <MessageCircle className="w-4 h-4 mr-2" />
                                                                Follow-up History
                                                            </h4>
                                                            {apt.followUps && apt.followUps.length > 0 ? (
                                                                <div className="space-y-3">
                                                                    {apt.followUps.map((followUp, index) => (
                                                                        <div key={index} className="flex gap-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400">
                                                                                {index + 1}
                                                                            </div>
                                                                            <div className="flex-1">
                                                                                <div className="flex items-center justify-between mb-1">
                                                                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                                                                        {followUp.date}
                                                                                    </span>
                                                                                </div>
                                                                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                                                                    {followUp.text}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <p className="text-sm text-gray-500 italic">No follow-up history records found.</p>
                                                            )}
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            )}
                                        </AnimatePresence>
                                    </React.Fragment>
                                );
                            })}
                            {filteredAppointments.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-10 text-center text-gray-500">
                                        No appointments found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default FollowUp;
