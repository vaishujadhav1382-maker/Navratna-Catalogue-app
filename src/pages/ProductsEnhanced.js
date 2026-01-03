import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Upload, TrendingDown, Award, DollarSign, Package as PackageIcon, X, Edit2, Trash2, RefreshCw, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const ProductsEnhanced = () => {
  const { products, productsLoading, fetchProducts, addProduct, updateProduct, deleteProduct, deleteAllProducts, importProductsFromExcel, companies, categories, subcategories, deleteCompanyHierarchy, deleteCategoryHierarchy, deleteSubcategoryHierarchy } = useApp();
  
  // Filter states
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  // New: Filter for products added this month
  const [filterThisMonth, setFilterThisMonth] = useState(false);

  // Custom dropdown open states
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isSubcategoryDropdownOpen, setIsSubcategoryDropdownOpen] = useState(false);

  // Extra options added from filter plus buttons (client-side only)
  const [customCompanies, setCustomCompanies] = useState([]); // string[]
  const [customCategories, setCustomCategories] = useState({}); // { [company]: string[] }
  const [customSubcategories, setCustomSubcategories] = useState({}); // { `${company}|${category}`: string[] }
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const fileInputRef = useRef(null);
  const handleRefresh = async () => {
    await fetchProducts();
    setSelectedCompany('');
    setSelectedCategory('');
    setSelectedSubcategory('');
    setCustomCompanies([]);
    setCustomCategories({});
    setCustomSubcategories({});
  };
  
  const [formData, setFormData] = useState({
    company: '',
    category: '',
    subcategory: '',
    name: '',
    mrp: '',
    price: '',
    minPrice: '',
    incentive: '',
  });

  // Available options for cascading filters (base lists + products + custom additions)
  const availableCompanies = useMemo(() => {
    const fromProducts = Array.from(new Set(products.map(p => p.company).filter(Boolean)));
    const all = Array.from(new Set([...(companies || []), ...fromProducts, ...customCompanies]));
    return all.sort();
  }, [products, companies, customCompanies]);

  const availableCategories = useMemo(() => {
    if (!selectedCompany) return [];
    const fromProducts = Array.from(
      new Set(
        products
          .filter(p => p.company === selectedCompany)
          .map(p => p.category)
          .filter(Boolean)
      )
    );
    const base = categories || [];
    const customForCompany = customCategories[selectedCompany] || [];
    const all = Array.from(new Set([...base, ...fromProducts, ...customForCompany]));
    return all.sort();
  }, [products, categories, selectedCompany, customCategories]);

  const availableSubcategories = useMemo(() => {
    if (!selectedCompany || !selectedCategory) return [];
    const fromProducts = Array.from(
      new Set(
        products
          .filter(p => p.company === selectedCompany && p.category === selectedCategory)
          .map(p => p.subcategory)
          .filter(Boolean)
      )
    );
    const key = `${selectedCompany}|${selectedCategory}`;
    const base = subcategories[selectedCategory] || [];
    const customForPair = customSubcategories[key] || [];
    const all = Array.from(new Set([...base, ...fromProducts, ...customForPair]));
    return all.sort();
  }, [products, subcategories, selectedCompany, selectedCategory, customSubcategories]);

  // Filter products based on selections and "this month" filter
  const filteredProducts = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    return products.filter(product => {
      if (selectedCompany && product.company !== selectedCompany) return false;
      if (selectedCategory && product.category !== selectedCategory) return false;
      // Smart subcategory matching - handle variations like "LED TV" matching "LED"
      if (selectedSubcategory && product.subcategory && !(
        product.subcategory.toLowerCase() === selectedSubcategory.toLowerCase() ||
        product.subcategory.toLowerCase().includes(selectedSubcategory.toLowerCase()) ||
        selectedSubcategory.toLowerCase().includes(product.subcategory.toLowerCase())
      )) return false;
      // New: filter for this month
      if (filterThisMonth) {
        let createdAt = product.createdAt;
        // Firestore Timestamp object
        if (createdAt && typeof createdAt === 'object' && typeof createdAt.seconds === 'number') {
          createdAt = new Date(createdAt.seconds * 1000);
        } else if (createdAt && createdAt.toDate) {
          createdAt = createdAt.toDate();
        } else if (typeof createdAt === 'string' || typeof createdAt === 'number') {
          createdAt = new Date(createdAt);
        }
        if (!(createdAt instanceof Date) || isNaN(createdAt)) return false;
        if (createdAt.getFullYear() !== thisYear || createdAt.getMonth() !== thisMonth) return false;
      }
      return true;
    });
  }, [products, selectedCompany, selectedCategory, selectedSubcategory, filterThisMonth]);
  // New: Calculate average incentive for this month's filtered products
  const thisMonthProducts = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    return products.filter(product => {
      let createdAt = product.createdAt;
      if (createdAt && typeof createdAt === 'object' && typeof createdAt.seconds === 'number') {
        createdAt = new Date(createdAt.seconds * 1000);
      } else if (createdAt && createdAt.toDate) {
        createdAt = createdAt.toDate();
      } else if (typeof createdAt === 'string' || typeof createdAt === 'number') {
        createdAt = new Date(createdAt);
      }
      if (!(createdAt instanceof Date) || isNaN(createdAt)) return false;
      return createdAt.getFullYear() === thisYear && createdAt.getMonth() === thisMonth;
    });
  }, [products]);

  const avgIncentiveThisMonth = thisMonthProducts.length
    ? Math.round(thisMonthProducts.reduce((sum, p) => sum + (parseFloat(p.incentive) || 0), 0) / thisMonthProducts.length)
    : 0;

  // Pagination for products list
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10; // products per page

  // Reset to first page whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCompany, selectedCategory, selectedSubcategory]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage]);

  // Get recommended products (based on price difference and incentive)
  const recommendedProducts = useMemo(() => {
    return [...products]
      .sort((a, b) => {
        // Sort by price difference (higher difference = better deal) and incentive
        const priceDiscountA = ((a.price || 0) - (a.minPrice || 0)) / (a.price || 1) * 100;
        const priceDiscountB = ((b.price || 0) - (b.minPrice || 0)) / (b.price || 1) * 100;
        const scoreA = priceDiscountA * 0.7 + (a.incentive || 0) * 0.3;
        const scoreB = priceDiscountB * 0.7 + (b.incentive || 0) * 0.3;
        return scoreB - scoreA;
      })
      .slice(0, 5);
  }, [products]);

  // Average price difference (discount %) for valid products
  const validDiscountProducts = useMemo(
    () => filteredProducts.filter(p => (p.price || 0) > 0 && (p.minPrice || 0) >= 0 && (p.minPrice || 0) <= (p.price || 0)),
    [filteredProducts]
  );

  const avgPriceDifference = validDiscountProducts.length
    ? Math.round(
        validDiscountProducts.reduce(
          (sum, p) => sum + (((p.price || 0) - (p.minPrice || 0)) / (p.price || 1) * 100),
          0
        ) / validDiscountProducts.length
      )
    : 0;

  // Reset dependent filters when parent changes
  const handleCompanyChange = (company) => {
    setSelectedCompany(company);
    setSelectedCategory('');
    setSelectedSubcategory('');
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setSelectedSubcategory(''); // Reset subcategory
  };

  // Custom dropdown select + delete handlers
  const handleSelectCompanyFromDropdown = (company) => {
    handleCompanyChange(company);
    setIsCompanyDropdownOpen(false);
  };

  const handleDeleteCompanyFromDropdown = async (company) => {
    if (!company) return;
    const ok = window.confirm(`Delete company "${company}" and all its categories, subcategories and products?`);
    if (!ok) return;
    try {
      await deleteCompanyHierarchy(company);
      setCustomCompanies(prev => prev.filter(c => c !== company));
      setCustomCategories(prev => {
        const updated = { ...prev };
        delete updated[company];
        return updated;
      });
      setCustomSubcategories(prev => {
        const updated = {};
        Object.keys(prev).forEach(key => {
          if (!key.startsWith(company + '|')) {
            updated[key] = prev[key];
          }
        });
        return updated;
      });
      if (selectedCompany === company) {
        setSelectedCompany('');
        setSelectedCategory('');
        setSelectedSubcategory('');
      }
    } catch (_) {
      // Error already handled in context
    } finally {
      setIsCompanyDropdownOpen(false);
    }
  };

  const handleSelectCategoryFromDropdown = (category) => {
    handleCategoryChange(category);
    setIsCategoryDropdownOpen(false);
  };

  const handleDeleteCategoryFromDropdown = async (category) => {
    if (!selectedCompany || !category) return;
    const ok = window.confirm(`Delete category "${category}" for company "${selectedCompany}" and all its subcategories/products?`);
    if (!ok) return;
    try {
      await deleteCategoryHierarchy(selectedCompany, category);
      if (selectedCategory === category) {
        setSelectedCategory('');
        setSelectedSubcategory('');
      }
    } catch (_) {
      // Error already handled in context
    } finally {
      setIsCategoryDropdownOpen(false);
    }
  };

  const handleSelectSubcategoryFromDropdown = (subcategory) => {
    setSelectedSubcategory(subcategory);
    setIsSubcategoryDropdownOpen(false);
  };

  const handleDeleteSubcategoryFromDropdown = async (subcategory) => {
    if (!selectedCompany || !selectedCategory || !subcategory) return;
    const ok = window.confirm(`Delete subcategory "${subcategory}" for ${selectedCompany} / ${selectedCategory} and all its products?`);
    if (!ok) return;
    try {
      await deleteSubcategoryHierarchy(selectedCompany, selectedCategory, subcategory);
      if (selectedSubcategory === subcategory) {
        setSelectedSubcategory('');
      }
    } catch (_) {
      // Error already handled in context
    } finally {
      setIsSubcategoryDropdownOpen(false);
    }
  };

  // Plus-button handlers for adding new options
  const handleAddCompany = () => {
    const name = window.prompt('Enter new company name');
    if (!name) return;
    setCustomCompanies(prev => (prev.includes(name) ? prev : [...prev, name]));
    setSelectedCompany(name);
    setSelectedCategory('');
    setSelectedSubcategory('');
  };

  const handleAddCategory = () => {
    if (!selectedCompany) {
      alert('Please select a company first.');
      return;
    }
    const name = window.prompt(`Enter new category name for ${selectedCompany}`);
    if (!name) return;
    setCustomCategories(prev => ({
      ...prev,
      [selectedCompany]: prev[selectedCompany]?.includes(name)
        ? prev[selectedCompany]
        : [...(prev[selectedCompany] || []), name],
    }));
    setSelectedCategory(name);
    setSelectedSubcategory('');
  };

  const handleAddSubcategory = () => {
    if (!selectedCompany || !selectedCategory) {
      alert('Please select company and category first.');
      return;
    }
    const name = window.prompt(`Enter new subcategory for ${selectedCompany} / ${selectedCategory}`);
    if (!name) return;
    const key = `${selectedCompany}|${selectedCategory}`;
    setCustomSubcategories(prev => ({
      ...prev,
      [key]: prev[key]?.includes(name) ? prev[key] : [...(prev[key] || []), name],
    }));
    setSelectedSubcategory(name);
  };

  // Plus-button handlers for adding options directly from the form
  const handleFormAddCompany = () => {
    const name = window.prompt('Enter new company name');
    if (!name) return;
    setCustomCompanies(prev => (prev.includes(name) ? prev : [...prev, name]));
    setFormData(prev => ({
      ...prev,
      company: name,
    }));
  };

  const handleFormAddCategory = () => {
    if (!formData.company) {
      alert('Please select a company first.');
      return;
    }
    const name = window.prompt(`Enter new category name for ${formData.company}`);
    if (!name) return;
    setCustomCategories(prev => ({
      ...prev,
      [formData.company]: prev[formData.company]?.includes(name)
        ? prev[formData.company]
        : [...(prev[formData.company] || []), name],
    }));
    setFormData(prev => ({
      ...prev,
      category: name,
      subcategory: '',
    }));
  };

  const handleFormAddSubcategory = () => {
    if (!formData.company || !formData.category) {
      alert('Please select company and category first.');
      return;
    }
    const name = window.prompt(`Enter new subcategory for ${formData.company} / ${formData.category}`);
    if (!name) return;
    const key = `${formData.company}|${formData.category}`;
    setCustomSubcategories(prev => ({
      ...prev,
      [key]: prev[key]?.includes(name) ? prev[key] : [...(prev[key] || []), name],
    }));
    setFormData(prev => ({
      ...prev,
      subcategory: name,
    }));
  };

  // Product modal handlers
  const handleOpenModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        company: product.company || '',
        category: product.category || '',
        subcategory: product.subcategory || '',
        name: product.name ?? '',
        mrp: (product.mrp !== undefined && product.mrp !== null) ? product.mrp : '',
        price: product.price ?? '',
        minPrice: product.minPrice ?? '',
        incentive: product.incentive ?? '',
      });
    } else {
      setEditingProduct(null);
      setFormData({
        company: '',
        category: '',
        subcategory: '',
        name: '',
        mrp: '',
        price: '',
        minPrice: '',
        incentive: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

 const handleSubmit = async (e) => {
  e.preventDefault();
  const productData = {
    company: formData.company,
    category: formData.category,
    subcategory: formData.subcategory,
    name: formData.name,
    price: parseFloat(formData.price) || 0,
    minPrice: parseFloat(formData.minPrice) || 0,
    incentive: parseFloat(formData.incentive) || 0,
    mrp: parseFloat(formData.mrp) || 0, // ADD THIS LINE
  };
  
  try {
    if (editingProduct) {
      await updateProduct(editingProduct.id, productData);
    } else {
      await addProduct(productData);
    }
    handleCloseModal();
  } catch (err) {
    alert('Error saving product. Please try again.');
  }
};

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      deleteProduct(id);
    }
  };

  // const handleDeleteAllData = async () => {
  //   const confirmDelete = window.confirm(
  //     'Are you sure you want to delete ALL products? This action cannot be undone.'
  //   );
  //   if (confirmDelete) {
  //     const finalConfirm = window.confirm(
  //       'This will permanently delete all products from the database. Click OK to confirm.'
  //     );
  //     if (finalConfirm) {
  //       try {
  //         await deleteAllProducts();
  //         alert('All products have been deleted successfully.');
  //       } catch (error) {
  //         alert('Failed to delete all products. Please try again.');
  //         console.error('Delete all error:', error);
  //       }
  //     }
  //   }
  // };

  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        // Helper function to find column value with multiple possible names
        const findValue = (row, possibleNames) => {
          for (const name of possibleNames) {
            if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
              return row[name];
            }
          }
          return null;
        };

       const excelProducts = data.map(row => ({
  company: findValue(row, ['Company', 'company', 'Brand', 'brand', 'Manufacturer', 'manufacturer']) || 'Unknown',
  category: findValue(row, ['Category', 'category', 'Type', 'type', 'Product Type']) || 'Unknown',
  subcategory: findValue(row, ['Subcategory', 'subcategory', 'Sub Category', 'sub category', 'Subtype']) || 'Unknown',
  name: findValue(row, ['Product Name', 'product name', 'Name', 'name', 'Product', 'product']) || 'Unknown Product',
  mrp: parseFloat(findValue(row, ['MRP', 'mrp', 'Maximum Retail Price', 'maximum retail price', 'List Price', 'list price'])) || 0, // ADD THIS
  price: parseFloat(findValue(row, ['Price', 'price', 'Cost', 'cost', 'Amount'])) || 0,
  minPrice: parseFloat(findValue(row, ['Min Price', 'min price', 'Minimum Price', 'minimum price', 'Bottom Price', 'bottom price', 'MinPrice', 'minPrice', 'Base Price', 'base price', 'Lowest Price', 'lowest price'])) || 0,
  incentive: parseFloat(findValue(row, ['Incentive', 'incentive', 'Commission', 'commission', 'Bonus'])) || 0,
}));
        
        const count = importProductsFromExcel(excelProducts);
        alert(`Successfully imported ${count} products from Excel!`);
      };
      reader.readAsBinaryString(file);
    }
  };

 const handleDownloadData = () => {
  if (!products || products.length === 0) {
    alert('No products to download.');
    return;
  }

  const headers = ['Company', 'Category', 'Subcategory', 'Product Name', 'MRP', 'Price', 'Bottom Price', 'Incentive']; // ADDED MRP
  const rows = products.map(p => [
    p.company || '',
    p.category || '',
    p.subcategory || '',
    p.name || '',
    p.mrp ?? '', // ADD THIS
    p.price ?? '',
    p.minPrice ?? '',
    p.incentive ?? '',
  ]);

    const csvContent = [headers, ...rows]
      .map(row => row
        .map(value => {
          const str = value === null || value === undefined ? '' : String(value);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '""') + '"';
          }
          return str;
        })
        .join(','),
      )
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'products-export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Get available categories/subcategories for the form (respect custom additions)
  const formAvailableCategories = useMemo(() => {
    if (!formData.company) return categories || [];
    const base = categories || [];
    const customForCompany = customCategories[formData.company] || [];
    return Array.from(new Set([...base, ...customForCompany]));
  }, [categories, customCategories, formData.company]);

  const formAvailableSubcategories = useMemo(() => {
    if (!formData.company || !formData.category) return [];
    const base = subcategories[formData.category] || [];
    const key = `${formData.company}|${formData.category}`;
    const customForPair = customSubcategories[key] || [];
    return Array.from(new Set([...base, ...customForPair]));
  }, [formData.company, formData.category, subcategories, customSubcategories]);

  if (productsLoading && products.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {productsLoading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-40">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
            <p className="text-gray-600 dark:text-gray-400">Processing...</p>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl px-5 py-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            Product Management
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Select filters to view products by company, category, and type
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleOpenModal()}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Add Product</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors flex items-center space-x-2"
          >
            <Upload className="w-5 h-5" />
            <span>Import Excel</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center space-x-2"
          >
            <RefreshCw className="w-5 h-5" />
            <span>Refresh</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleDownloadData}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors flex items-center space-x-2"
          >
            <Download className="w-5 h-5" />
            <span>Download Data</span>
          </motion.button>
          {/* <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleDeleteAllData}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors flex items-center space-x-2"
          >
            <Trash2 className="w-5 h-5" />
            <span>Delete All Data</span>
          </motion.button> */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleExcelUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Filter Section */}
      <div className="card">
        {/* New: This Month Filter Toggle */}
        <div className="mb-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setFilterThisMonth(v => !v)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors border focus:outline-none focus:ring-2 focus:ring-blue-400/50 ${filterThisMonth ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600'}`}
          >
            {filterThisMonth ? 'Showing only products added this month' : 'Show only products added this month'}
          </button>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Filter Products
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Company Filter - custom dropdown with hover delete */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Company
              </span>
              <button
                type="button"
                onClick={handleAddCompany}
                className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs hover:bg-primary-600"
                title="Add Company"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsCompanyDropdownOpen(prev => !prev)}
                className="input-field w-full flex items-center justify-between"
              >
                <span>{selectedCompany || 'Select Company'}</span>
                <span className="ml-2 text-gray-400">▾</span>
              </button>
              {isCompanyDropdownOpen && (
                <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
                  {availableCompanies.length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No companies</div>
                  )}
                  {availableCompanies.map(company => (
                    <div
                      key={company}
                      className="flex items-center justify-between px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 group"
                    >
                      <button
                        type="button"
                        className="flex-1 text-left text-gray-800 dark:text-gray-100"
                        onClick={() => handleSelectCompanyFromDropdown(company)}
                      >
                        {company}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCompanyFromDropdown(company);
                        }}
                        className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[10px] opacity-0 group-hover:opacity-100 hover:bg-red-600"
                        title="Delete this company"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Category Filter - custom dropdown with hover delete */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Category
              </span>
              <button
                type="button"
                onClick={handleAddCategory}
                className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs hover:bg-primary-600"
                title="Add Category for selected company"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => selectedCompany && setIsCategoryDropdownOpen(prev => !prev)}
                className="input-field w-full flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!selectedCompany}
              >
                <span>{selectedCategory || 'Select Category'}</span>
                <span className="ml-2 text-gray-400">▾</span>
              </button>
              {isCategoryDropdownOpen && selectedCompany && (
                <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
                  {availableCategories.length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No categories</div>
                  )}
                  {availableCategories.map(category => (
                    <div
                      key={category}
                      className="flex items-center justify-between px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 group"
                    >
                      <button
                        type="button"
                        className="flex-1 text-left text-gray-800 dark:text-gray-100"
                        onClick={() => handleSelectCategoryFromDropdown(category)}
                      >
                        {category}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCategoryFromDropdown(category);
                        }}
                        className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[10px] opacity-0 group-hover:opacity-100 hover:bg-red-600"
                        title="Delete this category"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Subcategory Filter - custom dropdown with hover delete */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Subcategory
              </span>
              <button
                type="button"
                onClick={handleAddSubcategory}
                className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Add Subcategory for selected company & category"
                disabled={!selectedCompany || !selectedCategory}
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => selectedCategory && setIsSubcategoryDropdownOpen(prev => !prev)}
                className="input-field w-full flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!selectedCategory}
              >
                <span>{selectedSubcategory || 'Select Subcategory'}</span>
                <span className="ml-2 text-gray-400">▾</span>
              </button>
              {isSubcategoryDropdownOpen && selectedCategory && (
                <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
                  {availableSubcategories.length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No subcategories</div>
                  )}
                  {availableSubcategories.map(sub => (
                    <div
                      key={sub}
                      className="flex items-center justify-between px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 group"
                    >
                      <button
                        type="button"
                        className="flex-1 text-left text-gray-800 dark:text-gray-100"
                        onClick={() => handleSelectSubcategoryFromDropdown(sub)}
                      >
                        {sub}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSubcategoryFromDropdown(sub);
                        }}
                        className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[10px] opacity-0 group-hover:opacity-100 hover:bg-red-600"
                        title="Delete this subcategory"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Clear Filters */}
        {(selectedCompany || selectedCategory || selectedSubcategory) && (
          <button
            onClick={() => {
              setSelectedCompany('');
              setSelectedCategory('');
              setSelectedSubcategory('');
            }}
            className="mt-4 text-sm text-primary hover:text-primary-600 font-medium"
          >
            Clear All Filters
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* New: Avg Incentive for this month */}
                <div className="card bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border border-orange-200 dark:border-orange-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-orange-600 dark:text-orange-400 mb-1">Avg Incentive (This Month)</p>
                      <h3 className="text-3xl font-bold text-orange-700 dark:text-orange-300">
                        ₹{avgIncentiveThisMonth}
                      </h3>
                    </div>
                    <Award className="w-12 h-12 text-orange-500 opacity-50" />
                  </div>
                </div>
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">Showing Products</p>
              <h3 className="text-3xl font-bold text-blue-700 dark:text-blue-300">{filteredProducts.length}</h3>
            </div>
            <PackageIcon className="w-12 h-12 text-blue-500 opacity-50" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 dark:text-purple-400 mb-1">Total Value</p>
              <h3 className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                ₹{(filteredProducts.reduce((sum, p) => sum + (p.price || 0), 0) / 1000).toFixed(0)}k
              </h3>
            </div>
            <DollarSign className="w-12 h-12 text-purple-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Products List */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {selectedCompany || selectedCategory || selectedSubcategory ? 'Filtered Products' : 'All Products'}
        </h3>
        
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <PackageIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No products found with selected filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            {paginatedProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {/* Sr. No */}
                <div className="w-10 h-10 flex items-center justify-center bg-primary-100 dark:bg-primary-900/40 text-primary dark:text-primary-300 font-semibold rounded-full flex-shrink-0">
                  {index + 1}
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                    {product.name}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {product.company} • {product.category} • {product.subcategory}
                  </p>
                </div>

                {/* Price Info and Action Buttons */}
                <div className="flex flex-col gap-2 items-end">
                  {/* Price Information */}
                  <div className="text-right space-y-1 mb-2">
                    {/* MRP removed as per request */}
                    <div className="text-xs">
                      <span className="text-gray-600 dark:text-gray-400">Sales Price: </span>
                      <span className="font-bold text-green-600 dark:text-green-400">
                        ₹{(product.price !== undefined && product.price !== null && product.price !== '' ? Number(product.price).toLocaleString() : '—')}
                      </span>
                    </div>

                    <div className="text-xs">
  <span className="text-gray-600 dark:text-gray-400">MRP: </span>
  <span className="font-semibold text-gray-500 dark:text-gray-400 line-through">
    ₹{(product.mrp !== undefined && product.mrp !== null && product.mrp !== '' && !isNaN(product.mrp))
      ? Number(product.mrp).toLocaleString()
      : '—'}
  </span>
</div>

                    <div className="text-xs">
                      <span className="text-gray-600 dark:text-gray-400">Best Price: </span>
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        ₹{product.minPrice !== undefined && product.minPrice !== null && product.minPrice !== '' && !isNaN(product.minPrice)
                          ? Number(product.minPrice).toLocaleString()
                          : ''}
                      </span>
                    </div>
                    <div className="text-xs">
                      <span className="text-gray-600 dark:text-gray-400">Incentive: </span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        ₹{(product.incentive !== undefined && product.incentive !== null && product.incentive !== '' ? Number(product.incentive).toLocaleString() : '—')}
                      </span>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleOpenModal(product)}
                      className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                      title="Edit Product"
                    >
                      <Edit2 className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleDelete(product.id)}
                      className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                      title="Delete Product"
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
            {/* Pagination Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Page {currentPage} of {totalPages} 
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-500">
                  Showing {paginatedProducts.length} of {filteredProducts.length} products
                </span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Product Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 transition-opacity bg-black bg-opacity-50 z-40"
                onClick={handleCloseModal}
              />

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative z-50 inline-block align-bottom bg-white dark:bg-gray-800 rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full"
              >
                <form onSubmit={handleSubmit}>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {editingProduct ? 'Edit Product' : 'Add New Product'}
                      </h3>
                      <button
                        type="button"
                        onClick={handleCloseModal}
                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Company */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Company
                          </label>
                          <button
                            type="button"
                            onClick={handleFormAddCompany}
                            className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs hover:bg-primary-600"
                            title="Add Company"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <select
                          value={formData.company}
                          onChange={(e) => setFormData({ ...formData, company: e.target.value, category: '', subcategory: '' })}
                          className="input-field"
                          required
                        >
                          <option value="">Select Company</option>
                          {Array.from(new Set([...(companies || []), ...customCompanies])).map(company => (
                            <option key={company} value={company}>{company}</option>
                          ))}
                        </select>
                      </div>

                      {/* Category */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Category
                          </label>
                          <button
                            type="button"
                            onClick={handleFormAddCategory}
                            className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Add Category for selected company"
                            disabled={!formData.company}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <select
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value, subcategory: '' })}
                          className="input-field"
                          disabled={!formData.company}
                        >
                          <option value="">Select Category</option>
                          {formAvailableCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      {/* Subcategory */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Subcategory
                          </label>
                          <button
                            type="button"
                            onClick={handleFormAddSubcategory}
                            className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Add Subcategory for selected company & category"
                            disabled={!formData.company || !formData.category}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <select
                          value={formData.subcategory}
                          onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                          className="input-field"
                          disabled={!formData.category}
                        >
                          <option value="">Select Subcategory</option>
                          {formAvailableSubcategories.map(sub => (
                            <option key={sub} value={sub}>{sub}</option>
                          ))}
                        </select>
                      </div>

                      {/* Product Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Product Name
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="input-field"
                          placeholder="Enter product name"
                          required
                        />
                      </div>

                      {/* MRP */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          MRP (₹)
                        </label>
                        <input
                          type="number"
                          value={formData.mrp}
                          onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                          className="input-field"
                          placeholder="35000"
                          required
                        />
                      </div>
                      {/* Sales Price */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Sales Price (₹)
                        </label>
                        <input
                          type="number"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          className="input-field"
                          placeholder="30000"
                          required
                        />
                      </div>
                      {/* Best Price */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Best Price (₹)
                        </label>
                        <input
                          type="number"
                          value={formData.minPrice}
                          onChange={(e) => setFormData({ ...formData, minPrice: e.target.value })}
                          className="input-field"
                          placeholder="24000"
                          required
                        />
                      </div>
                      {/* Incentive */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Incentive (₹) <span className="text-xs text-gray-400">(optional)</span>
                        </label>
                        <input
                          type="number"
                          value={formData.incentive}
                          onChange={(e) => setFormData({ ...formData, incentive: e.target.value })}
                          className="input-field"
                          placeholder="1500"
                        />
                      </div>

                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 flex justify-end gap-3">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleCloseModal}
                      className="btn-secondary"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      type="submit"
                      whileHover={{ scale: productsLoading ? 1 : 1.05 }}
                      whileTap={{ scale: productsLoading ? 1 : 0.95 }}
                      className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={productsLoading}
                    >
                      {productsLoading
                        ? 'Processing...'
                        : editingProduct ? 'Update Product' : 'Add Product'}
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProductsEnhanced;
