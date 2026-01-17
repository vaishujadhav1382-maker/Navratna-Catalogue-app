import React, { createContext, useState, useContext, useEffect } from 'react';
import { db, storage } from '../firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, writeBatch, setDoc, collectionGroup, deleteField, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};


const initialProducts = [];

export const AppProvider = ({ children }) => {
  // Authentication
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const saved = localStorage.getItem('isAuthenticated');
    return saved ? JSON.parse(saved) : false;
  });
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });

  // Theme
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  // Product alerts setting
  const [productAlertsEnabled, setProductAlertsEnabled] = useState(() => {
    const saved = localStorage.getItem('productAlertsEnabled');
    return saved ? JSON.parse(saved) : true;
  });

  // Employees
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeesError, setEmployeesError] = useState(null);

  // Products
  const [products, setProducts] = useState(initialProducts);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState(null);

  // Offers
  const [offers, setOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [offersError, setOffersError] = useState(null);

  // Catalogs
  const [catalogs, setCatalogs] = useState([]);
  const [catalogsLoading, setCatalogsLoading] = useState(false);
  const [catalogsError, setCatalogsError] = useState(null);

  // Load products and employees from Firebase on mount
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (isMounted) {
        await Promise.all([
          fetchProducts(),
          fetchEmployees(),
          fetchOffers()
        ]);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const fetchEmployees = async () => {
    try {
      setEmployeesLoading(true);
      setEmployeesError(null);
      const employeesData = [];
      const emailDocs = [];
      const employeeIds = new Set(); // Track IDs to prevent duplicates

      // Role-based paths
      const rolePaths = [
        { role: 'telecaller', path: ['admin-data', 'root', 'employees', 'telecaller', 'telecallers'] },
        { role: 'admin', path: ['admin-data', 'root', 'employees', 'admin', 'admins'] },
        { role: 'salesman', path: ['admin-data', 'root', 'employees', 'salesman', 'salesman'] },
      ];

      // Fetch from each role path
      for (const { role, path } of rolePaths) {
        try {
          const qs = await getDocs(collection(db, ...path));
          qs.forEach((snap) => {
            const data = snap.data() || {};
            const { email, ...rest } = data;
            if (email !== undefined) emailDocs.push(snap.ref);
            
            // Only add if not already seen
            if (!employeeIds.has(snap.id)) {
              employeeIds.add(snap.id);
              employeesData.push({
                id: snap.id,
                ...rest,
                role: data.role || role, // Use role from data or default to path role
                rolePath: path // Store path for updates/deletes
              });
            }
          });
        } catch (err) {
          console.warn(`Error fetching ${role}s:`, err);
        }
      }

      // Remove 'email' field from Firestore docs (one-time cleanup)
      if (emailDocs.length > 0) {
        const chunkSize = 400;
        for (let i = 0; i < emailDocs.length; i += chunkSize) {
          const batch = writeBatch(db);
          emailDocs.slice(i, i + chunkSize).forEach((ref) => batch.update(ref, { email: deleteField() }));
          await batch.commit();
        }
      }

      setEmployees(employeesData);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setEmployeesError('Failed to fetch employees');
    } finally {
      setEmployeesLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setProductsLoading(true);
      setProductsError(null);
      // Fetch from any 'products' collection group and filter client-side to leaf docs
      const querySnapshot = await getDocs(collectionGroup(db, 'products'));
      const productsData = [];
      querySnapshot.forEach((snap) => {
        const data = snap.data() || {};

        // Normalize fields so UI can always use name and minPrice
        const rawPrice =
          typeof data.price === 'number'
            ? data.price
            : typeof data.productPrice === 'number'
              ? data.productPrice
              : 0;

        const rawMinPrice =
          typeof data.minPrice === 'number'
            ? data.minPrice
            : typeof data.bottomPrice === 'number'
              ? data.bottomPrice
              : 0;

        const normalizedName = data.name || data.productName || '';

        const discount = rawPrice && rawMinPrice
          ? ((rawPrice - rawMinPrice) / rawPrice * 100)
          : 0;

        productsData.push({
          id: snap.id,
          path: snap.ref.path,
          ...data,
          name: normalizedName,
          price: rawPrice,
          minPrice: rawMinPrice,
          discount,
        });
      });
      const leafOnly = productsData.filter(p =>
        typeof p.path === 'string' &&
        p.path.includes('/categories/') &&
        p.path.includes('/subcategories/') &&
        /\/products\//.test(p.path) &&
        typeof p.price === 'number'
      );
      setProducts(leafOnly);
    } catch (err) {
      console.error('Error fetching products:', err);
      setProductsError('Failed to fetch products');
    } finally {
      setProductsLoading(false);
    }
  };

  // Companies, Categories, Subcategories (extracted from existing products)
  const [companies] = useState(['LG', 'Samsung', 'Whirlpool', 'Godrej', 'Haier', 'Voltas', 'Blue Star', 'Carrier']);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  // Extract categories and subcategories from existing products
  const extractCategoriesFromProducts = (productsData) => {
    const uniqueCategories = new Set();
    const subcatsMap = {};
    
    productsData.forEach(product => {
      if (product.category) {
        uniqueCategories.add(product.category);
        
        // Initialize subcategories array for this category if not exists
        if (!subcatsMap[product.category]) {
          subcatsMap[product.category] = new Set();
        }
        
        // Add subcategory if it exists
        if (product.subcategory) {
          subcatsMap[product.category].add(product.subcategory);
        }
      }
    });
    
    // Convert Sets to sorted arrays
    const sortedCategories = Array.from(uniqueCategories).sort();
    const sortedSubcategories = {};
    Object.entries(subcatsMap).forEach(([cat, subcats]) => {
      sortedSubcategories[cat] = Array.from(subcats).sort();
    });
    
    setCategories(sortedCategories);
    setSubcategories(sortedSubcategories);
  };

  // Extract categories and subcategories whenever products change
  useEffect(() => {
    if (products.length > 0) {
      extractCategoriesFromProducts(products);
    } else {
      setCategories([]);
      setSubcategories({});
    }
  }, [products]);

  // Dark mode effect
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Persist product alerts setting
  useEffect(() => {
    localStorage.setItem('productAlertsEnabled', JSON.stringify(productAlertsEnabled));
  }, [productAlertsEnabled]);

  // Persist authentication state
  useEffect(() => {
    localStorage.setItem('isAuthenticated', JSON.stringify(isAuthenticated));
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
  }, [isAuthenticated, currentUser]);

  // Auth functions
  const login = (mobile, password) => {
    // Mock login - accept admin credentials (10-digit mobile number)
    if (mobile === '9876543210' && password === 'admin123') {
      const user = { mobile, name: 'Admin User', role: 'admin' };
      setCurrentUser(user);
      setIsAuthenticated(true);
      return { success: true };
    }
    return { success: false, error: 'Invalid mobile number or password' };
  };

  const logout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('currentUser');
  };

  // Employee CRUD
  const addEmployee = async (employee) => {
    try {
      setEmployeesLoading(true);
      setEmployeesError(null);
      const { email: _omitEmail, ...rest } = employee || {};
      const employeeData = {
        ...rest,
        role: employee.role || 'salesman', // Use provided role or default to salesman
        createdAt: new Date().toISOString(), // Timestamp
        loginId: employee.mobile, // Use mobile number for login
        password: employee.password, // Use admin-provided password
      };

      // Determine path based on role
      const rolePathMap = {
        telecaller: ['admin-data', 'root', 'employees', 'telecaller', 'telecallers'],
        admin: ['admin-data', 'root', 'employees', 'admin', 'admins'],
        salesman: ['admin-data', 'root', 'employees', 'salesman', 'salesman'],
      };

      const path = rolePathMap[employeeData.role] || rolePathMap.salesman;
      const docRef = await addDoc(collection(db, ...path), employeeData);
      const newEmployee = {
        id: docRef.id,
        ...employeeData,
        rolePath: path,
      };
      setEmployees(prev => [...prev, newEmployee]);
      return newEmployee;
    } catch (err) {
      console.error('Error adding employee:', err);
      setEmployeesError('Failed to add employee');
      throw err;
    } finally {
      setEmployeesLoading(false);
    }
  };

  const updateEmployee = async (id, updatedData) => {
    try {
      setEmployeesLoading(true);
      setEmployeesError(null);
      const { email: _omitEmailUpd, ...restUpd } = updatedData || {};
      const employeeData = {
        ...restUpd,
        loginId: updatedData.mobile,
        updatedAt: new Date().toISOString() // Add update timestamp
        // Note: role and createdAt are preserved from existing data
      };

      // Find employee to get its role path
      const employee = employees.find(emp => emp.id === id);
      const rolePathMap = {
        telecaller: ['admin-data', 'root', 'employees', 'telecaller', 'telecallers'],
        admin: ['admin-data', 'root', 'employees', 'admin', 'admins'],
        salesman: ['admin-data', 'root', 'employees', 'salesman', 'salesman'],
      };

      // Use rolePath from employee if available, otherwise determine from role
      const path = employee?.rolePath || rolePathMap[employee?.role] || rolePathMap.salesman;
      const employeeRef = doc(db, ...path, id);
      await updateDoc(employeeRef, employeeData);

      setEmployees(employees.map(emp =>
        emp.id === id ? { ...emp, ...employeeData } : emp
      ));
    } catch (err) {
      console.error('Error updating employee:', err);
      setEmployeesError('Failed to update employee');
      throw err;
    } finally {
      setEmployeesLoading(false);
    }
  };

  const deleteEmployee = async (id) => {
    try {
      setEmployeesLoading(true);
      setEmployeesError(null);

      // Find employee to get its role path
      const employee = employees.find(emp => emp.id === id);
      const rolePathMap = {
        telecaller: ['admin-data', 'root', 'employees', 'telecaller', 'telecallers'],
        admin: ['admin-data', 'root', 'employees', 'admin', 'admins'],
        salesman: ['admin-data', 'root', 'employees', 'salesman', 'salesman'],
      };

      // Use rolePath from employee if available, otherwise determine from role
      const path = employee?.rolePath || rolePathMap[employee?.role] || rolePathMap.salesman;
      await deleteDoc(doc(db, ...path, id));
      // Always refresh from Firestore after delete
      await fetchEmployees();
    } catch (err) {
      console.error('Error deleting employee:', err);
      setEmployeesError('Failed to delete employee');
      throw err;
    } finally {
      setEmployeesLoading(false);
    }
  };

  // Product CRUD
  const addProduct = async (product) => {
    try {
      setProductsLoading(true);
      setProductsError(null);

      // Validate required fields
      if (!product.category || !product.subcategory) {
        throw new Error('Category and Subcategory are required');
      }

      // Store both normalized and legacy fields for compatibility
      const productData = {
        name: product.name,
        minPrice: product.minPrice,
        productName: product.name, // legacy
        bottomPrice: product.minPrice, // legacy
        price: product.price,
        category: product.category,
        subcategory: product.subcategory,
        incentive: product.incentive,
        mrp: product.mrp,
        createdAt: new Date(),
      };

      // Only add company if it's provided
      if (product.company) {
        productData.company = product.company;
      }

      const category = (product.category || 'Unknown').trim();
      const subcategory = (product.subcategory || 'Unknown').trim();

      // Correct path: admin-data/root/categories/{category}/subcategories/{subcategory}/products
      const categoryRef = doc(collection(db, 'admin-data', 'root', 'categories'), category);
      await setDoc(categoryRef, { name: category }, { merge: true });

      const subcatRef = doc(collection(categoryRef, 'subcategories'), subcategory);
      await setDoc(subcatRef, { name: subcategory }, { merge: true });

      const productsCol = collection(subcatRef, 'products');
      const docRef = await addDoc(productsCol, productData);

      const newPath = docRef.path;
      const newProduct = { id: docRef.id, path: newPath, ...productData };
      setProducts(prev => [...prev, newProduct]);
      return newProduct;
    } catch (err) {
      console.error('Error adding product:', err);
      setProductsError('Failed to add product');
      throw err;
    } finally {
      setProductsLoading(false);
    }
  };

  const updateProduct = async (id, updatedData) => {
    try {
      setProductsLoading(true);
      setProductsError(null);
      const discount = updatedData.price && updatedData.minPrice
        ? ((updatedData.price - updatedData.minPrice) / updatedData.price * 100).toFixed(2)
        : null;

      const productData = {
        ...updatedData,
        name: updatedData.name,
        minPrice: updatedData.minPrice,
        productName: updatedData.name, // legacy
        bottomPrice: updatedData.minPrice, // legacy
        discount: discount ? parseFloat(discount) : updatedData.discount,
        mrp: updatedData.mrp,
      };

      // Find product path from state
      const existing = products.find(p => p.id === id);
      if (!existing || !existing.path) {
        throw new Error('Product path not found for update');
      }
      const productRef = doc(db, ...existing.path.split('/'));
      await updateDoc(productRef, productData);

      setProducts(products.map(prod => (prod.id === id ? { ...prod, ...productData } : prod)));
    } catch (err) {
      console.error('Error updating product:', err);
      setProductsError('Failed to update product');
      throw err;
    } finally {
      setProductsLoading(false);
    }
  };

  const deleteProduct = async (id) => {
    try {
      setProductsLoading(true);
      setProductsError(null);
      const existing = products.find(p => p.id === id);
      if (!existing || !existing.path) {
        throw new Error('Product path not found for delete');
      }
      await deleteDoc(doc(db, ...existing.path.split('/')));
      setProducts(products.filter(prod => prod.id !== id));
    } catch (err) {
      console.error('Error deleting product:', err);
      setProductsError('Failed to delete product');
      throw err;
    } finally {
      setProductsLoading(false);
    }
  };

  const deleteAllProducts = async () => {
    try {
      setProductsLoading(true);
      setProductsError(null);
      const batch = writeBatch(db);
      const querySnapshot = await getDocs(collectionGroup(db, 'products'));
      let ops = 0;
      querySnapshot.forEach((snap) => {
        const pathStr = snap.ref.path;
        if (
          pathStr.includes('/categories/') &&
          pathStr.includes('/subcategories/') &&
          /\/products\//.test(pathStr)
        ) {
          batch.delete(snap.ref);
          ops++;
        }
      });
      if (ops > 0) await batch.commit();
      setProducts([]);
    } catch (err) {
      console.error('Error deleting all products:', err);
      setProductsError('Failed to delete all products');
      throw err;
    } finally {
      setProductsLoading(false);
    }
  };

  // Delete entire company hierarchy: categories, subcategories, and products
  const deleteCompanyHierarchy = async (company) => {
    if (!company) return;
    try {
      setProductsLoading(true);
      setProductsError(null);

      const companyRef = doc(collection(db, 'admin-data', 'root', 'products'), company);
      const batch = writeBatch(db);

      // Since Firestore batches are limited, perform a full recursive deletion with fresh snapshots
      const categoriesSnap2 = await getDocs(collection(companyRef, 'categories'));
      for (const catDoc of categoriesSnap2.docs) {
        const categoryRef = catDoc.ref;
        const subcatsSnap = await getDocs(collection(categoryRef, 'subcategories'));
        for (const subDoc of subcatsSnap.docs) {
          const subcatRef = subDoc.ref;
          const prodsSnap = await getDocs(collection(subcatRef, 'products'));
          prodsSnap.forEach((prodDoc) => {
            batch.delete(prodDoc.ref);
          });
          batch.delete(subcatRef);
        }
        batch.delete(categoryRef);
      }

      batch.delete(companyRef);
      await batch.commit();
      await fetchProducts();
    } catch (err) {
      console.error('Error deleting company hierarchy:', err);
      setProductsError('Failed to delete company');
      throw err;
    } finally {
      setProductsLoading(false);
    }
  };

  // Delete a single category and its subcategories/products for a given company
  const deleteCategoryHierarchy = async (company, category) => {
    if (!company || !category) return;
    try {
      setProductsLoading(true);
      setProductsError(null);

      const companyRef = doc(collection(db, 'admin-data', 'root', 'products'), company);
      const categoryRef = doc(collection(companyRef, 'categories'), category);
      const batch = writeBatch(db);

      const subcatsSnap = await getDocs(collection(categoryRef, 'subcategories'));
      for (const subDoc of subcatsSnap.docs) {
        const subcatRef = subDoc.ref;
        const prodsSnap = await getDocs(collection(subcatRef, 'products'));
        prodsSnap.forEach((prodDoc) => {
          batch.delete(prodDoc.ref);
        });
        batch.delete(subcatRef);
      }

      batch.delete(categoryRef);
      await batch.commit();
      await fetchProducts();
    } catch (err) {
      console.error('Error deleting category hierarchy:', err);
      setProductsError('Failed to delete category');
      throw err;
    } finally {
      setProductsLoading(false);
    }
  };

  // Delete a single subcategory and all its products for a given company/category
  const deleteSubcategoryHierarchy = async (company, category, subcategory) => {
    if (!company || !category || !subcategory) return;
    try {
      setProductsLoading(true);
      setProductsError(null);

      const companyRef = doc(collection(db, 'admin-data', 'root', 'products'), company);
      const categoryRef = doc(collection(companyRef, 'categories'), category);
      const subcatRef = doc(collection(categoryRef, 'subcategories'), subcategory);
      const batch = writeBatch(db);

      const prodsSnap = await getDocs(collection(subcatRef, 'products'));
      prodsSnap.forEach((prodDoc) => {
        batch.delete(prodDoc.ref);
      });

      batch.delete(subcatRef);
      await batch.commit();
      await fetchProducts();
    } catch (err) {
      console.error('Error deleting subcategory hierarchy:', err);
      setProductsError('Failed to delete subcategory');
      throw err;
    } finally {
      setProductsLoading(false);
    }
  };

  const importProductsFromExcel = async (excelProducts) => {
    try {
      setProductsLoading(true);
      setProductsError(null);
      const batch = writeBatch(db);
      let count = 0;

      for (const product of excelProducts) {
        // Validate and trim hierarchy fields, ensure no empty strings
        const category = (product.category || 'Unknown').trim() || 'Unknown';
        const subcategory = (product.subcategory || 'Unknown').trim() || 'Unknown';

        // Validate product name
        const productName = (product.name || 'Unknown Product').trim() || 'Unknown Product';

        // Store both normalized and legacy fields for compatibility
        const productData = {
          name: productName,
          productName, // legacy
          mrp: parseFloat(product.mrp) || 0,
          minPrice: parseFloat(product.minPrice) || 0,
          bottomPrice: parseFloat(product.minPrice) || 0, // legacy
          price: parseFloat(product.price) || 0,
          category,
          subcategory,
          incentive: parseFloat(product.incentive) || 0,
          createdAt: new Date(),
        };

        // Only add company if provided
        if (product.company && product.company !== 'Unknown') {
          productData.company = product.company;
        }

        // Correct path: admin-data/root/categories/{category}/subcategories/{subcategory}/products
        const categoryRef = doc(collection(db, 'admin-data', 'root', 'categories'), category);
        batch.set(categoryRef, { name: category }, { merge: true });

        const subcatRef = doc(collection(categoryRef, 'subcategories'), subcategory);
        batch.set(subcatRef, { name: subcategory }, { merge: true });

        // Generate a unique ID for the product
        const prodRef = doc(collection(subcatRef, 'products'));
        batch.set(prodRef, productData);
        count++;
      }

      await batch.commit();
      await fetchProducts();
      return count;
    } catch (err) {
      console.error('Error importing products:', err);
      setProductsError('Failed to import products');
      throw err;
    } finally {
      setProductsLoading(false);
    }
  };

  // Offers CRUD
  const fetchOffers = async () => {
    try {
      setOffersLoading(true);
      setOffersError(null);
      const offersData = [];

      // Get all month documents
      const monthsSnapshot = await getDocs(collection(db, 'offers'));

      for (const monthDoc of monthsSnapshot.docs) {
        const monthData = monthDoc.data();

        // Get items for this month
        const itemsQuery = collection(monthDoc.ref, 'items');
        const itemsSnapshot = await getDocs(itemsQuery);
        const items = [];

        itemsSnapshot.forEach(itemDoc => {
          items.push({ id: itemDoc.id, ...itemDoc.data() });
        });

        if (items.length > 0) {
          offersData.push({
            monthId: monthDoc.id,
            ...monthData,
            items,
            itemCount: items.length
          });
        }
      }

      // Sort by year and month (newest first) - simplified sorting
      offersData.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        // Convert month name to number for proper sorting
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const aMonthNum = monthNames.indexOf(a.month) + 1;
        const bMonthNum = monthNames.indexOf(b.month) + 1;
        return bMonthNum - aMonthNum;
      });

      setOffers(offersData);
    } catch (err) {
      console.error('Error fetching offers:', err);
      setOffersError('Failed to fetch offers');
    } finally {
      setOffersLoading(false);
    }
  };

  // Helper function to upload base64 image to Firebase Storage
  const uploadImageToStorage = async (base64String, path) => {
    try {
      // Convert base64 to blob
      const response = await fetch(base64String);
      const blob = await response.blob();

      // Create a reference to the storage location
      const storageRef = ref(storage, path);

      // Upload the blob
      await uploadBytes(storageRef, blob);

      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const addOffer = async (offerData) => {
    try {
      setOffersError(null);

      const { title, description, images, images2, month, year } = offerData;

      // Create month document ID (e.g., "2025-01")
      const monthDocId = `${year}-${month.toString().padStart(2, '0')}`;

      // Get month names
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];

      const monthName = monthNames[parseInt(month) - 1];
      const displayLabel = `${monthName} ${year}`;

      // Check if month document exists, create if not
      const monthDocRef = doc(db, 'offers', monthDocId);
      const monthDoc = await getDoc(monthDocRef);

      if (!monthDoc.exists()) {
        await setDoc(monthDocRef, {
          month: monthName,
          year: parseInt(year),
          displayLabel,
          createdAt: new Date().toISOString()
        });
      }

      // Upload images to Firebase Storage and get URLs
      const imageUrls = [];
      if (images && images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          const timestamp = Date.now();
          const randomId = Math.random().toString(36).substr(2, 9);
          const imagePath = `offers/${monthDocId}/incentive_${timestamp}_${randomId}.jpg`;
          const url = await uploadImageToStorage(images[i], imagePath);
          imageUrls.push(url);
        }
      }

      const img2Urls = [];
      if (images2 && images2.length > 0) {
        for (let i = 0; i < images2.length; i++) {
          const timestamp = Date.now();
          const randomId = Math.random().toString(36).substr(2, 9);
          const imagePath = `offers/${monthDocId}/focus_${timestamp}_${randomId}.jpg`;
          const url = await uploadImageToStorage(images2[i], imagePath);
          img2Urls.push(url);
        }
      }

      // Create offer in items subcollection
      const offerDataToSave = {
        title,
        description,
        imageUrls, // Store download URLs instead of base64
        img2Urls, // Store download URLs instead of base64
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const offerRef = await addDoc(collection(monthDocRef, 'items'), offerDataToSave);

      // Update state optimistically instead of refetching
      const newOffer = { id: offerRef.id, ...offerDataToSave };

      setOffers(prevOffers => {
        const existingMonthIndex = prevOffers.findIndex(m => m.monthId === monthDocId);

        if (existingMonthIndex >= 0) {
          // Month exists, add offer to it
          const updatedOffers = [...prevOffers];
          updatedOffers[existingMonthIndex] = {
            ...updatedOffers[existingMonthIndex],
            items: [newOffer, ...updatedOffers[existingMonthIndex].items],
            itemCount: updatedOffers[existingMonthIndex].itemCount + 1
          };
          return updatedOffers;
        } else {
          // New month, create it
          const newMonth = {
            monthId: monthDocId,
            month: monthName,
            year: parseInt(year),
            displayLabel,
            items: [newOffer],
            itemCount: 1
          };
          return [newMonth, ...prevOffers].sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            const monthNames = [
              'January', 'February', 'March', 'April', 'May', 'June',
              'July', 'August', 'September', 'October', 'November', 'December'
            ];
            const aMonthNum = monthNames.indexOf(a.month) + 1;
            const bMonthNum = monthNames.indexOf(b.month) + 1;
            return bMonthNum - aMonthNum;
          });
        }
      });

      return newOffer;
    } catch (err) {
      console.error('Error adding offer:', err);
      setOffersError('Failed to add offer');
      throw err;
    }
  };

  const updateOffer = async (monthId, offerId, updates) => {
    try {
      setOffersError(null);

      const offerDocRef = doc(db, 'offers', monthId, 'items', offerId);

      // Process images - upload new base64 images, keep existing URLs
      let processedImageUrls = updates.imageUrls || [];
      let processedImg2Urls = updates.img2Urls || [];

      // Upload new base64 images for imageUrls
      if (updates.imageUrls && updates.imageUrls.length > 0) {
        processedImageUrls = [];
        for (let i = 0; i < updates.imageUrls.length; i++) {
          const image = updates.imageUrls[i];
          // Check if it's a base64 string (starts with data:image)
          if (image.startsWith('data:image')) {
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substr(2, 9);
            const imagePath = `offers/${monthId}/incentive_${timestamp}_${randomId}.jpg`;
            const url = await uploadImageToStorage(image, imagePath);
            processedImageUrls.push(url);
          } else {
            // It's already a URL, keep it
            processedImageUrls.push(image);
          }
        }
      }

      // Upload new base64 images for img2Urls
      if (updates.img2Urls && updates.img2Urls.length > 0) {
        processedImg2Urls = [];
        for (let i = 0; i < updates.img2Urls.length; i++) {
          const image = updates.img2Urls[i];
          // Check if it's a base64 string (starts with data:image)
          if (image.startsWith('data:image')) {
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substr(2, 9);
            const imagePath = `offers/${monthId}/focus_${timestamp}_${randomId}.jpg`;
            const url = await uploadImageToStorage(image, imagePath);
            processedImg2Urls.push(url);
          } else {
            // It's already a URL, keep it
            processedImg2Urls.push(image);
          }
        }
      }

      const updateData = {
        ...updates,
        imageUrls: processedImageUrls,
        img2Urls: processedImg2Urls,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(offerDocRef, updateData);

      // Update state optimistically
      setOffers(prevOffers =>
        prevOffers.map(month =>
          month.monthId === monthId
            ? {
              ...month,
              items: month.items.map(offer =>
                offer.id === offerId ? { ...offer, ...updateData } : offer
              )
            }
            : month
        )
      );
    } catch (err) {
      console.error('Error updating offer:', err);
      setOffersError('Failed to update offer');
      throw err;
    }
  };

  const deleteOffer = async (monthId, offerId) => {
    try {
      setOffersError(null);

      const offerDocRef = doc(db, 'offers', monthId, 'items', offerId);
      await deleteDoc(offerDocRef);

      // Update state optimistically
      setOffers(prevOffers =>
        prevOffers.map(month =>
          month.monthId === monthId
            ? {
              ...month,
              items: month.items.filter(offer => offer.id !== offerId),
              itemCount: month.itemCount - 1
            }
            : month
        ).filter(month => month.itemCount > 0) // Remove empty months
      );
    } catch (err) {
      console.error('Error deleting offer:', err);
      setOffersError('Failed to delete offer');
      throw err;
    }
  };

  const toggleOfferStatus = async (monthId, offerId) => {
    try {
      setOffersError(null);

      const offerDocRef = doc(db, 'offers', monthId, 'items', offerId);
      const offerDoc = await getDoc(offerDocRef);

      if (offerDoc.exists()) {
        const currentData = offerDoc.data();
        const newStatus = !currentData.isActive;

        await updateDoc(offerDocRef, {
          isActive: newStatus,
          updatedAt: new Date().toISOString()
        });

        // Update state optimistically
        setOffers(prevOffers =>
          prevOffers.map(month =>
            month.monthId === monthId
              ? {
                ...month,
                items: month.items.map(offer =>
                  offer.id === offerId
                    ? { ...offer, isActive: newStatus, updatedAt: new Date().toISOString() }
                    : offer
                )
              }
              : month
          )
        );
      }
    } catch (err) {
      console.error('Error toggling offer status:', err);
      setOffersError('Failed to toggle offer status');
      throw err;
    }
  };

  // Catalogs CRUD
  const fetchCatalogs = async () => {
    try {
      setCatalogsLoading(true);
      setCatalogsError(null);
      const catalogsData = [];

      const catalogsSnapshot = await getDocs(collection(db, 'catalogs'));

      catalogsSnapshot.forEach(catalogDoc => {
        catalogsData.push({ id: catalogDoc.id, ...catalogDoc.data() });
      });

      // Sort by creation date (newest first)
      catalogsData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setCatalogs(catalogsData);
    } catch (err) {
      console.error('Error fetching catalogs:', err);
      setCatalogsError('Failed to fetch catalogs');
    } finally {
      setCatalogsLoading(false);
    }
  };

  const addCatalog = async (catalogData) => {
    try {
      setCatalogsError(null);

      const { title, description, pdfFile } = catalogData;

      // Upload PDF to Firebase Storage
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substr(2, 9);
      const fileName = pdfFile.name;
      const pdfPath = `catalogs/catalog_${timestamp}_${randomId}.pdf`;

      // Create a reference to the storage location
      const storageRef = ref(storage, pdfPath);

      // Upload the PDF file
      await uploadBytes(storageRef, pdfFile);

      // Get the download URL
      const pdfUrl = await getDownloadURL(storageRef);

      // Create catalog document in Firestore
      const catalogDataToSave = {
        title,
        description: description || '',
        pdfUrl,
        fileName,
        storagePath: pdfPath,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const catalogRef = await addDoc(collection(db, 'catalogs'), catalogDataToSave);

      // Update state optimistically
      const newCatalog = { id: catalogRef.id, ...catalogDataToSave };
      setCatalogs(prevCatalogs => [newCatalog, ...prevCatalogs]);

      return newCatalog;
    } catch (err) {
      console.error('Error adding catalog:', err);
      setCatalogsError('Failed to add catalog');
      throw err;
    }
  };

  const deleteCatalog = async (catalogId) => {
    try {
      setCatalogsError(null);

      // Find the catalog to get its storage path
      const catalog = catalogs.find(c => c.id === catalogId);
      if (!catalog) {
        throw new Error('Catalog not found');
      }

      // Delete PDF from Storage
      if (catalog.storagePath) {
        const storageRef = ref(storage, catalog.storagePath);
        try {
          await deleteObject(storageRef);
        } catch (storageErr) {
          console.warn('Error deleting PDF from storage:', storageErr);
          // Continue with Firestore deletion even if storage deletion fails
        }
      }

      // Delete catalog document from Firestore
      const catalogDocRef = doc(db, 'catalogs', catalogId);
      await deleteDoc(catalogDocRef);

      // Update state optimistically
      setCatalogs(prevCatalogs => prevCatalogs.filter(c => c.id !== catalogId));
    } catch (err) {
      console.error('Error deleting catalog:', err);
      setCatalogsError('Failed to delete catalog');
      throw err;
    }
  };

  const value = {
    // Auth
    isAuthenticated,
    currentUser,
    login,
    logout,

    // Theme
    darkMode,
    setDarkMode,
    productAlertsEnabled,
    setProductAlertsEnabled,

    // Employees
    employees,
    employeesLoading,
    employeesError,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    fetchEmployees,

    // Products
    products,
    productsLoading,
    productsError,
    addProduct,
    updateProduct,
    deleteProduct,
    deleteAllProducts,
    importProductsFromExcel,
    fetchProducts,

    // Offers
    offers,
    offersLoading,
    offersError,
    addOffer,
    updateOffer,
    deleteOffer,
    toggleOfferStatus,
    fetchOffers,

    // Catalogs
    catalogs,
    catalogsLoading,
    catalogsError,
    addCatalog,
    deleteCatalog,
    fetchCatalogs,

    // Dropdowns
    companies,
    categories,
    subcategories,
    deleteCompanyHierarchy,
    deleteCategoryHierarchy,
    deleteSubcategoryHierarchy,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

