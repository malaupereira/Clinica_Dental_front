// src/pages/admin/Reports.tsx
import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertTriangle } from 'lucide-react';

export default function Reports() {
  const { 
    reportsData, 
    lowStockProducts, 
    leastSoldProducts, 
    refreshReportsData, 
    refreshLowStockProducts, 
    refreshLeastSoldProducts,
    loading 
  } = useApp();
  const [salesPeriod, setSalesPeriod] = useState<'day' | 'range' | 'week' | 'month'>('month');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [productType, setProductType] = useState<'clinic' | 'batas'>('clinic');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReportsData();
  }, [salesPeriod, dateRange, productType]);

  const loadReportsData = async () => {
    try {
      setError(null);
      await Promise.all([
        refreshReportsData(salesPeriod, dateRange, productType),
        refreshLowStockProducts(),
        refreshLeastSoldProducts()
      ]);
    } catch (error) {
      console.error('Error loading reports:', error);
      setError('No se pudieron cargar los datos de reportes. Por favor, intente nuevamente.');
    }
  };

  // Datos para el gráfico
  const chartData = reportsData?.mostSoldProducts?.map(product => ({
    name: product.nombre.length > 20 ? product.nombre.substring(0, 20) + '...' : product.nombre,
    cantidad: product.cantidad_vendida,
    ingresos: product.ingresos_totales
  })) || [];

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error al cargar reportes</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button 
              onClick={loadReportsData}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reportes</h1>
        <p className="text-muted-foreground">Análisis y estadísticas del negocio</p>
      </div>

      {/* Most Sold Products Chart */}
      <Card>
        <CardHeader>
          <CardTitle>
            {productType === 'batas' ? 'Productos Más Vendidos' : 'Servicios Más Vendidos'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <Label>Tipo</Label>
                <Select value={productType} onValueChange={(value: 'clinic' | 'batas') => setProductType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clinic">Dental Studio</SelectItem>
                    <SelectItem value="batas">Dr.Dress</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <Label>Periodo</Label>
                <Select value={salesPeriod} onValueChange={(value: any) => setSalesPeriod(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Hoy</SelectItem>
                    <SelectItem value="range">Rango de Fechas</SelectItem>
                    <SelectItem value="week">Última Semana</SelectItem>
                    <SelectItem value="month">Último Mes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {salesPeriod === 'range' && (
                <>
                  <div className="flex-1 min-w-[200px]">
                    <Label>Fecha Inicio</Label>
                    <Input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <Label>Fecha Fin</Label>
                    <Input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="w-full h-[400px]">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <p>Cargando datos...</p>
                </div>
              ) : chartData.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">No hay datos de ventas para el periodo seleccionado</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={100}
                      interval={0}
                      fontSize={12}
                    />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === 'ingresos') return [`Bs. ${Number(value).toFixed(2)}`, 'Ingresos'];
                        return [value, 'Cantidad Vendida'];
                      }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="cantidad" fill="hsl(var(--primary))" name="Cantidad Vendida" />
                    <Bar yAxisId="right" dataKey="ingresos" fill="hsl(var(--accent))" name="Ingresos (Bs.)" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Least Sold Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Productos Menos Vendidos (Últimos 3 Meses)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p>Cargando datos...</p>
            </div>
          ) : !leastSoldProducts || leastSoldProducts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay productos sin ventas en los últimos 3 meses</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Talla</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Stock Actual</TableHead>
                  <TableHead>Última Venta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leastSoldProducts.map((product) => (
                  <TableRow key={product.idproducto}>
                    <TableCell className="font-medium">{product.nombre}</TableCell>
                    <TableCell>
                      {product.talla ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {product.talla}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {product.color ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {product.color}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>{product.stock} unidades</TableCell>
                    <TableCell>
                      {product.ultima_venta ? (
                        <Badge variant="outline">
                          {new Date(product.ultima_venta).toLocaleDateString('es-ES')}
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Nunca se ha vendido</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Low Stock Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Alertas de Stock Bajo - Productos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p>Cargando datos...</p>
            </div>
          ) : !lowStockProducts || lowStockProducts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay productos con stock bajo</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Talla</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Stock Actual</TableHead>
                  <TableHead>Stock Mínimo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockProducts.map(product => (
                  <TableRow key={product.idproducto}>
                    <TableCell className="font-medium">{product.nombre}</TableCell>
                    <TableCell>
                      {product.talla ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {product.talla}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {product.color ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {product.color}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${product.stock === 0 ? 'text-destructive' : 'text-amber-600'}`}>
                        {product.stock} unidades
                      </span>
                    </TableCell>
                    <TableCell>{product.stock_minimo} unidades</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}