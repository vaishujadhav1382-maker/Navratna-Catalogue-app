import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Upload, Award, Package as PackageIcon, X, Edit2, Trash2, RefreshCw, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const ProductsEnhanced = () => {
  const { products, productsLoading, fetchProducts, addProduct, updateProduct, deleteProduct, importProductsFromExcel, categories, subcategories } = useApp();
  
  // Filter states
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  // New: Filter for products added this month
  const [filterThisMonth, setFilterThisMonth] = useState(false);

  // Custom dropdown open states
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isSubcategoryDropdownOpen, setIsSubcategoryDropdownOpen] = useState(false);
  
  // Form dropdown states
  const [isFormCategoryDropdownOpen, setIsFormCategoryDropdownOpen] = useState(false);
  const [isFormSubcategoryDropdownOpen, setIsFormSubcategoryDropdownOpen] = useState(false);

  // Extra options added from filter plus buttons (client-side only)
  const [customCategories, setCustomCategories] = useState({}); // { category: string[] }
  const [deletedCategories, setDeletedCategories] = useState(() => {
    const saved = localStorage.getItem('deletedCategories');
    return saved ? JSON.parse(saved) : [];
  }); // Track deleted default categories
  const [customSubcategories, setCustomSubcategories] = useState({}); // { `${category}`: string[] }
  const [deletedSubcategories, setDeletedSubcategories] = useState(() => {
    const saved = localStorage.getItem('deletedSubcategories');
    return saved ? JSON.parse(saved) : [];
  }); // Track deleted default subcategories
  
  // Persist deleted items to localStorage
  useEffect(() => {
    localStorage.setItem('deletedCategories', JSON.stringify(deletedCategories));
  }, [deletedCategories]);
  
  useEffect(() => {
    localStorage.setItem('deletedSubcategories', JSON.stringify(deletedSubcategories));
  }, [deletedSubcategories]);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [detailsProduct, setDetailsProduct] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const fileInputRef = useRef(null);
  const handleRefresh = async () => {
    await fetchProducts();
    setSelectedCategory('');
    setSelectedSubcategory('');
    setCustomCategories({});
    setCustomSubcategories({});
    // Note: We do NOT clear deleted items - they persist in localStorage
  };
  
  const [formData, setFormData] = useState({
    category: '',
    subcategory: '',
    name: '',
    mrp: '',
    price: '',
    minPrice: '',
    incentive: '',
  });

  // Available options for cascading filters (base lists + products + custom additions)
  const availableCategories = useMemo(() => {
    const fromProducts = Array.from(
      new Set(
        products
          .map(p => p.category)
          .filter(Boolean)
          .filter(c => c !== 'Unknown') // Exclude Unknown
      )
    );
    const base = (categories || []).filter(c => !deletedCategories.includes(c) && c !== 'Unknown');
    const customGeneral = customCategories['General'] || [];
    const all = Array.from(new Set([...base, ...fromProducts, ...customGeneral]));
    return all.sort();
  }, [products, categories, customCategories, deletedCategories]);

  const availableSubcategories = useMemo(() => {
    const fromProducts = Array.from(
      new Set(
        products
          .filter(p => !selectedCategory || p.category === selectedCategory)
          .map(p => p.subcategory)
          .filter(Boolean)
          .filter(s => s !== 'Unknown') // Exclude Unknown
      )
    );
    const categoryName = selectedCategory || '';
    const key = `${categoryName}`;
    const base = categoryName ? (subcategories[categoryName] || []).filter(s => !deletedSubcategories.includes(s) && s !== 'Unknown') : [];
    const customForCategory = customSubcategories[key] || [];
    const customGeneral = customSubcategories['General'] || [];
    // Get all custom subcategories for any category if no specific category selected
    let allCustom = [...customForCategory, ...customGeneral];
    if (!categoryName) {
      Object.keys(customSubcategories).forEach(k => {
        allCustom = [...allCustom, ...customSubcategories[k]];
      });
    }
    const all = Array.from(new Set([...base, ...fromProducts, ...allCustom]));
    return all.sort();
  }, [products, subcategories, selectedCategory, customSubcategories, deletedSubcategories]);

  // Filter products based on selections and "this month" filter
  const filteredProducts = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const lowerSearchQuery = searchQuery.toLowerCase().trim();
    
    return products.filter(product => {
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
      
      // Search filter - search by product name, category, and model number
      if (lowerSearchQuery) {
        const productName = (product.name || '').toLowerCase();
        const productCategory = (product.category || '').toLowerCase();
        const modelNumber = (product.modelNumber || product.model || '').toLowerCase();
        const productSubcategory = (product.subcategory || '').toLowerCase();
        
        const matchesSearch = productName.includes(lowerSearchQuery) ||
                             productCategory.includes(lowerSearchQuery) ||
                             modelNumber.includes(lowerSearchQuery) ||
                             productSubcategory.includes(lowerSearchQuery);
        if (!matchesSearch) return false;
      }
      
      return true;
    });
  }, [products, selectedCategory, selectedSubcategory, filterThisMonth, searchQuery]);
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
  }, [selectedCategory, selectedSubcategory]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage]);

  // Reset dependent filters when parent changes
  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setSelectedSubcategory(''); // Reset subcategory
  };

  // Custom dropdown select + delete handlers
  const handleSelectCategoryFromDropdown = (category) => {
    handleCategoryChange(category);
    setIsCategoryDropdownOpen(false);
  };

  const handleDeleteCategoryFromDropdown = async (category) => {
    if (!category) return;
    const ok = window.confirm(`Delete category "${category}" and all its data?`);
    if (!ok) return;
    
    try {
      // Check if it's a custom category
      const isCustom = Object.values(customCategories).some(items => items.includes(category));
      
      if (isCustom) {
        // Remove from custom categories
        setCustomCategories(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(key => {
            updated[key] = updated[key].filter(c => c !== category);
            if (updated[key].length === 0) delete updated[key];
          });
          return updated;
        });
      } else {
        // Mark as deleted (it's a default category)
        setDeletedCategories(prev => [...prev, category]);
      }
      
      // Also remove related subcategories from custom list
      setCustomSubcategories(prev => {
        const updated = {};
        Object.keys(prev).forEach(key => {
          const cat = key.split('|')[1];
          if (cat !== category) {
            updated[key] = prev[key];
          }
        });
        return updated;
      });
      
      if (selectedCategory === category) {
        setSelectedCategory('');
        setSelectedSubcategory('');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Failed to delete category: ' + (error.message || 'Unknown error'));
    } finally {
      setIsCategoryDropdownOpen(false);
    }
  };

  const handleSelectSubcategoryFromDropdown = (subcategory) => {
    setSelectedSubcategory(subcategory);
    setIsSubcategoryDropdownOpen(false);
  };

  const handleDeleteSubcategoryFromDropdown = async (subcategory) => {
    if (!subcategory) return;
    const ok = window.confirm(`Delete subcategory "${subcategory}" and all its data?`);
    if (!ok) return;
    
    try {
      // Check if it's a custom subcategory
      const isCustom = Object.values(customSubcategories).some(items => items.includes(subcategory));
      
      if (isCustom) {
        // Remove from custom subcategories
        setCustomSubcategories(prev => {
          const updated = {};
          Object.keys(prev).forEach(key => {
            updated[key] = prev[key].filter(s => s !== subcategory);
            if (updated[key].length === 0) delete updated[key];
          });
          return updated;
        });
      } else {
        // Mark as deleted (it's a default subcategory)
        setDeletedSubcategories(prev => [...prev, subcategory]);
      }
      
      if (selectedSubcategory === subcategory) {
        setSelectedSubcategory('');
      }
    } catch (error) {
      console.error('Error deleting subcategory:', error);
      alert('Failed to delete subcategory: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSubcategoryDropdownOpen(false);
    }
  };

  // Plus-button handlers for adding new options
  const handleAddCategory = () => {
    const name = window.prompt('Enter new category name');
    if (!name) return;
    setCustomCategories(prev => ({
      ...prev,
      'General': prev['General']?.includes(name)
        ? prev['General']
        : [...(prev['General'] || []), name],
    }));
    setSelectedCategory(name);
    setSelectedSubcategory('');
  };

  const handleAddSubcategory = () => {
    const name = window.prompt('Enter new subcategory name');
    if (!name) return;
    const categoryKey = selectedCategory || 'General';
    const key = `${categoryKey}`;
    setCustomSubcategories(prev => ({
      ...prev,
      [key]: prev[key]?.includes(name) ? prev[key] : [...(prev[key] || []), name],
    }));
    setSelectedSubcategory(name);
  };

  // Plus-button handlers for adding options directly from the form
  const handleFormAddCategory = () => {
    const name = window.prompt(`Enter category name:`);
    if (!name) return;
    setCustomCategories(prev => ({
      ...prev,
      'General': prev['General']?.includes(name)
        ? prev['General']
        : [...(prev['General'] || []), name],
    }));
    setFormData(prev => ({
      ...prev,
      category: name,
      subcategory: '',
    }));
  };
  
  // Form category handlers
  const handleSelectCategoryFromForm = (category) => {
    setFormData({ ...formData, category, subcategory: '' });
    setIsFormCategoryDropdownOpen(false);
  };
  
  const handleDeleteCategoryFromForm = async (category) => {
    if (!category) return;
    const ok = window.confirm(`Permanently delete category "${category}"? This will remove it from filters and forms.`);
    if (!ok) return;
    
    try {
      // Check if it's a custom category
      const isCustom = Object.values(customCategories).some(items => items.includes(category));
      
      if (isCustom) {
        // Remove from custom categories
        setCustomCategories(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(key => {
            updated[key] = updated[key].filter(c => c !== category);
            if (updated[key].length === 0) delete updated[key];
          });
          return updated;
        });
      } else {
        // Mark as deleted (it's from products)
        setDeletedCategories(prev => [...prev, category]);
      }
      
      // Clear form if deleted category was selected
      if (formData.category === category) {
        setFormData({ ...formData, category: '', subcategory: '' });
      }
      
      // Also clear from filter if selected
      if (selectedCategory === category) {
        setSelectedCategory('');
        setSelectedSubcategory('');
      }
    } catch (error) {
      alert('Failed to delete category: ' + (error.message || 'Unknown error'));
    } finally {
      setIsFormCategoryDropdownOpen(false);
    }
  };

  const handleFormAddSubcategory = () => {
    const name = window.prompt(`Enter subcategory name:`);
    if (!name) return;
    const categoryName = formData.category || 'General';
    const key = `${categoryName}`;
    setCustomSubcategories(prev => ({
      ...prev,
      [key]: prev[key]?.includes(name) ? prev[key] : [...(prev[key] || []), name],
    }));
    setFormData(prev => ({
      ...prev,
      subcategory: name,
    }));
  };
  
  // Form subcategory handlers
  const handleSelectSubcategoryFromForm = (subcategory) => {
    setFormData({ ...formData, subcategory });
    setIsFormSubcategoryDropdownOpen(false);
  };
  
  const handleDeleteSubcategoryFromForm = async (subcategory) => {
    if (!subcategory) return;
    const ok = window.confirm(`Permanently delete subcategory "${subcategory}"? This will remove it from filters and forms.`);
    if (!ok) return;
    
    try {
      // Check if it's a custom subcategory
      const isCustom = Object.values(customSubcategories).some(items => items.includes(subcategory));
      
      if (isCustom) {
        // Remove from custom subcategories
        setCustomSubcategories(prev => {
          const updated = {};
          Object.keys(prev).forEach(key => {
            updated[key] = prev[key].filter(s => s !== subcategory);
            if (updated[key].length === 0) delete updated[key];
          });
          return updated;
        });
      } else {
        // Mark as deleted (it's from products)
        setDeletedSubcategories(prev => [...prev, subcategory]);
      }
      
      // Clear form if deleted subcategory was selected
      if (formData.subcategory === subcategory) {
        setFormData({ ...formData, subcategory: '' });
      }
      
      // Also clear from filter if selected
      if (selectedSubcategory === subcategory) {
        setSelectedSubcategory('');
      }
    } catch (error) {
      alert('Failed to delete subcategory: ' + (error.message || 'Unknown error'));
    } finally {
      setIsFormSubcategoryDropdownOpen(false);
    }
  };

  // Product modal handlers
  const handleOpenModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
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
  
  // Cascading validation
  if (formData.category && !formData.subcategory) {
    alert('Please select Subcategory for the selected Category');
    return;
  }
  
  const productData = {
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
      reader.onload = async (evt) => {
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
        
        try {
          const count = await importProductsFromExcel(excelProducts);
          alert(`Successfully imported ${count} products from Excel!`);
        } catch (error) {
          alert(`Error importing products: ${error.message}`);
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  const handleBulkDelete = async () => {
    try {
      for (const productId of selectedProducts) {
        await deleteProduct(productId);
      }
      setSelectedProducts(new Set());
      await fetchProducts();
    } catch (error) {
      console.error('Error deleting products:', error);
      alert('Failed to delete some products. Please try again.');
    }
  };

 const handleDownloadData = () => {
  if (!products || products.length === 0) {
    alert('No products to download.');
    return;
  }

  const headers = ['Category', 'Subcategory', 'Product Name', 'MRP', 'Price', 'Bottom Price', 'Incentive'];
  const rows = products.map(p => [
    p.category || '',
    p.subcategory || '',
    p.name || '',
    p.mrp ?? '',
    p.price ?? '',
    p.minPrice ?? '',
    p.incentive ?? '',
  ]);

  // Create workbook with headers and data
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Products');
  
  // Write file
  XLSX.writeFile(wb, 'products-export.xlsx');
  };

  // Get available categories/subcategories for the form (respect custom additions and deletions)
  const formAvailableCategories = useMemo(() => {
    const base = (categories || []).filter(c => !deletedCategories.includes(c) && c !== 'Unknown');
    const customGeneral = customCategories['General'] || [];
    let all = Array.from(new Set([...base, ...customGeneral]));
    
    // Always include the editing product's category if it exists (except Unknown)
    if (editingProduct && editingProduct.category && editingProduct.category !== 'Unknown' && !all.includes(editingProduct.category)) {
      all = [...all, editingProduct.category];
    }
    
    return all.sort();
  }, [categories, customCategories, editingProduct, deletedCategories]);

  const formAvailableSubcategories = useMemo(() => {
    // If no category selected, show all subcategories from all categories
    if (!formData.category) {
      const allSubs = new Set();
      Object.entries(subcategories).forEach(([cat, subsArray]) => {
        subsArray.forEach(sub => {
          if (!deletedSubcategories.includes(sub) && sub !== 'Unknown') {
            allSubs.add(sub);
          }
        });
      });
      Object.values(customSubcategories).forEach(subsArray => {
        subsArray.forEach(sub => allSubs.add(sub));
      });
      return Array.from(allSubs).sort();
    }
    
    // If category is selected, show only subcategories for that category
    const base = (subcategories[formData.category] || []).filter(s => !deletedSubcategories.includes(s) && s !== 'Unknown');
    const key = `${formData.category}`;
    const customForCategory = customSubcategories[key] || [];
    const customGeneral = customSubcategories['General'] || [];
    let all = Array.from(new Set([...base, ...customForCategory, ...customGeneral]));
    
    // Always include the editing product's subcategory if it exists (except Unknown)
    if (editingProduct && editingProduct.subcategory && editingProduct.subcategory !== 'Unknown' && !all.includes(editingProduct.subcategory)) {
      all = [...all, editingProduct.subcategory];
    }
    
    return all.sort();
  }, [formData.category, subcategories, customSubcategories, editingProduct, deletedSubcategories]);

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
        
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by product name, category, or model number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                title="Clear search"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Found {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                title="Add Category"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsCategoryDropdownOpen(prev => !prev)}
                className="input-field w-full flex items-center justify-between"
              >
                <span>{selectedCategory || 'Select Category'}</span>
                <span className="ml-2 text-gray-400">▾</span>
              </button>
              {isCategoryDropdownOpen && (
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
                className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs hover:bg-primary-600"
                title="Add Subcategory"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsSubcategoryDropdownOpen(prev => !prev)}
                className="input-field w-full flex items-center justify-between"
              >
                <span>{selectedSubcategory || 'Select Subcategory'}</span>
                <span className="ml-2 text-gray-400">▾</span>
              </button>
              {isSubcategoryDropdownOpen && (
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
        {(selectedCategory || selectedSubcategory) && (
          <button
            onClick={() => {
              setSelectedCategory('');
              setSelectedSubcategory('');
              setSearchQuery('');
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
              <p className="text-sm text-purple-600 dark:text-purple-400 mb-1">Products Added (This Month)</p>
              <h3 className="text-3xl font-bold text-purple-700 dark:text-purple-300">
                {thisMonthProducts.length}
              </h3>
            </div>
            <PackageIcon className="w-12 h-12 text-purple-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="card overflow-x-auto">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {selectedCategory || selectedSubcategory ? 'Filtered Products' : 'All Products'}
        </h3>
        
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <PackageIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No products found with selected filters</p>
          </div>
        ) : (
          <>
            <div className="inline-block min-w-full">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white" style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={selectedProducts.size === paginatedProducts.length && paginatedProducts.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProducts(new Set(paginatedProducts.map(p => p.id)));
                          } else {
                            setSelectedProducts(new Set());
                          }
                        }}
                        className="w-4 h-4 cursor-pointer"
                        title="Select all products on this page"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Sr.</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Product Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Category</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Subcategory</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">Sales Price</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">MRP</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">Best Price</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">Incentive</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProducts.map((product, index) => (
                    <motion.tr
                      key={product.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${selectedProducts.has(product.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                    >
                      <td className="px-4 py-3 text-center" style={{ width: '40px' }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedProducts.has(product.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            const newSelected = new Set(selectedProducts);
                            if (e.target.checked) {
                              newSelected.add(product.id);
                            } else {
                              newSelected.delete(product.id);
                            }
                            setSelectedProducts(newSelected);
                          }}
                          className="w-4 h-4 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white cursor-pointer" onClick={() => {
                        setDetailsProduct(product);
                        setIsDetailsModalOpen(true);
                      }}>
                        {((currentPage - 1) * pageSize) + index + 1}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium max-w-xs truncate">
                        {product.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {product.category || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {product.subcategory || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-green-600 dark:text-green-400 text-right">
                        ₹{(product.price !== undefined && product.price !== null && product.price !== '' ? Number(product.price).toLocaleString() : '—')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 text-right line-through">
                        ₹{(product.mrp !== undefined && product.mrp !== null && product.mrp !== '' && !isNaN(product.mrp) ? Number(product.mrp).toLocaleString() : '—')}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 text-right">
                        ₹{(product.minPrice !== undefined && product.minPrice !== null && product.minPrice !== '' && !isNaN(product.minPrice) ? Number(product.minPrice).toLocaleString() : '—')}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-blue-600 dark:text-blue-400 text-right">
                        ₹{(product.incentive !== undefined && product.incentive !== null && product.incentive !== '' ? Number(product.incentive).toLocaleString() : '—')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-2 justify-center" onClick={(e) => e.stopPropagation()}>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenModal(product);
                            }}
                            className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                            title="Edit Product"
                          >
                            <Edit2 className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(product.id);
                            }}
                            className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bulk Delete Section */}
            {selectedProducts.size > 0 && (
              <div className="flex items-center gap-3 pt-4 mt-4 pb-4 px-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
                  {selectedProducts.size} product{selectedProducts.size !== 1 ? 's' : ''} selected
                </span>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    if (window.confirm(`Delete ${selectedProducts.size} product${selectedProducts.size !== 1 ? 's' : ''}? This action cannot be undone.`)) {
                      handleBulkDelete();
                    }
                  }}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Selected
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedProducts(new Set())}
                  className="px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-lg font-medium transition-colors"
                >
                  Clear Selection
                </motion.button>
              </div>
            )}

            {/* Pagination Controls */}
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
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
          </>
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
                      {/* Category */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Category
                          </label>
                          <button
                            type="button"
                            onClick={handleFormAddCategory}
                            className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs hover:bg-primary-600"
                            title="Add Category"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setIsFormCategoryDropdownOpen(prev => !prev)}
                            className="input-field w-full flex items-center justify-between text-left"
                          >
                            <span className={!formData.category ? 'text-gray-400' : ''}>
                              {formData.category || 'Select Category'}
                            </span>
                            <span className="ml-2 text-gray-400">▾</span>
                          </button>
                          {isFormCategoryDropdownOpen && (
                            <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
                              {formAvailableCategories.length === 0 ? (
                                <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No categories available</div>
                              ) : (
                                <>
                                  <div
                                    className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100"
                                    onClick={() => handleSelectCategoryFromForm('')}
                                  >
                                    Select Category
                                  </div>
                                  {formAvailableCategories.map(cat => (
                                    <div
                                      key={cat}
                                      className="flex items-center justify-between px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 group"
                                    >
                                      <button
                                        type="button"
                                        className="flex-1 text-left text-gray-800 dark:text-gray-100"
                                        onClick={() => handleSelectCategoryFromForm(cat)}
                                      >
                                        {cat}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteCategoryFromForm(cat);
                                        }}
                                        className="ml-2 p-1 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Delete category"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                </>
                              )}
                            </div>
                          )}
                        </div>
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
                            className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs hover:bg-primary-600"
                            title="Add Subcategory"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setIsFormSubcategoryDropdownOpen(prev => !prev)}
                            className="input-field w-full flex items-center justify-between text-left"
                          >
                            <span className={!formData.subcategory ? 'text-gray-400' : ''}>
                              {formData.subcategory || 'Select Subcategory'}
                            </span>
                            <span className="ml-2 text-gray-400">▾</span>
                          </button>
                          {isFormSubcategoryDropdownOpen && (
                            <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
                              {formAvailableSubcategories.length === 0 ? (
                                <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No subcategories available</div>
                              ) : (
                                <>
                                  <div
                                    className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100"
                                    onClick={() => handleSelectSubcategoryFromForm('')}
                                  >
                                    Select Subcategory
                                  </div>
                                  {formAvailableSubcategories.map(sub => (
                                    <div
                                      key={sub}
                                      className="flex items-center justify-between px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 group"
                                    >
                                      <button
                                        type="button"
                                        className="flex-1 text-left text-gray-800 dark:text-gray-100"
                                        onClick={() => handleSelectSubcategoryFromForm(sub)}
                                      >
                                        {sub}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteSubcategoryFromForm(sub);
                                        }}
                                        className="ml-2 p-1 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Delete subcategory"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                </>
                              )}
                            </div>
                          )}
                        </div>
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

      {/* Product Details Modal */}
      <AnimatePresence>
        {isDetailsModalOpen && detailsProduct && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 transition-opacity bg-black bg-opacity-50 z-40"
                onClick={() => setIsDetailsModalOpen(false)}
              />

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative z-50 inline-block align-bottom bg-white dark:bg-gray-800 rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Product Details
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsDetailsModalOpen(false)}
                      className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Info */}
                    <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl">
                      <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">Product Information</h4>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Product ID</p>
                          <p className="font-mono text-sm text-gray-900 dark:text-gray-100 break-all">{detailsProduct.id}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Product Name</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{detailsProduct.name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Firebase Path</p>
                          <p className="font-mono text-xs text-gray-600 dark:text-gray-300 break-all">{detailsProduct.path}</p>
                        </div>
                      </div>
                    </div>

                    {/* Category Info */}
                    <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl">
                      <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">Category Information</h4>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Company</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{detailsProduct.company || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Category</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{detailsProduct.category || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Subcategory</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{detailsProduct.subcategory || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Pricing Info */}
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800">
                      <h4 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-3">Pricing Information</h4>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-green-600 dark:text-green-400">MRP</p>
                          <p className="font-semibold text-lg text-green-700 dark:text-green-300">
                            ₹{(detailsProduct.mrp !== undefined && detailsProduct.mrp !== null && !isNaN(detailsProduct.mrp))
                              ? Number(detailsProduct.mrp).toLocaleString()
                              : '0'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-green-600 dark:text-green-400">Sales Price</p>
                          <p className="font-semibold text-lg text-green-700 dark:text-green-300">
                            ₹{(detailsProduct.price !== undefined && detailsProduct.price !== null && !isNaN(detailsProduct.price))
                              ? Number(detailsProduct.price).toLocaleString()
                              : '0'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-green-600 dark:text-green-400">Best Price</p>
                          <p className="font-semibold text-lg text-green-700 dark:text-green-300">
                            ₹{(detailsProduct.minPrice !== undefined && detailsProduct.minPrice !== null && !isNaN(detailsProduct.minPrice))
                              ? Number(detailsProduct.minPrice).toLocaleString()
                              : '0'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                      <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-3">Additional Information</h4>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-blue-600 dark:text-blue-400">Incentive</p>
                          <p className="font-semibold text-lg text-blue-700 dark:text-blue-300">
                            ₹{(detailsProduct.incentive !== undefined && detailsProduct.incentive !== null && !isNaN(detailsProduct.incentive))
                              ? Number(detailsProduct.incentive).toLocaleString()
                              : '0'}
                          </p>
                        </div>
                        {detailsProduct.discount !== undefined && (
                          <div>
                            <p className="text-xs text-blue-600 dark:text-blue-400">Discount %</p>
                            <p className="font-semibold text-lg text-blue-700 dark:text-blue-300">
                              {detailsProduct.discount.toFixed(2)}%
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 flex justify-end gap-3">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsDetailsModalOpen(false)}
                    className="btn-secondary"
                  >
                    Close
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      handleOpenModal(detailsProduct);
                      setIsDetailsModalOpen(false);
                    }}
                    className="btn-primary flex items-center space-x-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>Edit Product</span>
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProductsEnhanced;
