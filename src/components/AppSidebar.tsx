import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  Stethoscope, 
  FileText, 
  ShoppingBag, 
  Package, 
  Wallet, 
  Receipt, 
  TrendingUp, 
  Users,
  DollarSign,
  FileSpreadsheet,
  ArrowRightLeft,
  LogOut
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AppContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import logoMain from '@/assets/logo-main.jpg';
import logoDental from '@/assets/logo-dental.jpg';
import logoDress from '@/assets/logo-dress.jpg';

const clinicItems = [
  { title: 'Registrar Consulta', url: '/clinic/register', icon: FileText },
  { title: 'Especialidades', url: '/clinic/specialties', icon: Stethoscope },
  { title: 'Cotizaciones', url: '/clinic/quotations', icon: FileSpreadsheet },
  { title: 'Doctores', url: '/clinic/doctors', icon: Users },
];

const batasItems = [
  { title: 'Registrar Venta', url: '/batas/register', icon: ShoppingBag },
  { title: 'Inventario', url: '/batas/inventory', icon: Package },
];

const adminItems = [
  { title: 'Registro', url: '/admin/records', icon: Receipt },
  { title: 'Registrar Movimiento', url: '/admin/register-movement', icon: ArrowRightLeft },
  { title: 'Cajas', url: '/admin/cash', icon: Wallet },
  { title: 'Gastos', url: '/admin/expenses', icon: DollarSign },
  { title: 'Reportes', url: '/admin/reports', icon: TrendingUp },
  { title: 'Usuarios', url: '/admin/users', icon: Users },
];

export function AppSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const path = location.pathname;
  const { logout, userRole } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  const isAdmin = userRole === 'admin';

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Sesión cerrada correctamente');
    navigate('/login');
  };

  const getLogo = () => {
    if (path.startsWith('/clinic')) {
      return logoDental;
    } else if (path.startsWith('/batas')) {
      return logoDress;
    } else if (path.startsWith('/admin')) {
      return logoMain;
    }
    return logoMain;
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-card">
      <SidebarContent>
        <div className="p-4 border-b border-border flex items-center justify-center">
          <img 
            src={getLogo()} 
            alt="Logo" 
            className={`transition-all duration-300 ${collapsed ? 'h-8' : 'h-16'} w-auto object-contain`}
          />
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Dental Studio</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {clinicItems
                .filter(item => {
                  if (!isAdmin) {
                    // Ayudante solo ve Registrar Consulta y Cotizaciones
                    return item.url === '/clinic/register' || item.url === '/clinic/quotations';
                  }
                  return true;
                })
                .map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url}
                        onClick={handleNavClick}
                        className={({ isActive }) => 
                          isActive ? 'bg-accent/50 text-accent-foreground font-medium' : ''
                        }
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Dr.Dress</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {batasItems
                .filter(item => {
                  if (!isAdmin) {
                    // Ayudante solo ve Registrar Venta
                    return item.url === '/batas/register';
                  }
                  return true;
                })
                .map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url}
                        onClick={handleNavClick}
                        className={({ isActive }) => 
                          isActive ? 'bg-accent/50 text-accent-foreground font-medium' : ''
                        }
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Administración</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems
                .filter(item => {
                  if (!isAdmin) {
                    // Ayudante solo ve Registrar Movimiento
                    return item.url === '/admin/register-movement';
                  }
                  return true;
                })
                .map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url}
                        onClick={handleNavClick}
                        className={({ isActive }) => 
                          isActive ? 'bg-accent/50 text-accent-foreground font-medium' : ''
                        }
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Button 
                variant="ghost" 
                onClick={handleLogout}
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" />
                <span>Cerrar Sesión</span>
              </Button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
