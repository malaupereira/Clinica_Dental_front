import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay, startOfWeek, endOfWeek, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Wallet, CalendarIcon, FilterX, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getCashBoxes, getAllMovementsWithExpenses, getCashSummary, CashBox, Movement, Expense } from '@/api/CashApi';

interface CashSummary {
  balance: number;
  income: number;
  outcome: number;
  transactionsCount: number;
  expensesCount: number;
}

interface CombinedMovement {
  id: string;
  date: string;
  description: string;
  amount: number;
  movementType: 'income' | 'expense';
  user?: string;
  tipo?: string;
}

interface DateFilterParams {
  startDate?: string;
  endDate?: string;
}

export default function Cash() {
  const { toast } = useToast();
  const [cashBoxes, setCashBoxes] = useState<CashBox[]>([]);
  const [selectedCashBoxId, setSelectedCashBoxId] = useState<string>('1');
  const [dateFilter, setDateFilter] = useState<'specific' | 'range' | 'today' | 'yesterday' | 'thisWeek' | 'currentMonth'>('today');
  const [specificDate, setSpecificDate] = useState<Date>();
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [expandedMovement, setExpandedMovement] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<CashSummary>({
    balance: 0,
    income: 0,
    outcome: 0,
    transactionsCount: 0,
    expensesCount: 0
  });
  const [movements, setMovements] = useState<CombinedMovement[]>([]);

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

  // Cargar cajas al iniciar
  useEffect(() => {
    loadCashBoxes();
  }, []);

  // Cargar datos cuando cambian los filtros
  useEffect(() => {
    if (cashBoxes.length > 0) {
      loadCashData();
    }
  }, [selectedCashBoxId, dateFilter, specificDate, dateRange, cashBoxes]);

  const loadCashBoxes = async () => {
    try {
      const boxes = await getCashBoxes();
      setCashBoxes(boxes);
    } catch (error) {
      console.error('Error loading cash boxes:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las cajas',
        variant: 'destructive',
      });
    }
  };

  const loadCashData = async () => {
    setLoading(true);
    try {
      const idcaja = parseInt(selectedCashBoxId);
      const dateParams = buildDateParams();
      
      // Preparar parámetros de fecha para el backend actual
      let fecha: string | undefined;
      let fechaInicio: string | undefined;
      let fechaFin: string | undefined;

      if (dateParams.startDate && dateParams.endDate) {
        fechaInicio = format(new Date(dateParams.startDate), 'yyyy-MM-dd');
        fechaFin = format(new Date(dateParams.endDate), 'yyyy-MM-dd');
      }

      // Cargar resumen y movimientos en paralelo
      const [summaryData, movementsData] = await Promise.all([
        getCashSummary(idcaja, fecha, fechaInicio, fechaFin),
        getAllMovementsWithExpenses(idcaja, fecha, fechaInicio, fechaFin)
      ]);

      setSummary(summaryData);

      // Combinar movimientos y gastos
      const combinedMovements: CombinedMovement[] = [
        // Movimientos de ingreso
        ...movementsData.movements
          .filter((movement: Movement) => movement.tipo === 'ingreso')
          .map((movement: Movement) => ({
            id: `movement-${movement.idmovimiento_caja}`,
            date: movement.fecha,
            description: movement.descripcion,
            amount: movement.monto,
            movementType: 'income' as const,
            user: movement.usuario,
            tipo: 'Ingreso'
          })),
        // Movimientos de egreso (gastos)
        ...movementsData.movements
          .filter((movement: Movement) => movement.tipo === 'egreso')
          .map((movement: Movement) => ({
            id: `movement-${movement.idmovimiento_caja}`,
            date: movement.fecha,
            description: movement.descripcion,
            amount: -movement.monto,
            movementType: 'expense' as const,
            user: movement.usuario,
            tipo: 'Egreso'
          }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setMovements(combinedMovements);
    } catch (error) {
      console.error('Error loading cash data:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos de caja',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setDateFilter('today');
    setSpecificDate(undefined);
    setDateRange({ from: undefined, to: undefined });
  };

  const hasActiveFilters = dateFilter !== 'today' || specificDate || 
    (dateRange.from && dateRange.to);

  const getCashBoxName = (idcaja: number) => {
    const box = cashBoxes.find(b => b.idcaja === idcaja);
    return box ? box.nombre : '';
  };

  const getMovementBadge = (type: 'income' | 'expense') => {
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "text-xs font-medium",
          type === 'income' 
            ? 'bg-green-100 text-green-800 border-green-200' 
            : 'bg-red-100 text-red-800 border-red-200'
        )}
      >
        {type === 'income' ? 'Ingreso' : 'Egreso'}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-3 sm:p-4 space-y-4 sm:space-y-6 max-w-7xl">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Cajas</h1>
        <p className="text-xs sm:text-sm md:text-base text-muted-foreground">Gestione el flujo de efectivo por caja</p>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <Select value={selectedCashBoxId} onValueChange={setSelectedCashBoxId}>
              <SelectTrigger className="w-full text-sm sm:text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {cashBoxes.map((box) => (
                  <SelectItem key={box.idcaja} value={box.idcaja.toString()}>
                    {box.nombre}
                  </SelectItem>
                ))}
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

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-2 p-4 sm:p-6">
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 sm:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium">Saldo Total</CardTitle>
                <Wallet className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="text-xl sm:text-2xl font-bold">Bs. {summary.balance.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 sm:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium">Ingresos</CardTitle>
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="text-xl sm:text-2xl font-bold text-green-600">Bs. {summary.income.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">{summary.transactionsCount} transacciones</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 sm:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium">Egresos</CardTitle>
                <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="text-xl sm:text-2xl font-bold text-destructive">Bs. {summary.outcome.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">{summary.expensesCount} gastos</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg md:text-xl">
              Movimientos de {getCashBoxName(parseInt(selectedCashBoxId))}
              {hasActiveFilters && (
                <span className="text-xs sm:text-sm font-normal text-muted-foreground ml-2">
                  ({movements.length} resultados)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-2 md:p-6">
            {/* Vista móvil - Cards colapsables */}
            <div className="sm:hidden space-y-2 p-2">
              {loading ? (
                [1, 2, 3].map((i) => (
                  <div key={i} className="border rounded-lg p-3 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))
              ) : movements.length > 0 ? (
                movements.map((movement) => (
                  <Collapsible 
                    key={movement.id}
                    open={expandedMovement === movement.id}
                    onOpenChange={() => setExpandedMovement(expandedMovement === movement.id ? null : movement.id)}
                    className="border rounded-lg"
                  >
                    <div className="p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate" title={movement.description}>
                            {movement.description}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {formatDateDisplay(movement.date)}
                            </span>
                            {getMovementBadge(movement.movementType)}
                          </div>
                          {movement.user && (
                            <div className="mt-1">
                              <span className="text-xs text-muted-foreground">Usuario: </span>
                              <span className="text-xs font-medium">{movement.user}</span>
                            </div>
                          )}
                        </div>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="ml-2">
                            {expandedMovement === movement.id ? 
                              <ChevronUp className="h-4 w-4" /> : 
                              <ChevronDown className="h-4 w-4" />
                            }
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                      
                      <div className="mt-2">
                        <p className={cn(
                          "text-sm font-bold",
                          movement.movementType === 'income' ? 'text-green-600' : 'text-red-600'
                        )}>
                          {movement.movementType === 'income' ? '+' : '-'} Bs. {Math.abs(movement.amount).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    
                    <CollapsibleContent className="px-3 pb-3 border-t">
                      <div className="grid grid-cols-2 gap-3 text-xs mt-2">
                        <div>
                          <span className="text-muted-foreground">Fecha completa:</span>
                          <p className="font-medium">{formatDateDisplay(movement.date)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Tipo:</span>
                          <p className="font-medium">{movement.movementType === 'income' ? 'Ingreso' : 'Egreso'}</p>
                        </div>
                        {movement.user && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Usuario:</span>
                            <p className="font-medium">{movement.user}</p>
                          </div>
                        )}
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Descripción completa:</span>
                          <p className="font-medium">{movement.description}</p>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8 text-sm">
                  No hay movimientos registrados
                </div>
              )}
            </div>

            {/* Vista desktop - Tabla completa */}
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-sm min-w-[100px]">Fecha</TableHead>
                    <TableHead className="text-sm min-w-[120px]">Usuario</TableHead>
                    <TableHead className="text-sm min-w-[80px]">Tipo</TableHead>
                    <TableHead className="text-sm min-w-[120px]">Descripción</TableHead>
                    <TableHead className="text-right text-sm min-w-[100px]">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    [1, 2, 3].map((i) => (
                      <TableRow key={i}>
                        <TableCell><div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div></TableCell>
                        <TableCell><div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div></TableCell>
                        <TableCell><div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div></TableCell>
                        <TableCell><div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div></TableCell>
                        <TableCell><div className="h-4 bg-gray-200 rounded w-16 animate-pulse ml-auto"></div></TableCell>
                      </TableRow>
                    ))
                  ) : movements.length > 0 ? (
                    movements.map((movement) => (
                      <TableRow key={movement.id}>
                        <TableCell className="text-sm">
                          {formatDateDisplay(movement.date)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {movement.user || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {getMovementBadge(movement.movementType)}
                        </TableCell>
                        <TableCell className="text-sm">{movement.description}</TableCell>
                        <TableCell className={cn(
                          "text-right font-bold text-sm",
                          movement.movementType === 'income' ? 'text-green-600' : 'text-red-600'
                        )}>
                          {movement.movementType === 'income' ? '+' : '-'} Bs. {Math.abs(movement.amount).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-4">
                        No hay movimientos registrados
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}