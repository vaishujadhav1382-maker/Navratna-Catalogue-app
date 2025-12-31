import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Package, DollarSign, Star, RefreshCw, Megaphone, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { collection, getDocs, query, where, collectionGroup } from 'firebase/firestore';
import { db } from '../firebase';

const Dashboard = () => {
  const { employees, products, employeesLoading, productsLoading, fetchEmployees, fetchProducts } = useApp();
  const [appointments, setAppointments] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
    // Fetch appointments for follow-up stats
    useEffect(() => {
      let isMounted = true;
      const fetchAppointments = async () => {
        setAppointmentsLoading(true);
        try {
          const querySnapshot = await getDocs(collectionGroup(db, 'appointments'));
          const fetchedData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          if (isMounted) setAppointments(fetchedData);
        } catch (error) {
          if (isMounted) setAppointments([]);
        } finally {
          if (isMounted) setAppointmentsLoading(false);
        }
      };
      fetchAppointments();
      return () => { isMounted = false; };
    }, []);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [offers, setOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [allOfferImages, setAllOfferImages] = useState([]);

  // Fetch offers when selectedMonth changes
  useEffect(() => {
    let isMounted = true;

    const fetchOffers = async () => {
      setOffersLoading(true);
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
          setOffersLoading(false);
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
  const totalProductsMonth = productsThisMonth.length;
  const totalProducts = products.length;

  // --- Follow-up stats from appointments ---
  // Only consider appointments created in the selected month
  const appointmentsThisMonth = appointments.filter(a => {
    if (!a.createdDate) return false;
    // createdDate may be in DD/MM/YYYY, convert to YYYY-MM
    const [day, month, year] = a.createdDate.split('/');
    if (!day || !month || !year) return false;
    const aptMonth = `${year}-${month.padStart(2, '0')}`;
    return aptMonth === selectedMonth;
  });
  // Pending follow-ups: status is 'Pending' and no followUp is 'Complete' or 'Purchased'
  const pendingFollowUps = appointmentsThisMonth.filter(a => {
    if ((a.status || '').toLowerCase() !== 'pending') return false;
    if (!Array.isArray(a.followUps) || a.followUps.length === 0) return true;
    // If any followUp has status 'Complete' or 'Purchased', not pending
    return !a.followUps.some(fu => {
      const s = (fu.status || '').toLowerCase();
      return s === 'complete' || s === 'purchased';
    });
  }).length;
  // Purchased this month: status is 'Purchased' (case-insensitive)
  const purchasedCount = appointmentsThisMonth.filter(a => (a.status || '').toLowerCase() === 'purchased').length;

  // Total incentives for this month
  const totalIncentivesMonth = productsThisMonth.reduce((sum, p) => sum + (p.incentive || 0), 0);

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
  const ratedValues = products.map(p => Number(p.rating)).filter(v => Number.isFinite(v) && v > 0);
  const averageRating = ratedValues.length
    ? (ratedValues.reduce((sum, value) => sum + value, 0) / ratedValues.length).toFixed(1)
    : '0.0';

  // --- Dashboard stat cards ---
  const stats = [
    { title: 'Total Employees', value: employees.length, icon: Users, color: 'from-blue-500 to-blue-600' },
    { title: 'Pending Follow-ups', value: pendingFollowUps, icon: RefreshCw, color: 'from-pink-500 to-pink-600' },
    { title: 'Purchased This Month', value: purchasedCount, icon: DollarSign, color: 'from-green-500 to-green-600' },
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
      <style jsx>{`
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
