import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AppProvider, useAuth } from "@/contexts/AppContext";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import { SectionLogo } from "@/components/SectionLogo";

// Clinic
import RegisterConsultation from "./pages/clinic/RegisterConsultation";
import Specialties from "./pages/clinic/Specialties";
import Quotations from "./pages/clinic/Quotations";
import Doctors from "./pages/clinic/Doctors";

// Batas
import RegisterSale from "./pages/batas/RegisterSale";
import Inventory from "./pages/batas/Inventory";
import Bodegas from "./pages/batas/bodegas";

// Admin
import Records from "./pages/admin/Records";
import RegisterMovement from "./pages/admin/RegisterMovement";
import Cash from "./pages/admin/Cash";
import Expenses from "./pages/admin/Expenses";
import Reports from "./pages/admin/Reports";
import Users from "./pages/admin/Users";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

const AppContent = () => {
  const { isAuthenticated } = useAuth();
  
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/clinic/register" replace /> : <Login />} />
        
        <Route path="*" element={
          <ProtectedRoute>
            <SidebarProvider>
              <div className="min-h-screen flex w-full bg-background">
                <AppSidebar />
                <div className="flex-1 flex flex-col">
                  <header className="h-16 border-b border-border bg-card flex items-center px-4 justify-between">
                    <SidebarTrigger />
                    <SectionLogo />
                  </header>
                  <main className="flex-1 overflow-auto">
                    <Routes>
                      <Route path="/" element={<Navigate to="/clinic/register" replace />} />
                      
                      {/* Clinic Routes */}
                      <Route path="/clinic/register" element={<RegisterConsultation />} />
                      <Route path="/clinic/specialties" element={<Specialties />} />
                      <Route path="/clinic/quotations" element={<Quotations />} />
                      <Route path="/clinic/doctors" element={<Doctors />} />
                      
                      {/* Batas Routes */}
                      <Route path="/batas/register" element={<RegisterSale />} />
                      <Route path="/batas/inventory" element={<Inventory />} />
                      <Route path="/batas/bodegas" element={<Bodegas />} />
                      
                      {/* Admin Routes */}
                      <Route path="/admin/records" element={<Records />} />
                      <Route path="/admin/register-movement" element={<RegisterMovement />} />
                      <Route path="/admin/cash" element={<Cash />} />
                      <Route path="/admin/expenses" element={<Expenses />} />
                      <Route path="/admin/reports" element={<Reports />} />
                      <Route path="/admin/users" element={<Users />} />
                      
                      {/* 404 */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </main>
                </div>
              </div>
            </SidebarProvider>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppContent />
      </TooltipProvider>
    </AppProvider>
  </QueryClientProvider>
);

export default App;