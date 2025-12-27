// Firebase Firestore Hierarchy Creation Script
// Make sure to install firebase: npm install firebase

// Import Firebase modules
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';

// Firebase configuration - Replace with your config
const firebaseConfig = {
  // Add your Firebase config here
  apiKey: "AIzaSyCW86RlbmSTGL9MHZZ_myw7C3zClp69DDA",
  authDomain: "admin-panel-430b8.firebaseapp.com",
  projectId: "admin-panel-430b8",
  storageBucket: "admin-panel-430b8.firebasestorage.app",
  messagingSenderId: "233849790581",
  appId: "1:233849790581:web:5a002f3c59a6582944983c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createFirestoreHierarchy() {
  console.log('Creating Firestore hierarchy...');
  
  try {
    // Step 1: Create company root node
    await setDoc(doc(db, 'company', 'admin-data'), {
      name: 'Admin Panel Data',
      description: 'Root node containing employees and products collections',
      createdAt: new Date().toISOString()
    });
    console.log('✓ Created company root node');

    // Step 2: Create Employees Collection with sample data
    const employeesData = [
      {
        id: 'emp001',
        name: 'Rajesh Kumar',
        mobile: '+91 9876543210',
        email: 'rajesh.kumar@company.com',
        password: 'emp123',
        role: 'employee',
        createdAt: new Date().toISOString()
      },
      {
        id: 'emp002',
        name: 'Priya Sharma', 
        mobile: '+91 9876543211',
        email: 'priya.sharma@company.com',
        password: 'emp456',
        role: 'employee',
        createdAt: new Date().toISOString()
      },
      {
        id: 'emp003',
        name: 'Amit Patel',
        mobile: '+91 9876543212',
        email: 'amit.patel@company.com',
        password: 'emp789',
        role: 'manager',
        createdAt: new Date().toISOString()
      }
    ];

    // Create employees collection under company node
    for (const emp of employeesData) {
      // Create employee document
      await setDoc(doc(db, 'company', 'admin-data', 'employees', emp.id), emp);
      
      // Create employeeDetails subcollection
      await setDoc(doc(db, 'company', 'admin-data', 'employees', emp.id, 'employeeDetails', 'personal'), {
          personalInfo: {
            fullName: emp.name,
            contactNumber: emp.mobile,
            emailAddress: emp.email,
            department: 'Sales',
            joiningDate: new Date().toISOString()
          },
          loginCredentials: {
            loginId: emp.mobile,
            password: emp.password,
            lastLogin: null
          },
          permissions: {
            canViewProducts: true,
            canEditProducts: emp.role === 'manager',
            canDeleteProducts: emp.role === 'manager'
          },
          createdAt: new Date().toISOString()
        });
      
      // Add additional employee details
      await setDoc(doc(db, 'company', 'admin-data', 'employees', emp.id, 'employeeDetails', 'work'), {
          workInfo: {
            position: emp.role,
            salary: emp.role === 'manager' ? 50000 : 30000,
            workLocation: 'Mumbai Office',
            reportingManager: emp.role === 'employee' ? 'emp003' : null
          },
          performance: {
            rating: 4.2,
            lastReview: new Date().toISOString(),
            targets: {
              monthly: 100000,
              achieved: 85000
            }
          },
          createdAt: new Date().toISOString()
        });
      
      console.log(`✓ Created employee: ${emp.name} with details`);
    }

    // Step 3: Create Products Collection Hierarchy
    const companiesData = [
      {
        id: 'lg',
        name: 'LG Electronics',
        country: 'South Korea',
        established: 1958
      },
      {
        id: 'samsung',
        name: 'Samsung',
        country: 'South Korea', 
        established: 1938
      },
      {
        id: 'whirlpool',
        name: 'Whirlpool Corporation',
        country: 'USA',
        established: 1911
      },
      {
        id: 'godrej',
        name: 'Godrej & Boyce',
        country: 'India',
        established: 1897
      }
    ];

    const categoriesData = {
      'lg': [
        { id: 'television', name: 'Television', description: 'Smart TVs and LED displays' },
        { id: 'refrigerator', name: 'Refrigerator', description: 'Cooling appliances' },
        { id: 'air-conditioner', name: 'Air Conditioner', description: 'Cooling and heating systems' },
        { id: 'washing-machine', name: 'Washing Machine', description: 'Laundry appliances' }
      ],
      'samsung': [
        { id: 'television', name: 'Television', description: 'QLED and OLED TVs' },
        { id: 'mobile', name: 'Mobile Phone', description: 'Smartphones and accessories' },
        { id: 'refrigerator', name: 'Refrigerator', description: 'Smart refrigerators' },
        { id: 'air-conditioner', name: 'Air Conditioner', description: 'Energy efficient ACs' }
      ],
      'whirlpool': [
        { id: 'refrigerator', name: 'Refrigerator', description: 'American style refrigerators' },
        { id: 'washing-machine', name: 'Washing Machine', description: 'Front and top load washers' },
        { id: 'microwave', name: 'Microwave Oven', description: 'Cooking appliances' }
      ],
      'godrej': [
        { id: 'refrigerator', name: 'Refrigerator', description: 'Energy efficient refrigerators' },
        { id: 'air-conditioner', name: 'Air Conditioner', description: 'Inverter ACs' },
        { id: 'washing-machine', name: 'Washing Machine', description: 'Semi and fully automatic' }
      ]
    };

    const subcategoriesData = {
      'television': [
        { id: 'led-tv', name: 'LED TV', description: 'LED backlit displays' },
        { id: 'oled-tv', name: 'OLED TV', description: 'Organic LED displays' },
        { id: 'qled-tv', name: 'QLED TV', description: 'Quantum dot displays' },
        { id: 'smart-tv', name: 'Smart TV', description: 'Internet connected TVs' }
      ],
      'refrigerator': [
        { id: 'single-door', name: 'Single Door', description: 'Compact refrigerators' },
        { id: 'double-door', name: 'Double Door', description: 'Two compartment fridges' },
        { id: 'side-by-side', name: 'Side by Side', description: 'French door style' },
        { id: 'bottom-freezer', name: 'Bottom Freezer', description: 'Freezer at bottom' }
      ],
      'air-conditioner': [
        { id: 'split-ac', name: 'Split AC', description: 'Wall mounted units' },
        { id: 'window-ac', name: 'Window AC', description: 'Window fitted units' },
        { id: 'inverter-ac', name: 'Inverter AC', description: 'Energy saving ACs' },
        { id: 'cassette-ac', name: 'Cassette AC', description: 'Ceiling mounted units' }
      ],
      'mobile': [
        { id: 'smartphone', name: 'Smartphone', description: 'Android and iOS phones' },
        { id: 'feature-phone', name: 'Feature Phone', description: 'Basic mobile phones' },
        { id: 'accessories', name: 'Mobile Accessories', description: 'Cases, chargers, etc.' }
      ],
      'washing-machine': [
        { id: 'front-load', name: 'Front Load', description: 'Front loading washers' },
        { id: 'top-load', name: 'Top Load', description: 'Top loading washers' },
        { id: 'semi-automatic', name: 'Semi Automatic', description: 'Manual operation required' }
      ],
      'microwave': [
        { id: 'solo', name: 'Solo Microwave', description: 'Basic heating only' },
        { id: 'grill', name: 'Grill Microwave', description: 'With grilling function' },
        { id: 'convection', name: 'Convection Microwave', description: 'Full cooking capabilities' }
      ]
    };

    const sampleProducts = {
      'lg-television-led-tv': [
        {
          id: 'lg-32lm563bptc',
          name: 'LG 32LM563BPTC 32 inch LED TV',
          price: 18999,
          minPrice: 16999,
          description: '32 inch HD Ready LED TV with WebOS',
          specifications: {
            screenSize: '32 inches',
            resolution: '1366x768',
            smartTV: true,
            warranty: '1 year'
          }
        },
        {
          id: 'lg-43um7300pta',
          name: 'LG 43UM7300PTA 43 inch 4K LED TV',
          price: 35999,
          minPrice: 32999,
          description: '43 inch 4K UHD Smart LED TV',
          specifications: {
            screenSize: '43 inches',
            resolution: '3840x2160',
            smartTV: true,
            warranty: '1 year'
          }
        }
      ],
      'samsung-mobile-smartphone': [
        {
          id: 'samsung-galaxy-s21',
          name: 'Samsung Galaxy S21 5G',
          price: 69999,
          minPrice: 65999,
          description: 'Latest Samsung flagship smartphone',
          specifications: {
            storage: '128GB',
            ram: '8GB',
            camera: '64MP Triple Camera',
            battery: '4000mAh'
          }
        },
        {
          id: 'samsung-galaxy-a52',
          name: 'Samsung Galaxy A52',
          price: 26499,
          minPrice: 24499,
          description: 'Mid-range smartphone with great camera',
          specifications: {
            storage: '128GB',
            ram: '6GB',
            camera: '64MP Quad Camera',
            battery: '4500mAh'
          }
        }
      ],
      'whirlpool-refrigerator-double-door': [
        {
          id: 'whirlpool-if305elt',
          name: 'Whirlpool IF 305 ELT 292L Double Door Refrigerator',
          price: 28999,
          minPrice: 26999,
          description: 'Energy efficient double door refrigerator',
          specifications: {
            capacity: '292 Liters',
            starRating: '3 Star',
            defrostType: 'Frost Free',
            warranty: '1 year'
          }
        }
      ]
    };

    // Create the complete hierarchy
    for (const company of companiesData) {
      // Create company document under products collection
      await setDoc(doc(db, 'company', 'admin-data', 'products', company.id), {
          companyName: company.name,
          country: company.country,
          established: company.established,
          createdAt: new Date().toISOString()
        });
      
      console.log(`✓ Created company: ${company.name}`);
      
      // Create categories for this company
      const categories = categoriesData[company.id] || [];
      for (const category of categories) {
        await setDoc(doc(db, 'company', 'admin-data', 'products', company.id, 'categories', category.id), {
            categoryName: category.name,
            description: category.description,
            createdAt: new Date().toISOString()
          });
        
        console.log(`  ✓ Created category: ${category.name}`);
        
        // Create subcategories for this category
        const subcategories = subcategoriesData[category.id] || [];
        for (const subcategory of subcategories) {
          await setDoc(doc(db, 'company', 'admin-data', 'products', company.id, 'categories', category.id, 'subcategories', subcategory.id), {
              subcategoryName: subcategory.name,
              description: subcategory.description,
              createdAt: new Date().toISOString()
            });
          
          console.log(`    ✓ Created subcategory: ${subcategory.name}`);
          
          // Add products to this subcategory
          const productKey = `${company.id}-${category.id}-${subcategory.id}`;
          const products = sampleProducts[productKey] || [];
          
          for (const product of products) {
            await setDoc(doc(db, 'company', 'admin-data', 'products', company.id, 'categories', category.id, 'subcategories', subcategory.id, 'products', product.id), {
                ...product,
                companyName: company.name,
                categoryName: category.name,
                subcategoryName: subcategory.name,
                createdAt: new Date().toISOString()
              });
            
            console.log(`      ✓ Added product: ${product.name}`);
          }
        }
      }
    }

    console.log('\n🎉 Firestore hierarchy created successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Companies: ${companiesData.length}`);
    console.log(`- Employees: ${employeesData.length}`);
    console.log('- Categories: Multiple per company');
    console.log('- Subcategories: Multiple per category');
    console.log('- Products: Sample products added');
    
    console.log('\n📁 Final Structure:');
    console.log('company (root collection)');
    console.log('└── admin-data (main document)');
    console.log('    ├── employees (subcollection)');
    console.log('    │   └── [employeeId] (document)');
    console.log('    │       ├── name, mobile, email, password, etc.');
    console.log('    │       └── employeeDetails (subcollection)');
    console.log('    │           └── [detailId] (document with employee info)');
    console.log('    └── products (subcollection)');
    console.log('        └── [companyId] (document - lg, samsung, etc.)');
    console.log('            ├── companyName, country, established');
    console.log('            └── categories (subcollection)');
    console.log('                └── [categoryId] (document)');
    console.log('                    ├── categoryName, description');
    console.log('                    └── subcategories (subcollection)');
    console.log('                        └── [subcategoryId] (document)');
    console.log('                            ├── subcategoryName, description');
    console.log('                            └── products (subcollection)');
    console.log('                                └── [productId] (document with product details)');
    
  } catch (error) {
    console.error('❌ Error creating hierarchy:', error);
  }
}

// Run the hierarchy creation
createFirestoreHierarchy();
