import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Package, DollarSign, Star, RefreshCw, Megaphone, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { collection, getDocs, query, collectionGroup } from 'firebase/firestore';
import { db } from '../firebase';

const Dashboard = () => {
  const { employees, products, employeesLoading, productsLoading, fetchEmployees, fetchProducts } = useApp();
  const [appointments, setAppointments] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [salesmen, setSalesmen] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Get salesman name from ID
  const getSalesmanNameById = useCallback((salesmanId) => {
    if (!salesmanId) return 'Unassigned';
    const salesman = salesmen.find(s => s.id === salesmanId);
    return salesman ? salesman.name : 'Unknown';
  }, [salesmen]);

    // Fetch appointments for follow-up stats
    useEffect(() => {
      let isMounted = true;
      const fetchAppointments = async () => {
        setAppointmentsLoading(true);
        try {
          const querySnapshot = await getDocs(collectionGroup(db, 'appointments'));
          const fetchedData = querySnapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            const salesmanName = getSalesmanNameById(data.assignedTo);
            
            return { 
              id: docSnap.id, 
              ...data,
              salesmanName
            };
          });
          if (isMounted) setAppointments(fetchedData);
        } catch (error) {
          if (isMounted) setAppointments([]);
        } finally {
          if (isMounted) setAppointmentsLoading(false);
        }
      };
      fetchAppointments();
      return () => { isMounted = false; };
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

  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  
  // Set default date to yesterday
  const getYesterdayDate = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().slice(0, 10);
  };
  
  const [selectedDate, setSelectedDate] = useState(getYesterdayDate()); // YYYY-MM-DD
  const [offers, setOffers] = useState([]);
  // const [offersLoading, setOffersLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [allOfferImages, setAllOfferImages] = useState([]);

  // Reset pagination when date changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate]);

  // Fetch offers when selectedMonth changes
  useEffect(() => {
    let isMounted = true;

    const fetchOffers = async () => {
      // setOffersLoading(true);
      try {
        const [year, month] = selectedMonth.split('-');
        const docId = `${year}-${month}`;

        // Path: offers/{YYYY-MM}/items
        const itemsRef = collection(db, 'offers', docId, 'items');
        const q = query(itemsRef);

        const querySnapshot = await getDocs(q);
        const offersData = [];
        const slidesData = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          offersData.push({ id: doc.id, ...data });

          // Process Incentive Images
          if (data.imageUrls && Array.isArray(data.imageUrls)) {
            data.imageUrls.forEach(url => {
              slidesData.push({
                url,
                type: 'Incentive',
                title: data.title,
                description: data.description
              });
            });
          }

          // Process Focus Product Images
          if (data.img2Urls && Array.isArray(data.img2Urls)) {
            data.img2Urls.forEach(url => {
              slidesData.push({
                url,
                type: 'Focus Product',
                title: data.title,
                description: data.description
              });
            });
          }
        });

        if (isMounted) {
          setOffers(offersData);
          setAllOfferImages(slidesData);
          setCurrentImageIndex(0); // Reset slider
        }
      } catch (error) {
        console.error("Error fetching offers:", error);
        if (isMounted) {
          setOffers([]);
          setAllOfferImages([]);
        }
      } finally {
        if (isMounted) {
          // setOffersLoading(false);
        }
      }
    };

    fetchOffers();

    return () => {
      isMounted = false;
    };
  }, [selectedMonth]);

  // Image Slider Auto-play
  useEffect(() => {
    if (allOfferImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % allOfferImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [allOfferImages.length]);

  const handleRefresh = async () => {
    await Promise.all([fetchEmployees(), fetchProducts()]);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % allOfferImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + allOfferImages.length) % allOfferImages.length);
  };

  const isLoading = employeesLoading || productsLoading;

  const getMonthName = (dateString) => {
    const date = new Date(dateString + '-01');
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  // Helper function to convert createdDate (DD/MM/YYYY) to YYYY-MM-DD
  const convertCreatedDateToYYYYMMDD = (createdDate) => {
    if (!createdDate) return '';
    const [day, month, year] = createdDate.split('/');
    if (!day || !month || !year) return '';
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  // Helper function to get purchase date from appointment
  const getPurchaseDate = (apt) => {
    if (!apt) return 'N/A';
    
    // Check if any product has a purchase date
    if (apt.products && Array.isArray(apt.products)) {
      for (let product of apt.products) {
        if (product.purchaseDate) {
          return product.purchaseDate;
        }
      }
    }
    
    // Check if any follow-up mentions purchase
    if (apt.followUps && Array.isArray(apt.followUps)) {
      const lastFollowUp = apt.followUps[apt.followUps.length - 1];
      if (lastFollowUp && lastFollowUp.status && (lastFollowUp.status.toLowerCase().includes('purchased') || lastFollowUp.status.toLowerCase().includes('purchase'))) {
        return lastFollowUp.date || 'N/A';
      }
    }
    
    // Check appointment status
    if (apt.status && (apt.status.toLowerCase().includes('purchased') || apt.status.toLowerCase().includes('complete'))) {
      // Find the date of the last follow-up or creation date
      if (apt.followUps && apt.followUps.length > 0) {
        return apt.followUps[apt.followUps.length - 1].date || 'N/A';
      }
    }
    
    return 'N/A';
  };

  // Helper function to get cancelled date from appointment
  const getCancelledDate = (apt) => {
    if (!apt) return 'N/A';
    
    // Check if any product is cancelled
    if (apt.products && Array.isArray(apt.products)) {
      for (let product of apt.products) {
        if (product.status && product.status.toLowerCase().includes('cancel')) {
          return product.cancelledDate || 'N/A';
        }
      }
    }
    
    // Check if appointment is cancelled
    if (apt.status && apt.status.toLowerCase().includes('cancel')) {
      // Find the date of cancellation from follow-ups
      if (apt.followUps && apt.followUps.length > 0) {
        for (let i = apt.followUps.length - 1; i >= 0; i--) {
          const fu = apt.followUps[i];
          if (fu.status && fu.status.toLowerCase().includes('cancel')) {
            return fu.date || 'N/A';
          }
        }
        return apt.followUps[apt.followUps.length - 1].date || 'N/A';
      }
    }
    
    return 'N/A';
  };

  // Filter followups for selected date
  const followupsForSelectedDate = appointments.filter(a => {
    const aptDate = convertCreatedDateToYYYYMMDD(a.createdDate);
    return aptDate === selectedDate;
  });

  // Calculate pending and purchased for selected date
  const pendingOnSelectedDate = followupsForSelectedDate.filter(a => {
    const status = (a.status || '').toLowerCase().trim();
    // Pending: status is exactly 'pending'
    return status === 'pending';
  }).length;

  const purchasedOnSelectedDate = followupsForSelectedDate.filter(a => {
    const status = (a.status || '').toLowerCase().trim();
    // Purchased: status is exactly 'purchased'
    return status === 'purchased';
  }).length;

  if ((isLoading && employees.length === 0 && products.length === 0) || appointmentsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // --- Monthly and advanced stats ---
  // Helper: get month (YYYY-MM) from date
  const getMonthFromDate = (date) => {
    if (!date) return '';
    let d = date;
    // Firestore Timestamp (has toDate method)
    if (d && typeof d.toDate === 'function') {
      d = d.toDate();
    }
    // If it's an object with seconds/nanoseconds (Firestore Timestamp plain object)
    if (d && typeof d === 'object' && d.seconds && d.nanoseconds) {
      d = new Date(d.seconds * 1000);
    }
    // If it's a string
    if (typeof d === 'string') {
      d = new Date(d);
    }
    if (!(d instanceof Date) || isNaN(d)) return '';
    return d.toISOString().slice(0, 7); // YYYY-MM
  };


  // Products added this month
  const productsThisMonth = products.filter(p => getMonthFromDate(p.createdAt) === selectedMonth);
  // const totalProductsMonth = productsThisMonth.length;
  const totalProducts = products.length;

  // --- Follow-up stats from appointments ---
  // Only consider appointments created in the selected month
  // const appointmentsThisMonth = appointments.filter(a => {
  //   if (!a.createdDate) return false;
  //   // createdDate may be in DD/MM/YYYY, convert to YYYY-MM
  //   const [day, month, year] = a.createdDate.split('/');
  //   if (!day || !month || !year) return false;
  //   const aptMonth = `${year}-${month.padStart(2, '0')}`;
  //   return aptMonth === selectedMonth;
  // });
  // Pending follow-ups: status is 'Pending' and no followUp is 'Complete' or 'Purchased'
  // const pendingFollowUps = appointmentsThisMonth.filter(a => {
  //   if ((a.status || '').toLowerCase() !== 'pending') return false;
  //   if (!Array.isArray(a.followUps) || a.followUps.length === 0) return true;
  //   // If any followUp has status 'Complete' or 'Purchased', not pending
  //   return !a.followUps.some(fu => {
  //     const s = (fu.status || '').toLowerCase();
  //     return s === 'complete' || s === 'purchased';
  //   });
  // }).length;
  // Purchased this month: status is 'Purchased' (case-insensitive)
  // const purchasedCount = appointmentsThisMonth.filter(a => (a.status || '').toLowerCase() === 'purchased').length;

  // Total incentives for this month
  // const totalIncentivesMonth = productsThisMonth.reduce((sum, p) => sum + (p.incentive || 0), 0);

  // Top employee of the month (by number of products added, fallback to '-')
  const employeeProductMap = {};
  productsThisMonth.forEach(p => {
    if (p.employeeId) {
      employeeProductMap[p.employeeId] = (employeeProductMap[p.employeeId] || 0) + 1;
    }
  });
  let topEmployee = '-';
  let topEmployeeCount = 0;
  if (Object.keys(employeeProductMap).length > 0) {
    const topId = Object.entries(employeeProductMap).sort((a, b) => b[1] - a[1])[0][0];
    const emp = employees.find(e => e.id === topId);
    topEmployee = emp ? emp.name : topId;
    topEmployeeCount = employeeProductMap[topId];
  }

  // Average rating (all time)
  // const ratedValues = products.map(p => Number(p.rating)).filter(v => Number.isFinite(v) && v > 0);
  // const averageRating = ratedValues.length
  //   ? (ratedValues.reduce((sum, value) => sum + value, 0) / ratedValues.length).toFixed(1)
  //   : '0.0';

  // --- Dashboard stat cards ---
  const stats = [
    { title: 'Total Employees', value: employees.length, icon: Users, color: 'from-blue-500 to-blue-600' },
    { title: 'Pending Follow-ups', value: pendingOnSelectedDate, icon: RefreshCw, color: 'from-pink-500 to-pink-600' },
    { title: 'Purchased This Date', value: purchasedOnSelectedDate, icon: DollarSign, color: 'from-green-500 to-green-600' },
    { title: 'Total Products', value: totalProducts, icon: Package, color: 'from-gray-500 to-gray-600' },
    { title: 'Top Employee (Month)', value: topEmployee !== '-' ? `${topEmployee} (${topEmployeeCount})` : '-', icon: Star, color: 'from-yellow-400 to-yellow-500' },
  ];

  const currentSlide = allOfferImages[currentImageIndex];

  return (
    <div className="space-y-6">
      {/* Header with Month Selection */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            Dashboard Overview
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Offers for <span className="font-semibold text-primary">{getMonthName(selectedMonth)}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-primary/50 outline-none"
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </motion.button>
        </div>
      </div>

      {/* Offers Ticker */}
      {offers.length > 0 && (
        <div className="relative bg-gradient-to-r from-red-600 to-pink-600 rounded-xl overflow-hidden shadow-lg border border-red-500/20">
          <div className="absolute left-0 top-0 bottom-0 bg-red-700 z-10 px-4 flex items-center shadow-md">
            <Megaphone className="w-5 h-5 text-white animate-bounce" />
            <span className="font-bold text-white ml-2 text-sm uppercase tracking-wider">Offers</span>
          </div>
          <div className="py-3 items-center flex overflow-hidden whitespace-nowrap ml-28 md:ml-32">
            <div className="animate-marquee inline-block text-white font-medium text-sm">
              {offers.map((offer, index) => (
                <span key={offer.id} className="mx-8 inline-flex items-center">
                  {offer.title}: {offer.description}
                  {index !== offers.length - 1 && <span className="mx-4 text-white/40">|</span>}
                </span>
              ))}
              {/* Duplicate for seamless loop */}
              {offers.map((offer, index) => (
                <span key={`dup-${offer.id}`} className="mx-8 inline-flex items-center">
                  {offer.title}: {offer.description}
                  {index !== offers.length - 1 && <span className="mx-4 text-white/40">|</span>}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
      <style>{`
        .animate-marquee { animation: marquee 30s linear infinite; }
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
      `}</style>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="card bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{stat.title}</p>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</h3>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white shadow-lg`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Date Calendar and Followups Section */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700"
        >
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Select Date
          </h2>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-primary/50 outline-none text-gray-900 dark:text-white"
          />
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-gray-600 dark:text-gray-300 font-semibold mb-2">
              Followups on:
            </p>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {new Date(selectedDate).toLocaleDateString('en-US', { 
                weekday: 'short', 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              })}
            </p>
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-3 pb-3 border-b border-blue-200 dark:border-blue-700">
              Total: <span className="font-bold">{followupsForSelectedDate.length}</span>
            </p>
            
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600 dark:text-gray-400">Pending Follow-ups</span>
                <span className="text-lg font-bold text-pink-600 dark:text-pink-400">{pendingOnSelectedDate}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600 dark:text-gray-400">Purchased This Date</span>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">{purchasedOnSelectedDate}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Followups Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
        >
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Followup Details
            </h2>
          </div>
          
          {followupsForSelectedDate.length > 0 ? (
            <div className="flex flex-col">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white">Sr</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white">Number</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white">First Visit Date</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white">Salesman</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white">Follow Ups</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {followupsForSelectedDate.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((apt, index) => {
                      const firstProduct = apt.products && apt.products.length > 0 
                        ? (apt.products[0].name || apt.products[0].productName || 'N/A')
                        : 'N/A';
                      
                      const followUpCount = apt.followUps && Array.isArray(apt.followUps) 
                        ? apt.followUps.length 
                        : 0;

                      const purchaseDate = getPurchaseDate(apt);
                      const cancelledDate = getCancelledDate(apt);
                      const srNumber = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;

                      // Determine which date to show based on status
                      let displayDate = 'N/A';
                      let dateColor = 'text-gray-400';

                      const statusLower = (apt.status || '').toLowerCase();
                      if (statusLower === 'purchased' && purchaseDate !== 'N/A') {
                        displayDate = purchaseDate;
                        dateColor = 'font-semibold text-green-600 dark:text-green-400';
                      } else if ((statusLower.includes('cancel') || statusLower.includes('cancelled')) && cancelledDate !== 'N/A') {
                        displayDate = cancelledDate;
                        dateColor = 'font-semibold text-red-600 dark:text-red-400';
                      }

                      return (
                        <tr key={apt.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                            {srNumber}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                            {apt.customerName || 'Unknown'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                            {apt.customerMobile || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                            {apt.createdDate || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                            {firstProduct}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                            {apt.salesmanName || 'Unassigned'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-semibold">
                              {followUpCount}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                            <span className={dateColor}>
                              {displayDate}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                              apt.status === 'Purchased' 
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                                : apt.status === 'Pending'
                                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            }`}>
                              {apt.status || 'Unknown'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Showing <span className="font-semibold">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-semibold">{Math.min(currentPage * ITEMS_PER_PAGE, followupsForSelectedDate.length)}</span> of <span className="font-semibold">{followupsForSelectedDate.length}</span> records
                </div>
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </motion.button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.ceil(followupsForSelectedDate.length / ITEMS_PER_PAGE) }, (_, i) => i + 1).map(page => (
                      <motion.button
                        key={page}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === page
                            ? 'bg-primary text-white'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        {page}
                      </motion.button>
                    ))}
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(followupsForSelectedDate.length / ITEMS_PER_PAGE), prev + 1))}
                    disabled={currentPage === Math.ceil(followupsForSelectedDate.length / ITEMS_PER_PAGE)}
                    className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48">
              <div className="text-center">
                <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No followups scheduled for {new Date(selectedDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* HERO OFFERS SLIDER - Main Centerpiece */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="relative bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700"
      >
        {allOfferImages.length > 0 ? (
          <>
            {/* Main Slider */}
            <div className="relative h-[350px] lg:h-[400px] overflow-hidden bg-gray-50 dark:bg-gray-900">
              <AnimatePresence mode='wait'>
                <motion.div
                  key={currentImageIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="absolute inset-0 flex items-center justify-center p-6"
                >
                  <img
                    src={currentSlide.url}
                    alt={`${currentSlide.title} - ${currentSlide.type}`}
                    className="max-h-full max-w-full object-contain"
                  />
                </motion.div>
              </AnimatePresence>

              {/* Navigation Arrows */}
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-white p-2 rounded-full transition-colors shadow-md border border-gray-200 dark:border-gray-600"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-white p-2 rounded-full transition-colors shadow-md border border-gray-200 dark:border-gray-600"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Image Counter Badge */}
              <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg shadow-md border border-gray-200 dark:border-gray-600">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {currentImageIndex + 1} / {allOfferImages.length}
                </span>
              </div>
            </div>

            {/* Bottom Info Bar */}
            <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 lg:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Megaphone className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-primary uppercase tracking-wide">
                      {currentSlide.type}
                    </span>
                  </div>
                  <h2 className="text-lg lg:text-xl font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                    {currentSlide.title}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {currentSlide.description}
                  </p>
                </div>
              </div>

              {/* Dots Indicator */}
              <div className="flex justify-center gap-2 mt-4">
                {allOfferImages.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`transition-all duration-300 rounded-full ${idx === currentImageIndex
                      ? 'bg-primary w-8 h-2'
                      : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 w-2 h-2'
                      }`}
                  />
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="h-[350px] flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center p-8">
              <Megaphone className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No Offers Available</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">No offers with images for {getMonthName(selectedMonth)}</p>
            </div>
          </div>
        )}
      </motion.div>

      {/* COMMENTED OUT: Charts Section - Preserved for future use */}
      {/* 
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Products by Category</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Price Range</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={priceRangeData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="range" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="count" fill="#FF6600" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Stock Inventory</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={companyData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.1} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} fontSize={12} />
                <Tooltip cursor={{ fill: 'transparent' }} />
                <Bar dataKey="value" fill="#FF6600" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="xl:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 h-full flex flex-col min-h-[300px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Active Offers</h3>
              {allOfferImages.length > 0 && (
                <div className="flex space-x-1">
                  <button onClick={prevImage} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><ChevronLeft className="w-5 h-5" /></button>
                  <button onClick={nextImage} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><ChevronRight className="w-5 h-5" /></button>
                </div>
              )}
            </div>

            {allOfferImages.length > 0 ? (
              <div className="relative flex-1 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-900 group">
                <AnimatePresence mode='wait'>
                  <motion.img
                    key={currentImageIndex}
                    src={allOfferImages[currentImageIndex]}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 w-full h-full object-contain"
                    alt="Offer"
                  />
                </AnimatePresence>
                <div className="absolute bottom-2 left-0 right-0 flex justify-center space-x-1.5 z-10">
                  {allOfferImages.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`w-2 h-2 rounded-full transition-all ${idx === currentImageIndex ? 'bg-primary w-4' : 'bg-gray-300 dark:bg-gray-600'}`}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                <div className="text-center p-4">
                  <Megaphone className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No offers with images for this month</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      */}

      {/* Permanent Banner Image (Bottom) removed as requested */}
    </div>
  );
};

export default Dashboard;
