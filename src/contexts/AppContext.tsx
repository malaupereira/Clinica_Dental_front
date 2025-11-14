import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSpecialties, Specialty } from '@/api/SpecialtiesApi';
import { getDoctors, createDoctor, updateDoctor as updateDoctorApi, deleteDoctor as deleteDoctorApi, Doctor as ApiDoctor } from '@/api/DoctorsApi';
import { getMovements, Movement } from '@/api/MovementsApi';
import { getExpenses as getExpensesApi, Expense as ApiExpense } from '@/api/ExpensesApi';
import { getClinicRecords, getBatasRecords, ClinicRecord, BatasRecord } from '@/api/RecordsApi';
import { getProducts as getProductsApi, Product } from '@/api/SalesApi';
import { getReportsData, getLowStockProducts, getLeastSoldProducts } from '@/api/ReportsApi';
import type { ReportsData, LowStockProduct, LeastSoldProduct } from '@/api/ReportsApi';
import { 
  getQuotations, 
  createQuotation, 
  updateQuotation as updateQuotationApi, 
  deleteQuotation as deleteQuotationApi,
  registerPayment,
  loadServiceCommissions,
  type Quotation as ApiQuotation,
  type QuotationRequest,
  type PaymentRequest
} from '@/api/QuotationsApi';

interface Service {
  id: string;
  name: string;
  hasFixedPrice: boolean;
  price?: number;
}

interface AppSpecialty {
  id: string;
  name: string;
  services: Service[];
}

interface Doctor {
  id: string;
  name: string;
  specialtyIds: string[];
  paymentType: 'comision' | 'sueldo';
}

interface Transaction {
  id: string;
  type: 'clinic' | 'batas' | 'clinic-qr' | 'batas-qr';
  date: string;
  amount: number;
  paymentMethod: 'QR' | 'Efectivo' | 'Mixto' | 'Gasto';
  details: string;
  cashAmount?: number; 
  qrAmount?: number; 
  user?: string; 
  patient?: string; 
}

export type Discount = {
  amount: number;
  type: 'percentage' | 'fixed';
};

interface Sale {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  date: string;
  discount?: Discount;
}

interface Expense {
  id: string;
  type: string;
  doctor?: string;
  description?: string;
  amount: number;
  category: 'clinic' | 'batas' | string; 
  clinicAmount?: number;
  clinicQrAmount?: number;
  batasAmount?: number;
  batasQrAmount?: number;
  status: 'pending' | 'completed' | string; 
  createdDate: string;
  paidDate?: string;
  date: string;
  user?: string; 
  paidAmount?: number;
  isCommissionGroup?: boolean; 
}

interface ServiceCommission {
  id: string;
  doctorId: string;
  doctorName: string;
  percentage: number;
  amount: number;
  pendingAmount: number;
}

interface QuotationService {
  id: string;
  serviceId: string;
  serviceName: string;
  specialtyId: string;
  specialtyName: string;
  price: number;
  commissions: ServiceCommission[];
}

interface QuotationPayment {
  id: string;
  date: string;
  amount: number;
  paymentMethod: 'Efectivo' | 'QR' | 'Mixto';
  details: string;
  doctorCommissions: { [key: string]: number };
}

interface Quotation {
  id: string;
  date: string;
  clientName: string;
  phone: string;
  status: 'pendiente' | 'completado' | 'eliminado';
  total: number;
  pendingAmount: number;
  userId: number;
  userName?: string;
  services: QuotationService[];
  payments: QuotationPayment[];
  selectedSpecialties?: string[];
  selectedDoctors?: string[];
  totalCommissions?: number;
  totalNet?: number;
}

interface PaymentPlan {
  installmentNumber: number;
  amount: number;
}

interface AuthUser {
  idUsuario: number;
  usuario: string;
  tipo: 'admin' | 'assistant';
}

