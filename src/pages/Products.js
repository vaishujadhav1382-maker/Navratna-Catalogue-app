import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit2, Trash2, X, Upload, Grid, List, Star, RefreshCw, Package, TrendingUp, DollarSign, CheckSquare, Square, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const Products = () => {
  const { products, productsLoading, productsError, addProduct, updateProduct, deleteProduct, importProductsFromExcel, companies, categories, subcategories, fetchProducts } = useApp();
  
  // Extra options added from filter '+ Add' items (client-side only)
  const [customCompanies, setCustomCompanies] = useState([]); // string[]
  const [customCategories, setCustomCategories] = useState({}); // { [company]: string[] }
  const [customSubcategories, setCustomSubcategories] = useState({}); // { `${company}|${category}`: string[] }

  const [filters, setFilters] = useState({
    company: '',
    category: '',
    subcategory: ''
  });

  // Create dynamic filter options based on products + custom values
  const availableCompanies = useMemo(() => {
    const productCompanies = [...new Set(products.map(p => p.company).filter(Boolean))];
    const allCompanies = [...new Set([...(companies || []), ...productCompanies, ...customCompanies])];
    return allCompanies.sort();
  }, [products, companies, customCompanies]);

  const availableCategories = useMemo(() => {
    if (!filters.company) return [];
    const productCategories = [...new Set(
      products
        .filter(p => p.company === filters.company)
        .map(p => p.category)
        .filter(Boolean)
    )];
    const staticCategories = categories || [];
    const customForCompany = customCategories[filters.company] || [];
    const allCategories = [...new Set([...staticCategories, ...productCategories, ...customForCompany])];
    return allCategories.sort();
  }, [products, categories, filters.company, customCategories]);

  const availableSubcategories = useMemo(() => {
    if (!filters.company || !filters.category) return [];
    const productSubcategories = [...new Set(
      products
        .filter(p => p.company === filters.company && p.category === filters.category)
        .map(p => p.subcategory)
        .filter(Boolean)
    )];
    const key = `${filters.company}|${filters.category}`;
    const staticSubcategories = subcategories[filters.category] || [];
    const customForPair = customSubcategories[key] || [];
    const allSubcategories = [...new Set([...staticSubcategories, ...productSubcategories, ...customForPair])];
    return allSubcategories.sort();
  }, [products, subcategories, filters.company, filters.category, customSubcategories]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('card');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    company: '',
    category: '',
    subcategory: '',
    name: '',
    price: '',
    minPrice: '',
    incentive: '',
  });

  // Handlers for '+ Add' options inside selects
  const handleCompanyFilterChange = (value) => {
    if (value === '__add_company__') {
      const name = window.prompt('Enter new company name');
      if (!name) return;
      setCustomCompanies(prev => (prev.includes(name) ? prev : [...prev, name]));
      setFilters({ company: name, category: '', subcategory: '' });
      return;
    }
    setFilters({ company: value, category: '', subcategory: '' });
  };

  const handleCategoryFilterChange = (value) => {
    if (value === '__add_category__') {
      if (!filters.company) {
        alert('Please select a company first.');
        return;
      }
      const name = window.prompt(`Enter new category name for ${filters.company}`);
      if (!name) return;
      setCustomCategories(prev => ({
        ...prev,
        [filters.company]: prev[filters.company]?.includes(name)
          ? prev[filters.company]
          : [...(prev[filters.company] || []), name],
      }));
      setFilters({ company: filters.company, category: name, subcategory: '' });
      return;
    }
    setFilters(prev => ({ ...prev, category: value, subcategory: '' }));
  };

  const handleSubcategoryFilterChange = (value) => {
    if (value === '__add_subcategory__') {
      if (!filters.company || !filters.category) {
        alert('Please select company and category first.');
        return;
      }
      const name = window.prompt(`Enter new subcategory for ${filters.company} / ${filters.category}`);
      if (!name) return;
      const key = `${filters.company}|${filters.category}`;
      setCustomSubcategories(prev => ({
        ...prev,
        [key]: prev[key]?.includes(name) ? prev[key] : [...(prev[key] || []), name],
      }));
      setFilters(prev => ({ ...prev, subcategory: name }));
      return;
    }
    setFilters(prev => ({ ...prev, subcategory: value }));
  };

  const filteredProducts = useMemo(() => {
    return products.filter(prod => {
      const matchesSearch = searchTerm === '' || 
        prod.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prod.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prod.category?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Make filtering case-insensitive and handle null/undefined values
      const matchesCompany = filters.company === '' || 
        (prod.company && prod.company.toLowerCase() === filters.company.toLowerCase());
      const matchesCategory = filters.category === '' || 
        (prod.category && prod.category.toLowerCase() === filters.category.toLowerCase());
      
      // Smart subcategory matching - handle variations like "LED TV" matching "LED"
      const matchesSubcategory = filters.subcategory === '' || 
        (prod.subcategory && (
          prod.subcategory.toLowerCase() === filters.subcategory.toLowerCase() ||
          prod.subcategory.toLowerCase().includes(filters.subcategory.toLowerCase()) ||
          filters.subcategory.toLowerCase().includes(prod.subcategory.toLowerCase())
        ));
      
      return matchesSearch && matchesCompany && matchesCategory && matchesSubcategory;
    });
  }, [products, searchTerm, filters]);

  // Average discount (price difference %) for valid products in current view
  const validDiscountProducts = useMemo(
    () => filteredProducts.filter(p => (p.price || 0) > 0 && (p.minPrice || 0) >= 0 && (p.minPrice || 0) <= (p.price || 0)),
    [filteredProducts]
  );

  const avgDiscountPercent = validDiscountProducts.length
    ? Math.round(
        validDiscountProducts.reduce(
          (sum, p) => sum + (((p.price || 0) - (p.minPrice || 0)) / (p.price || 1) * 100),
          0
        ) / validDiscountProducts.length
      )
    : 0;

  const handleOpenModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        company: product.company || '',
        category: product.category || '',
        subcategory: product.subcategory || '',
        name: product.name || '',
        price: product.price || '',
        minPrice: product.minPrice || '',
        incentive: product.incentive || '',
      });
    } else {
      setEditingProduct(null);
      setFormData({
        company: '',
        category: '',
        subcategory: '',
        name: '',
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

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProduct(id);
      } catch (err) {
        alert('Error deleting product. Please try again.');
      }
    }
  };

  const handleRefresh = async () => {
    await fetchProducts();
    setFilters({ company: '', category: '', subcategory: '' });
    setCustomCompanies([]);
    setCustomCategories({});
    setCustomSubcategories({});
    setSearchTerm('');
    setSelectedProducts([]);
  };

  // Multi-select functions
  const handleSelectProduct = (productId) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedProducts.length} selected products? This action cannot be undone!`)) {
      try {
        // Delete products one by one
        for (const productId of selectedProducts) {
          await deleteProduct(productId);
        }
        setSelectedProducts([]);
        alert(`Successfully deleted ${selectedProducts.length} products!`);
      } catch (err) {
        alert('Error deleting selected products. Please try again.');
      }
    }
  };

  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        // Debug: Log the first row to see column names
        if (data.length > 0) {
          console.log('Excel column names found:', Object.keys(data[0]));
          console.log('First row data:', data[0]);
        }
        
        const excelProducts = data.map((row, index) => {
          // Helper function to find column value with multiple possible names
          const findValue = (possibleNames) => {
            for (const name of possibleNames) {
              if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
                return row[name];
              }
            }
            return null;
          };


          // Helper function to clean and preserve original values
          const cleanValue = (value) => {
            if (!value || value === null || value === undefined) return '';
            return value.toString().trim();
          };

          const product = {
            company: cleanValue(findValue(['Company', 'company', 'Brand', 'brand', 'Manufacturer', 'manufacturer'])) || 'Unknown',
            category: cleanValue(findValue(['Category', 'category', 'Type', 'type', 'Product Type'])) || 'Unknown',
            subcategory: cleanValue(findValue(['Subcategory', 'subcategory', 'Sub Category', 'sub category', 'Subtype'])) || 'Unknown',
            name: cleanValue(findValue(['Product Name', 'product name', 'Name', 'name', 'Product', 'product'])) || 'Unknown Product',
            price: parseFloat(findValue(['Price', 'price', 'Cost', 'cost', 'Amount'])) || 0,
            minPrice: parseFloat(findValue(['Min Price', 'min price', 'Minimum Price', 'minimum price', 'Bottom Price', 'bottom price', 'MinPrice', 'minPrice', 'Base Price', 'base price', 'Lowest Price', 'lowest price','Bottom Price'])) || 0,
            incentive: parseFloat(findValue(['Incentive', 'incentive', 'Commission', 'commission', 'Bonus'])) || 0,
          };


          return product;
        });
        
        try {
          const count = await importProductsFromExcel(excelProducts);
          alert(`Successfully imported ${count} products from Excel!`);
        } catch (err) {
          alert('Error importing products from Excel. Please try again.');
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  const handleDownloadData = () => {
    if (!products || products.length === 0) {
      alert('No products to download.');
      return;
    }

    const headers = ['Company', 'Category', 'Subcategory', 'Product Name', 'Price', 'Bottom Price', 'Incentive'];
    const rows = products.map(p => [
      p.company || '',
      p.category || '',
      p.subcategory || '',
      p.name || '',
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

  // Show loading state
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
    <>
    <div className="space-y-6">
      {/* Error Message */}
      {productsError && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-center">
            <div className="text-red-600 dark:text-red-400">
              <X className="w-5 h-5" />
            </div>
            <p className="ml-3 text-red-700 dark:text-red-300">{productsError}</p>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
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
            Manage your electronic products inventory
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedProducts.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors flex items-center space-x-2"
            >
              <Trash2 className="w-5 h-5" />
              <span>Delete Selected ({selectedProducts.length})</span>
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center space-x-2"
          >
            <RefreshCw className="w-5 h-5" />
            <span>Refresh</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors flex items-center space-x-2"
          >
            <Upload className="w-5 h-5" />
            <span>Import Excel</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleDownloadData}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors flex items-center space-x-2"
          >
            <Download className="w-5 h-5" />
            <span>Download Data</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-medium transition-colors flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Add Product</span>
          </motion.button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleExcelUpload}
        className="hidden"
      />

      {/* FIRST: Stats Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">Showing Products</p>
              <h3 className="text-3xl font-bold text-blue-700 dark:text-blue-300">{filteredProducts.length}</h3>
            </div>
            <Package className="w-12 h-12 text-blue-500 opacity-50" />
          </div>
        </div>
        <div className="card bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 dark:text-green-400 mb-1">Avg Price</p>
              <h3 className="text-3xl font-bold text-green-700 dark:text-green-300">₹{filteredProducts.length > 0 ? Math.round(filteredProducts.reduce((sum, p) => sum + (p.price || 0), 0) / filteredProducts.length).toLocaleString() : 0}</h3>
            </div>
            <TrendingUp className="w-12 h-12 text-green-500 opacity-50" />
          </div>
        </div>
        <div className="card bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border border-orange-200 dark:border-orange-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 dark:text-orange-400 mb-1">Avg Discount</p>
              <h3 className="text-3xl font-bold text-orange-700 dark:text-orange-300">
                {avgDiscountPercent}%
              </h3>
            </div>
            <DollarSign className="w-12 h-12 text-orange-500 opacity-50" />
          </div>
        </div>
        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 dark:text-purple-400 mb-1">Avg Incentive</p>
              <h3 className="text-3xl font-bold text-purple-700 dark:text-purple-300">₹{filteredProducts.length > 0 ? Math.round(filteredProducts.reduce((sum, p) => sum + (p.incentive || 0), 0) / filteredProducts.length).toLocaleString() : 0}</h3>
            </div>
            <Star className="w-12 h-12 text-purple-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* SECOND: Product Filters Section (AFTER Stats Cards) */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">🔍 Filter Products</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Company</label>
            <select
              value={filters.company}
              onChange={(e) => handleCompanyFilterChange(e.target.value)}
              className="input-field"
            >
              <option value="">Select Company</option>
              {availableCompanies.map(c => <option key={c} value={c}>{c}</option>)}
              <option value="__add_company__">+ Add Company</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
            <select
              value={filters.category}
              onChange={(e) => handleCategoryFilterChange(e.target.value)}
              className="input-field"
            >
              <option value="">Select Category</option>
              {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
              {filters.company && (
                <option value="__add_category__">+ Add Category for {filters.company}</option>
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subcategory</label>
            <select
              value={filters.subcategory}
              onChange={(e) => handleSubcategoryFilterChange(e.target.value)}
              className="input-field"
              disabled={!filters.category}
            >
              <option value="">Select Subcategory</option>
              {availableSubcategories.map(s => <option key={s} value={s}>{s}</option>)}
              {filters.company && filters.category && (
                <option value="__add_subcategory__">+ Add Subcategory for {filters.category}</option>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Search and View Toggle */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-12"
            />
          </div>
          <div className="flex items-center gap-4">
            {filteredProducts.length > 0 && (
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {selectedProducts.length === filteredProducts.length ? (
                  <CheckSquare className="w-4 h-4 text-blue-600" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                <span>
                  {selectedProducts.length === filteredProducts.length ? 'Deselect All' : 'Select All'}
                </span>
              </button>
            )}</div>
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
            <button
              onClick={() => setViewMode('card')}
              className={`px-4 py-2 rounded-lg transition-all ${
                viewMode === 'card'
                  ? 'bg-white dark:bg-gray-600 shadow-md text-primary'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded-lg transition-all ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-gray-600 shadow-md text-primary'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Card View */}
      {viewMode === 'card' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="card group cursor-pointer hover:scale-105 transition-transform"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleSelectProduct(product.id)}
                    className="flex items-center justify-center w-6 h-6 rounded border-2 border-gray-300 dark:border-gray-600 hover:border-blue-500 transition-colors"
                  >
                    {selectedProducts.includes(product.id) ? (
                      <CheckSquare className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {index + 1}
                  </div>
                </div>
              </div>
              
              <div className="mb-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {product.company} • {product.category}
                </p>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                  {product.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {product.subcategory}
                </p>
              </div>

              <div className="flex justify-between items-end pt-3 border-t border-gray-200 dark:border-gray-700">
                {/* Price Information */}
                <div className="space-y-1">
                  <div className="text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Price: </span>
                    <span className="font-bold text-green-600 dark:text-green-400">
                      ₹{(product.price || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Bottom Price: </span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      ₹{(product.minPrice || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Incentive: </span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      ₹{(product.incentive || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleOpenModal(product)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                    <button
                      onClick={handleSelectAll}
                      className="flex items-center justify-center w-6 h-6 rounded border-2 border-gray-300 dark:border-gray-600 hover:border-blue-500 transition-colors"
                    >
                      {selectedProducts.length === filteredProducts.length && filteredProducts.length > 0 ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Sr No</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Product</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Company</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Category</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Price</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Bottom Price</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Incentive</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredProducts.map((product, index) => (
                  <tr key={product.id} className="table-row">
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleSelectProduct(product.id)}
                        className="flex items-center justify-center w-6 h-6 rounded border-2 border-gray-300 dark:border-gray-600 hover:border-blue-500 transition-colors"
                      >
                        {selectedProducts.includes(product.id) ? (
                          <CheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{product.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{product.subcategory}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{product.company}</td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{product.category}</td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-green-600 dark:text-green-400">₹{(product.price || 0).toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-700 dark:text-gray-300">₹{(product.minPrice || 0).toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-blue-600 dark:text-blue-400">₹{(product.incentive || 0).toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleOpenModal(product)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>

    {/* Modal - Rendered outside main container with high z-index */}
    <AnimatePresence>
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 z-[9998]"
            onClick={handleCloseModal}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 z-[10000] max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Company</label>
                  <select
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="input-field"
                    required
                  >
                    <option value="">Select Company</option>
                    {companies.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value, subcategory: '' })}
                    className="input-field"
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subcategory</label>
                <select
                  value={formData.subcategory}
                  onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                  className="input-field"
                  required
                  disabled={!formData.category}
                >
                  <option value="">Select Subcategory</option>
                  {formData.category && subcategories[formData.category]?.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Product Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="Enter product name"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Price (₹)</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="input-field"
                    placeholder="30000"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bottom Price (₹)</label>
                  <input
                    type="number"
                    value={formData.minPrice}
                    onChange={(e) => setFormData({ ...formData, minPrice: e.target.value })}
                    className="input-field"
                    placeholder="24000"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Incentive (₹)</label>
                <input
                  type="number"
                  value={formData.incentive}
                  onChange={(e) => setFormData({ ...formData, incentive: e.target.value })}
                  className="input-field"
                  placeholder="1500"
                  required
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button 
                  type="button" 
                  onClick={handleCloseModal} 
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
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
      )}
    </AnimatePresence>
    </>
  );
};

export default Products;
