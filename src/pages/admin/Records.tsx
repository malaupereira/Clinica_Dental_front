import React, { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay, startOfWeek, endOfWeek, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, FilterX, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { getClinicRecordDetails, getBatasRecordDetails, ClinicRecord, BatasRecord, ClinicDetail, BatasDetail } from '@/api/RecordsApi';

// Importar axios para hacer las llamadas directamente
import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

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

// Interfaces para las respuestas del backend
interface BackendClinicRecord {
  idregistro_clinica: number;
  fecha: string;
  idusuario: number;
  paciente: string;
  detalles: string;
  metodo_pago: string;
  monto_total: string;
  monto_efectivo: string;
  monto_qr: string;
  usuario_nombre?: string;
}

interface BackendBatasRecord {
  idregistro_batas: number;
  fecha: string;
  idusuario: number;
  detalles: string;
  metodo_pago: string;
  monto_total: string;
  monto_efectivo: string;
  monto_qr: string;
  usuario_nombre?: string;
}

interface DateFilterParams {
  startDate?: string;
  endDate?: string;
}

// Funciones wrapper con tipos explícitos
const fetchClinicRecords = async (dateParams?: DateFilterParams): Promise<ClinicRecord[]> => {
  try {
    const response = await axios.get<BackendClinicRecord[]>(`${API_URL}/records/clinic`, {
      params: dateParams,
      withCredentials: true
    });
    return response.data.map((record) => ({
      id: record.idregistro_clinica.toString(),
      fecha: record.fecha,
      idusuario: record.idusuario,
      paciente: record.paciente,
      detalles: record.detalles,
      metodo_pago: record.metodo_pago as 'Efectivo' | 'QR' | 'Mixto',
      monto_total: parseFloat(record.monto_total),
      monto_efectivo: parseFloat(record.monto_efectivo),
      monto_qr: parseFloat(record.monto_qr),
      usuario_nombre: record.usuario_nombre
    }));
  } catch (error) {
    console.error("Error fetching clinic records:", error);
    throw new Error("No se pudieron cargar los registros de Dental Studio");
  }
};

const fetchBatasRecords = async (dateParams?: DateFilterParams): Promise<BatasRecord[]> => {
  try {
    const response = await axios.get<BackendBatasRecord[]>(`${API_URL}/records/batas`, {
      params: dateParams,
      withCredentials: true
    });
    return response.data.map((record) => ({
      id: record.idregistro_batas.toString(),
      fecha: record.fecha,
      idusuario: record.idusuario,
      detalles: record.detalles,
      metodo_pago: record.metodo_pago as 'Efectivo' | 'QR' | 'Mixto',
      monto_total: parseFloat(record.monto_total),
      monto_efectivo: parseFloat(record.monto_efectivo),
      monto_qr: parseFloat(record.monto_qr),
      usuario_nombre: record.usuario_nombre
    }));
  } catch (error) {
    console.error("Error fetching batas records:", error);
    throw new Error("No se pudieron cargar los registros de Dr.Dress");
  }
};

export default function Records() {
  const { transactions } = useApp();
  const { user } = useAuth();
  const [filter, setFilter] = useState<'clinic' | 'batas'>('clinic');
  const [dateFilter, setDateFilter] = useState<'specific' | 'range' | 'today' | 'yesterday' | 'thisWeek' | 'currentMonth'>('today');
  const [specificDate, setSpecificDate] = useState<Date>();
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [expandedTransaction, setExpandedTransaction] = useState<string | null>(null);
  const [clinicRecords, setClinicRecords] = useState<ClinicRecord[]>([]);
  const [batasRecords, setBatasRecords] = useState<BatasRecord[]>([]);
  const [recordDetails, setRecordDetails] = useState<{ [key: string]: ClinicDetail[] | BatasDetail[] }>({});
  const [loading, setLoading] = useState(false);

  // Función para construir los parámetros de fecha para el backend
  const buildDateParams = (): DateFilterParams => {
    if (dateFilter === 'today') {
      const start = startOfDay(new Date());
      const end = endOfDay(new Date());
      return {
        startDate: start.toISOString(),
        endDate: end.toISOString()
      };
    }
    
    if (dateFilter === 'yesterday') {
      const yesterday = subDays(new Date(), 1);
      const start = startOfDay(yesterday);
      const end = endOfDay(yesterday);
      return {
        startDate: start.toISOString(),
        endDate: end.toISOString()
      };
    }
    
    if (dateFilter === 'thisWeek') {
      const start = startOfWeek(new Date(), { weekStartsOn: 1 }); // Lunes como inicio de semana
      const end = endOfWeek(new Date(), { weekStartsOn: 1 });
      return {
        startDate: start.toISOString(),
        endDate: end.toISOString()
      };
    }
    
    if (dateFilter === 'currentMonth') {
      const start = startOfMonth(new Date());
      const end = endOfMonth(new Date());
      return {
        startDate: start.toISOString(),
        endDate: end.toISOString()
      };
    }
    
    if (dateFilter === 'specific' && specificDate) {
      const start = startOfDay(specificDate);
      const end = endOfDay(specificDate);
      return {
        startDate: start.toISOString(),
        endDate: end.toISOString()
      };
    }
    
    if (dateFilter === 'range' && dateRange.from && dateRange.to) {
      const start = startOfDay(dateRange.from);
      const end = endOfDay(dateRange.to);
      return {
        startDate: start.toISOString(),
        endDate: end.toISOString()
      };
    }
    
    return {};
  };

  // Cargar registros con filtros aplicados
  const loadRecords = async () => {
    setLoading(true);
    try {
      const dateParams = buildDateParams();
      
      if (filter === 'clinic') {
        const records = await fetchClinicRecords(dateParams);
        setClinicRecords(records);
      } else {
        const records = await fetchBatasRecords(dateParams);
        setBatasRecords(records);
      }
    } catch (error) {
      console.error('Error loading records:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cargar registros al cambiar el filtro o los parámetros de fecha
  useEffect(() => {
    loadRecords();
  }, [filter, dateFilter, specificDate, dateRange]);

  // Cargar detalles de un registro cuando se expande
  const loadRecordDetails = async (recordId: string, isClinic: boolean) => {
    try {
      if (recordDetails[recordId]) return; // Ya están cargados

      let details: ClinicDetail[] | BatasDetail[];
      if (isClinic) {
        details = await getClinicRecordDetails(recordId);
      } else {
        details = await getBatasRecordDetails(recordId);
      }
      
      setRecordDetails(prev => ({
        ...prev,
        [recordId]: details
      }));
    } catch (error) {
      console.error('Error loading record details:', error);
    }
  };

  // Función para formatear la fecha ISO a un formato legible sin cambiar la hora
  const formatDateDisplay = (isoString: string) => {
    const date = new Date(isoString);
    
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const currentRecords = filter === 'clinic' ? clinicRecords : batasRecords;
  const filteredRecords = currentRecords; // Ya vienen filtrados del backend

  // Calcular totales
  const total = filteredRecords.reduce((sum, record) => sum + record.monto_total, 0);
  
  // Para QR
  const qrTotal = filteredRecords
    .filter(record => record.metodo_pago === 'QR' || record.metodo_pago === 'Mixto')
    .reduce((sum, record) => sum + record.monto_qr, 0);
  
  // Para Efectivo
  const cashTotal = filteredRecords
    .filter(record => record.metodo_pago === 'Efectivo' || record.metodo_pago === 'Mixto')
    .reduce((sum, record) => sum + record.monto_efectivo, 0);

  const clearFilters = () => {
    setDateFilter('today');
    setSpecificDate(undefined);
    setDateRange({ from: undefined, to: undefined });
  };

  const hasActiveFilters = dateFilter !== 'today' || specificDate || 
    (dateRange.from && dateRange.to);

  const getPaymentMethodBadge = (method: string) => {
    const styles = {
      'Efectivo': 'bg-green-100 text-green-800 border-green-200',
      'QR': 'bg-blue-100 text-blue-800 border-blue-200',
      'Mixto': 'bg-purple-100 text-purple-800 border-purple-200'
    };
    
    return (
      <Badge variant="outline" className={cn("text-xs font-medium", styles[method as keyof typeof styles])}>
        {method}
      </Badge>
    );
  };

  const handleExpandRecord = async (recordId: string, isClinic: boolean) => {
    if (expandedTransaction === recordId) {
      setExpandedTransaction(null);
    } else {
      setExpandedTransaction(recordId);
      await loadRecordDetails(recordId, isClinic);
    }
  };

  const renderRecordDetails = (recordId: string, isClinic: boolean) => {
    const details = recordDetails[recordId];
    if (!details) return <div className="text-sm text-muted-foreground py-2">Cargando detalles...</div>;

    if (isClinic) {
      const clinicDetails = details as ClinicDetail[];
      return (
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Servicios:</h4>
          {clinicDetails.map((detail, index) => (
            <div key={detail.id} className="flex justify-between items-center text-sm border-b pb-1">
              <div>
                <span className="font-medium">{detail.servicio_nombre || `Servicio ${index + 1}`}</span>
                <span className="text-muted-foreground ml-2">x{detail.cantidad}</span>
              </div>
              <div className="text-right">
                <div className="font-medium">Bs. {detail.subtotal.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">Bs. {detail.precio_unitario.toFixed(2)} c/u</div>
              </div>
            </div>
          ))}
        </div>
      );
    } else {
      const batasDetails = details as BatasDetail[];
      return (
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Productos:</h4>
          {batasDetails.map((detail, index) => (
            <div key={detail.id} className="flex justify-between items-center text-sm border-b pb-1">
              <div>
                <span className="font-medium">{detail.producto_nombre || `Producto ${index + 1}`}</span>
                <span className="text-muted-foreground ml-2">x{detail.cantidad}</span>
              </div>
              <div className="text-right">
                <div className="font-medium">Bs. {detail.subtotal.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">Bs. {detail.precio_unitario.toFixed(2)} c/u</div>
              </div>
            </div>
          ))}
        </div>
      );
    }
  };

  return (
    <div className="container mx-auto p-3 sm:p-4 space-y-4 sm:space-y-6 max-w-7xl">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Registro de Ingresos</h1>
        <p className="text-xs sm:text-sm md:text-base text-muted-foreground">Visualice todos los ingresos del negocio</p>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <Select value={filter} onValueChange={(value: 'clinic' | 'batas') => setFilter(value)}>
              <SelectTrigger className="w-full text-sm sm:text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="clinic">Dental Studio</SelectItem>
                <SelectItem value="batas">Dr.Dress</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-0">
            <Select value={dateFilter} onValueChange={(value: 'specific' | 'range' | 'today' | 'yesterday' | 'thisWeek' | 'currentMonth') => setDateFilter(value)}>
              <SelectTrigger className="w-full text-sm sm:text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoy</SelectItem>
                <SelectItem value="yesterday">Ayer</SelectItem>
                <SelectItem value="thisWeek">Esta semana</SelectItem>
                <SelectItem value="currentMonth">Mes actual</SelectItem>
                <SelectItem value="specific">Día específico</SelectItem>
                <SelectItem value="range">Rango de fechas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {dateFilter === 'specific' && (
            <div className="flex-1 min-w-0">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal text-sm sm:text-base",
                      !specificDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    {specificDate ? format(specificDate, "dd/MM/yy", { locale: es }) : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={specificDate}
                    onSelect={setSpecificDate}
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {dateFilter === 'range' && (
            <div className="flex gap-2 w-full">
              <div className="flex-1 min-w-0">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal text-sm",
                        !dateRange.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3 w-3" />
                      {dateRange.from ? format(dateRange.from, "dd/MM/yy") : "Desde"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(date) => setDateRange({ ...dateRange, from: date })}
                      initialFocus
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="flex-1 min-w-0">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal text-sm",
                        !dateRange.to && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3 w-3" />
                      {dateRange.to ? format(dateRange.to, "dd/MM/yy") : "Hasta"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateRange.to}
                      onSelect={(date) => setDateRange({ ...dateRange, to: date })}
                      initialFocus
                      locale={es}
                      disabled={(date) => dateRange.from ? date < dateRange.from : false}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {hasActiveFilters && (
            <Button variant="outline" onClick={clearFilters} className="w-full sm:w-auto text-sm sm:text-base">
              <FilterX className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Limpiar
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <div className="text-center">
                <p className="text-xs sm:text-sm text-muted-foreground">Total</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">Bs. {total.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {filteredRecords.length} registros
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <div className="text-center">
                <p className="text-xs sm:text-sm text-muted-foreground">QR</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">Bs. {qrTotal.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <div className="text-center">
                <p className="text-xs sm:text-sm text-muted-foreground">Efectivo</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">Bs. {cashTotal.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg md:text-xl">
            Historial de Registros - {filter === 'clinic' ? 'Dental Studio' : 'Dr.Dress'}
            {hasActiveFilters && (
              <span className="text-xs sm:text-sm font-normal text-muted-foreground ml-2">
                ({filteredRecords.length} resultados)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-2 md:p-6">
          {/* Vista móvil - Cards colapsables */}
          <div className="sm:hidden space-y-2 p-2">
            {loading ? (
              <div className="text-center text-muted-foreground py-8 text-sm">Cargando registros...</div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 text-sm">No hay registros</div>
            ) : (
              filteredRecords.map((record) => (
                <Collapsible 
                  key={record.id}
                  open={expandedTransaction === record.id}
                  onOpenChange={() => handleExpandRecord(record.id, filter === 'clinic')}
                  className="border rounded-lg"
                >
                  <div className="p-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate" title={record.detalles}>
                          {record.detalles}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {formatDateDisplay(record.fecha)}
                          </span>
                          {getPaymentMethodBadge(record.metodo_pago)}
                        </div>
                        {record.usuario_nombre && (
                          <div className="mt-1">
                            <span className="text-xs text-muted-foreground">Usuario: </span>
                            <span className="text-xs font-medium">{record.usuario_nombre}</span>
                          </div>
                        )}
                        {filter === 'clinic' && (record as ClinicRecord).paciente && (
                          <div className="mt-1">
                            <span className="text-xs text-muted-foreground">Paciente: </span>
                            <span className="text-xs font-medium">{(record as ClinicRecord).paciente}</span>
                          </div>
                        )}
                      </div>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="ml-2">
                          {expandedTransaction === record.id ? 
                            <ChevronUp className="h-4 w-4" /> : 
                            <ChevronDown className="h-4 w-4" />
                          }
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                    
                    <div className="mt-2">
                      <p className="text-sm font-bold">
                        Total: Bs. {record.monto_total.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  
                  <CollapsibleContent className="px-3 pb-3 border-t">
                    {record.metodo_pago === 'Mixto' ? (
                      <div className="grid grid-cols-2 gap-3 text-xs mt-2">
                        <div className="bg-green-50 p-2 rounded">
                          <span className="text-green-700 font-medium">Efectivo</span>
                          <p className="font-bold text-green-800">Bs. {record.monto_efectivo.toFixed(2)}</p>
                        </div>
                        <div className="bg-blue-50 p-2 rounded">
                          <span className="text-blue-700 font-medium">QR</span>
                          <p className="font-bold text-blue-800">Bs. {record.monto_qr.toFixed(2)}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground mt-2">
                        <p>Método de pago: {record.metodo_pago}</p>
                      </div>
                    )}
                    
                    {/* Detalles de servicios/productos */}
                    {expandedTransaction === record.id && renderRecordDetails(record.id, filter === 'clinic')}
                  </CollapsibleContent>
                </Collapsible>
              ))
            )}
          </div>

          {/* Vista desktop - Tabla completa */}
          <div className="hidden sm:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-sm min-w-[100px]">Fecha</TableHead>
                  <TableHead className="text-sm min-w-[120px]">Usuario</TableHead>
                  {filter === 'clinic' && (
                    <TableHead className="text-sm min-w-[120px]">Paciente</TableHead>
                  )}
                  <TableHead className="text-sm min-w-[120px]">Detalles</TableHead>
                  <TableHead className="text-sm min-w-[100px]">Método</TableHead>
                  <TableHead className="text-right text-sm min-w-[120px]">Monto</TableHead>
                  <TableHead className="text-sm min-w-[80px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={filter === 'clinic' ? 7 : 6} className="text-center text-muted-foreground text-sm py-8">
                      Cargando registros...
                    </TableCell>
                  </TableRow>
                ) : filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={filter === 'clinic' ? 7 : 6} className="text-center text-muted-foreground text-sm py-8">
                      No hay registros
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record) => (
                    <React.Fragment key={record.id}>
                      <TableRow>
                        <TableCell className="text-sm">
                          {formatDateDisplay(record.fecha)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {record.usuario_nombre || 'N/A'}
                        </TableCell>
                        {filter === 'clinic' && (
                          <TableCell className="text-sm">
                            {(record as ClinicRecord).paciente || 'N/A'}
                          </TableCell>
                        )}
                        <TableCell className="text-sm">{record.detalles}</TableCell>
                        <TableCell>
                          {getPaymentMethodBadge(record.metodo_pago)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-sm">
                          {record.metodo_pago === 'Mixto' ? (
                            <div className="space-y-1">
                              <div className="text-green-700">Efectivo: Bs. {record.monto_efectivo.toFixed(2)}</div>
                              <div className="text-blue-700">QR: Bs. {record.monto_qr.toFixed(2)}</div>
                              <div className="text-foreground border-t pt-1">Total: Bs. {record.monto_total.toFixed(2)}</div>
                            </div>
                          ) : (
                            `Bs. ${record.monto_total.toFixed(2)}`
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExpandRecord(record.id, filter === 'clinic')}
                            className="h-7 w-7 p-0"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      {expandedTransaction === record.id && (
                        <TableRow>
                          <TableCell colSpan={filter === 'clinic' ? 7 : 6} className="bg-muted/50 p-4">
                            <div className="space-y-3">
                              <div className="font-medium text-sm">Detalles:</div>
                              {renderRecordDetails(record.id, filter === 'clinic')}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}