interface AppContextType {
  specialties: AppSpecialty[];
  doctors: Doctor[];
  products: Product[];
  transactions: Transaction[];
  expenses: Expense[];
  clinicRecords: ClinicRecord[];
  batasRecords: BatasRecord[];
  quotations: Quotation[];
  sales: Sale[];
  reportsData: ReportsData | null;
  lowStockProducts: LowStockProduct[];
  leastSoldProducts: LeastSoldProduct[];
  isAuthenticated: boolean;
  user: AuthUser | null;
  userRole: 'admin' | 'assistant' | null;
  login: (role: 'admin' | 'assistant', userData?: AuthUser) => void;
  logout: () => void;
  addSpecialty: (specialty: AppSpecialty) => void;
  updateSpecialty: (id: string, specialty: AppSpecialty) => void;
  deleteSpecialty: (id: string) => void;
  addDoctor: (doctor: Doctor) => void;
  updateDoctor: (id: string, doctor: Doctor) => void;
  deleteDoctor: (id: string) => void;
  addProduct: (product: Product) => void;
  updateProduct: (id: string, product: Product) => void;
  deleteProduct: (id: string) => void;
  addTransaction: (transaction: Transaction) => void;
  addExpense: (expense: Expense) => void;
  updateExpense: (expense: Expense) => void;
  deleteExpense: (id: string) => void;
  addClinicRecord: (record: ClinicRecord) => void;
  addBatasRecord: (record: BatasRecord) => void;
  addQuotation: (quotationData: any) => Promise<Quotation>;
  updateQuotation: (id: string, quotationData: any) => Promise<Quotation>;
  deleteQuotation: (id: string) => Promise<void>;
  registerQuotationPayment: (paymentData: any) => Promise<Quotation>;
  addSale: (sale: Sale) => void;
  refreshSpecialties: () => Promise<void>;
  refreshDoctors: () => Promise<void>;
  refreshProducts: () => Promise<void>;
  refreshExpenses: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  refreshClinicRecords: () => Promise<void>;
  refreshBatasRecords: () => Promise<void>;
  refreshQuotations: () => Promise<void>;
  refreshReportsData: (period: 'day' | 'range' | 'week' | 'month', dateRange: { start: string; end: string }, productType: 'clinic' | 'batas') => Promise<void>;
  refreshLowStockProducts: () => Promise<void>;
  refreshLeastSoldProducts: () => Promise<void>;
  loading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const initialProducts: Product[] = [];
const initialTransactions: Transaction[] = [];
const initialExpenses: Expense[] = [];
const initialClinicRecords: ClinicRecord[] = [];
const initialBatasRecords: BatasRecord[] = [];
const initialQuotations: Quotation[] = [];
const initialSales: Sale[] = [];

const mapMovementToTransaction = (movement: Movement): Transaction => {
  let type: 'clinic' | 'batas' | 'clinic-qr' | 'batas-qr' = 'clinic';
  switch (movement.idcaja) {
    case 1: type = 'clinic'; break;
    case 2: type = 'batas'; break;
    case 3: type = 'clinic-qr'; break;
    case 4: type = 'batas-qr'; break;
  }

  let paymentMethod: 'QR' | 'Efectivo' | 'Mixto' | 'Gasto' = 'Efectivo';
  if (type.includes('qr')) {
    paymentMethod = 'QR';
  } else if (movement.tipo === 'egreso') {
    paymentMethod = 'Gasto';
  }

  return {
    id: movement.idmovimiento_caja.toString(),
    type: type,
    date: movement.fecha,
    amount: movement.tipo === 'ingreso' ? movement.monto : -movement.monto,
    paymentMethod: paymentMethod,
    details: movement.descripcion || '',
    cashAmount: type.includes('qr') ? 0 : movement.monto,
    qrAmount: type.includes('qr') ? movement.monto : 0,
    user: movement.idusuario?.toString() || 'Sistema'
  };
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [specialties, setSpecialties] = useState<AppSpecialty[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [clinicRecords, setClinicRecords] = useState<ClinicRecord[]>(initialClinicRecords);
  const [batasRecords, setBatasRecords] = useState<BatasRecord[]>(initialBatasRecords);
  const [quotations, setQuotations] = useState<Quotation[]>(initialQuotations);
  const [sales, setSales] = useState<Sale[]>(initialSales);
  const [reportsData, setReportsData] = useState<ReportsData | null>(null);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [leastSoldProducts, setLeastSoldProducts] = useState<LeastSoldProduct[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('authToken') !== null;
  });
  const [user, setUser] = useState<AuthUser | null>(() => {
    const userData = localStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
  });
  const [userRole, setUserRole] = useState<'admin' | 'assistant' | null>(() => {
    return user?.tipo || null;
  });

  const refreshSpecialties = async () => {
    try {
      setLoading(true);
      const fetchedSpecialties = await getSpecialties();
      setSpecialties(fetchedSpecialties);
    } catch (error) {
      console.error('Error loading specialties:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshDoctors = async () => {
    try {
      setLoading(true);
      const fetchedDoctors = await getDoctors();
      setDoctors(fetchedDoctors);
    } catch (error) {
      console.error('Error loading doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshProducts = async () => {
    try {
      setLoading(true);
      const fetchedProducts = await getProductsApi();
      setProducts(fetchedProducts);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshExpenses = async () => {
    try {
      setLoading(true);
      const fetchedExpenses = await getExpensesApi();
      setExpenses(fetchedExpenses);
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshTransactions = async () => {
    try {
      setLoading(true);
      const fetchedMovements = await getMovements();
      const transactions = fetchedMovements.map(mapMovementToTransaction);
      setTransactions(transactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshClinicRecords = async () => {
    try {
      setLoading(true);
      const fetchedRecords = await getClinicRecords();
      setClinicRecords(fetchedRecords);
    } catch (error) {
      console.error('Error loading clinic records:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshBatasRecords = async () => {
    try {
      setLoading(true);
      const fetchedRecords = await getBatasRecords();
      setBatasRecords(fetchedRecords);
    } catch (error) {
      console.error('Error loading batas records:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshQuotations = async () => {
    try {
      setLoading(true);
      const fetchedQuotations = await getQuotations();
      const quotationsWithCommissions = await Promise.all(
        fetchedQuotations.map(quotation => loadServiceCommissions(quotation))
      );
      setQuotations(quotationsWithCommissions);
    } catch (error) {
      console.error('Error loading quotations:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshReportsData = async (
    period: 'day' | 'range' | 'week' | 'month', 
    dateRange: { start: string; end: string }, 
    productType: 'clinic' | 'batas'
  ) => {
    try {
      setLoading(true);
      const data = await getReportsData(period, dateRange, productType);
      setReportsData(data);
    } catch (error) {
      console.error('Error loading reports data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshLowStockProducts = async () => {
    try {
      setLoading(true);
      const data = await getLowStockProducts();
      setLowStockProducts(data);
    } catch (error) {
      console.error('Error loading low stock products:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshLeastSoldProducts = async () => {
    try {
      setLoading(true);
      const data = await getLeastSoldProducts();
      setLeastSoldProducts(data);
    } catch (error) {
      console.error('Error loading least sold products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initializeApp = async () => {
      try {
        setLoading(true);
        
        await Promise.all([
          refreshSpecialties(),
          refreshDoctors(),
          refreshProducts(),
          refreshExpenses(),
          refreshTransactions(),
          refreshClinicRecords(),
          refreshBatasRecords(),
          refreshQuotations(),
          refreshLowStockProducts(),
          refreshLeastSoldProducts()
        ]);
        
        setSales(JSON.parse(localStorage.getItem('sales') || '[]'));
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing app:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('sales', JSON.stringify(sales));
    }
  }, [sales, isInitialized]);

  const addSpecialty = (specialty: AppSpecialty) => {
    setSpecialties(prev => [...prev, specialty]);
  };

  const updateSpecialty = (id: string, specialty: AppSpecialty) => {
    setSpecialties(prev => prev.map(s => s.id === id ? specialty : s));
  };

  const deleteSpecialty = (id: string) => {
    setSpecialties(prev => prev.filter(s => s.id !== id));
  };

  const addDoctor = async (doctor: Doctor) => {
    try {
      const newDoctor = await createDoctor({
        name: doctor.name,
        specialtyIds: doctor.specialtyIds,
        paymentType: doctor.paymentType
      });
      setDoctors(prev => [...prev, newDoctor]);
    } catch (error) {
      console.error('Error adding doctor:', error);
      throw error;
    }
  };

  const updateDoctor = async (id: string, doctor: Doctor) => {
    try {
      const updatedDoctor = await updateDoctorApi(id, {
        name: doctor.name,
        specialtyIds: doctor.specialtyIds,
        paymentType: doctor.paymentType
      });
      setDoctors(prev => prev.map(d => d.id === id ? { ...updatedDoctor, id } : d));
    } catch (error) {
      console.error('Error updating doctor:', error);
      throw error;
    }
  };

  const deleteDoctor = async (id: string) => {
    try {
      await deleteDoctorApi(id);
      setDoctors(prev => prev.filter(d => d.id !== id));
    } catch (error) {
      console.error('Error deleting doctor:', error);
      throw error;
    }
  };

  const addProduct = (product: Product) => {
    setProducts([...products, product]);
  };

  const updateProduct = (id: string, product: Product) => {
    setProducts(products.map(p => p.id === id ? product : p));
  };

  const deleteProduct = (id: string) => {
    setProducts(products.filter(p => p.id !== id));
  };

  const addTransaction = async (transaction: Transaction) => {
    setTransactions([...transactions, transaction]);
  };

  const addExpense = (expense: Expense) => {
    const newExpense = {
      ...expense,
      createdDate: expense.createdDate || new Date().toISOString(),
      date: expense.date || new Date().toISOString()
    };
    setExpenses([...expenses, newExpense]);
  };

  const updateExpense = (expense: Expense) => {
    setExpenses(expenses.map(e => e.id === expense.id ? expense : e));
  };

  const deleteExpense = (id: string) => {
    setExpenses(expenses.filter(e => e.id !== id));
  };

  const addClinicRecord = (record: ClinicRecord) => {
    setClinicRecords([...clinicRecords, record]);
  };

  const addBatasRecord = (record: BatasRecord) => {
    setBatasRecords([...batasRecords, record]);
  };

  const addQuotation = async (quotationData: any): Promise<Quotation> => {
    try {
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const quotationRequest: QuotationRequest = {
        ...quotationData,
        userId: userData.idUsuario
      };
      
      const newQuotation = await createQuotation(quotationRequest);
      const quotationWithCommissions = await loadServiceCommissions(newQuotation);
      
      setQuotations(prev => [...prev, quotationWithCommissions]);
      return quotationWithCommissions;
    } catch (error) {
      console.error('Error adding quotation:', error);
      throw error;
    }
  };

  const updateQuotation = async (id: string, quotationData: any): Promise<Quotation> => {
    try {
      const updatedQuotation = await updateQuotationApi(id, quotationData);
      const quotationWithCommissions = await loadServiceCommissions(updatedQuotation);
      
      setQuotations(prev => 
        prev.map(q => q.id === id ? quotationWithCommissions : q)
      );
      return quotationWithCommissions;
    } catch (error) {
      console.error('Error updating quotation:', error);
      throw error;
    }
  };

  const deleteQuotation = async (id: string): Promise<void> => {
    try {
      await deleteQuotationApi(id);
      setQuotations(prev => prev.filter(q => q.id !== id));
    } catch (error) {
      console.error('Error deleting quotation:', error);
      throw error;
    }
  };

  const registerQuotationPayment = async (paymentData: any): Promise<Quotation> => {
    try {
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const paymentRequest: PaymentRequest = {
        ...paymentData,
        userId: userData.idUsuario
      };
      
      const updatedQuotation = await registerPayment(paymentRequest);
      const quotationWithCommissions = await loadServiceCommissions(updatedQuotation);
      
      setQuotations(prev => 
        prev.map(q => q.id === paymentData.quotationId ? quotationWithCommissions : q)
      );
      return quotationWithCommissions;
    } catch (error) {
      console.error('Error registering payment:', error);
      throw error;
    }
  };

  const addSale = (sale: Sale) => {
    setSales([...sales, sale]);
  };

  const login = (role: 'admin' | 'assistant', userData?: AuthUser) => {
    const authUser = userData || { 
      idUsuario: 0, 
      usuario: 'Usuario', 
      tipo: role 
    };
    
    setIsAuthenticated(true);
    setUser(authUser);
    setUserRole(role);
    localStorage.setItem('authToken', 'dummy-token');
    localStorage.setItem('userData', JSON.stringify(authUser));
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setUserRole(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
  };

  return (
    <AppContext.Provider
      value={{
        specialties,
        doctors,
        products,
        transactions,
        expenses,
        clinicRecords,
        batasRecords,
        quotations,
        sales,
        reportsData,
        lowStockProducts,
        leastSoldProducts,
        isAuthenticated,
        user,
        userRole,
        login,
        logout,
        addSpecialty,
        updateSpecialty,
        deleteSpecialty,
        addDoctor,
        updateDoctor,
        deleteDoctor,
        addProduct,
        updateProduct,
        deleteProduct,
        addTransaction,
        addExpense,
        updateExpense,
        deleteExpense,
        addClinicRecord,
        addBatasRecord,
        addQuotation,
        updateQuotation,
        deleteQuotation,
        registerQuotationPayment,
        addSale,
        refreshSpecialties,
        refreshDoctors,
        refreshProducts,
        refreshExpenses,
        refreshTransactions,
        refreshClinicRecords,
        refreshBatasRecords,
        refreshQuotations,
        refreshReportsData,
        refreshLowStockProducts,
        refreshLeastSoldProducts,
        loading
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export const useAuth = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AppProvider');
  }
  return {
    isAuthenticated: context.isAuthenticated,
    user: context.user,
    userRole: context.userRole,
    login: context.login,
    logout: context.logout,
  };
};