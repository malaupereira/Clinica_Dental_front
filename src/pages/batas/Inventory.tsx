import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, AlertTriangle, Pencil, Trash2, PackagePlus, Search, ChevronDown, ChevronUp, Package, TrendingUp, DollarSign, AlertCircle, ArrowUpDown } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getProducts, createProduct, updateProduct, deleteProduct, addStock, getProductStats, Product, ProductStats } from '@/api/InventoryApi';

interface ProductFormData {
  nombre: string;
  precio_compra: string;
  precio_venta: string;
  stock: string;
  stock_minimo: string;
  talla: string;
  color: string;
  customTalla?: string;
  customColor?: string;
}

// Opciones para tallas
const TALLA_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'Otro'];

// Opciones para colores (ordenados alfabéticamente)
const COLOR_OPTIONS = [
  'Api', 'Azul', 'Blanco', 'Celeste', 'Dorado', 'Fuxia', 'Guindo', 
  'Lila', 'Marifl', 'Morado', 'Negro', 'Petroleo', 'Plomo', 'Rosa', 
  'Turquesa', 'Verde', 'Verde Agua', 'Verde Esmeralda', 'Otro'
];

type SortField = 'nombre' | 'talla' | 'color' | 'stock' | 'precio_venta';
type SortDirection = 'asc' | 'desc';

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<ProductStats>({
    totalProducts: 0,
    lowStockProducts: 0,
    totalInvestment: 0,
    potentialRevenue: 0,
    potentialProfit: 0
  });
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<number | null>(null);
  const [addingStockProduct, setAddingStockProduct] = useState<Product | null>(null);
  const [stockToAdd, setStockToAdd] = useState('');
  const [expandedProduct, setExpandedProduct] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortField, setSortField] = useState<SortField>('nombre');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [colorFilter, setColorFilter] = useState<string>('all');
  const [tallaFilter, setTallaFilter] = useState<string>('all');
  const [colorSearch, setColorSearch] = useState('');
  
  const [formData, setFormData] = useState<ProductFormData>({
    nombre: '',
    precio_compra: '',
    precio_venta: '',
    stock: '',
    stock_minimo: '',
    talla: 'na',
    color: 'na'
  });

  // Cargar productos y estadísticas
  useEffect(() => {
    loadProducts();
    loadStats();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const productsData = await getProducts();
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('No se pudieron cargar los productos');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await getProductStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) {
      toast.error('La operación ya está siendo procesada');
      return;
    }
    
    if (!formData.nombre || !formData.precio_venta || Number(formData.precio_venta) <= 0) {
      toast.error('Complete todos los campos requeridos');
      return;
    }

    setIsSubmitting(true);
    setLoading(true);

    try {
      // Procesar talla
      let tallaFinal = formData.talla === 'na' ? null : formData.talla;
      if (formData.talla === 'Otro' && formData.customTalla) {
        tallaFinal = formData.customTalla;
      }

      // Procesar color
      let colorFinal = formData.color === 'na' ? null : formData.color;
      if (formData.color === 'Otro' && formData.customColor) {
        colorFinal = formData.customColor;
      }

      const productData = {
        nombre: formData.nombre,
        precio_compra: Number(formData.precio_compra) || 0,
        precio_venta: Number(formData.precio_venta),
        stock: Number(formData.stock) || 0,
        stock_minimo: Number(formData.stock_minimo) || 0,
        talla: tallaFinal,
        color: colorFinal,
      };

      if (editingProduct) {
        await updateProduct(editingProduct.idproducto, productData);
        toast.success('Producto actualizado exitosamente');
        setEditingProduct(null);
      } else {
        await createProduct(productData);
        toast.success('Producto creado exitosamente');
      }

      setOpen(false);
      setFormData({
        nombre: '',
        precio_compra: '',
        precio_venta: '',
        stock: '',
        stock_minimo: '',
        talla: 'na',
        color: 'na'
      });
      
      // Recargar datos
      await Promise.all([loadProducts(), loadStats()]);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  const handleEdit = (product: Product) => {
    if (isSubmitting) return;
    
    setEditingProduct(product);
    setFormData({
      nombre: product.nombre,
      precio_compra: product.precio_compra.toString(),
      precio_venta: product.precio_venta.toString(),
      stock: product.stock.toString(),
      stock_minimo: product.stock_minimo.toString(),
      talla: product.talla || 'na',
      color: product.color || 'na'
    });
    setOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (isSubmitting) {
      toast.error('La operación ya está siendo procesada');
      return;
    }

    setIsSubmitting(true);
    try {
      await deleteProduct(id);
      setDeletingProductId(null);
      toast.success('Producto eliminado exitosamente');
      await Promise.all([loadProducts(), loadStats()]);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddStock = async () => {
    if (isSubmitting) {
      toast.error('La operación ya está siendo procesada');
      return;
    }

    if (!addingStockProduct || !stockToAdd || Number(stockToAdd) <= 0) {
      toast.error('Ingrese una cantidad válida');
      return;
    }

    setIsSubmitting(true);
    try {
      await addStock(addingStockProduct.idproducto, Number(stockToAdd));
      toast.success(`Se agregaron ${stockToAdd} unidades al stock`);
      setAddingStockProduct(null);
      setStockToAdd('');
      await Promise.all([loadProducts(), loadStats()]);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtrar y ordenar productos
  const filteredAndSortedProducts = products
    .filter(product => {
      const matchesSearch = product.nombre.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesColor = colorFilter === 'all' || 
        (colorFilter === 'na' && !product.color) ||
        (colorFilter !== 'all' && colorFilter !== 'na' && product.color === colorFilter);
      const matchesTalla = tallaFilter === 'all' || 
        (tallaFilter === 'na' && !product.talla) ||
        (tallaFilter !== 'all' && tallaFilter !== 'na' && product.talla === tallaFilter);
      
      return matchesSearch && matchesColor && matchesTalla;
    })
    .sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];
      
      // Manejar valores nulos
      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';
      
      // Convertir a minúsculas para ordenación case-insensitive
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      
      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  const lowStockProducts = filteredAndSortedProducts.filter(product => product.stock <= product.stock_minimo);

  // Obtener colores únicos para el filtro
  const uniqueColors = [...new Set(products.map(p => p.color).filter(Boolean))] as string[];
  const uniqueTallas = [...new Set(products.map(p => p.talla).filter(Boolean))] as string[];

  // Filtrar opciones de color según búsqueda
  const filteredColorOptions = COLOR_OPTIONS.filter(color => 
    color.toLowerCase().includes(colorSearch.toLowerCase())
  );

  const calculateProductStats = (product: Product) => {
    const margin = product.precio_venta - product.precio_compra;
    const totalInvestment = product.precio_compra * product.stock;
    const potentialSale = product.precio_venta * product.stock;
    const potentialProfit = potentialSale - totalInvestment;
    const marginPercentage = product.precio_compra > 0 ? (margin / product.precio_compra) * 100 : 0;

    return {
      margin,
      totalInvestment,
      potentialSale,
      potentialProfit,
      marginPercentage
    };
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1" />;
    return sortDirection === 'asc' ? 
      <ChevronUp className="h-3 w-3 ml-1" /> : 
      <ChevronDown className="h-3 w-3 ml-1" />;
  };

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 lg:p-6">
      <div className="max-w-[1920px] mx-auto space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Inventario</h1>
            <p className="text-xs sm:text-sm lg:text-base text-muted-foreground">Gestione el inventario de productos</p>
          </div>
          <Dialog open={open} onOpenChange={(isOpen) => {
            if (isSubmitting) return;
            setOpen(isOpen);
            if (!isOpen) {
              setEditingProduct(null);
              setFormData({
                nombre: '',
                precio_compra: '',
                precio_venta: '',
                stock: '',
                stock_minimo: '',
                talla: 'na',
                color: 'na'
              });
            }
          }}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto text-sm sm:text-base" disabled={isSubmitting}>
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Nuevo Producto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-md rounded-lg mx-2 sm:mx-auto max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">{editingProduct ? 'Editar Producto' : 'Crear Producto'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm sm:text-base">Nombre del Producto *</Label>
                  <Input
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej: Bata Médica Blanca"
                    className="text-sm sm:text-base"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm sm:text-base">Talla</Label>
                    <Select 
                      value={formData.talla} 
                      onValueChange={(value) => setFormData({ ...formData, talla: value })}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="text-sm sm:text-base">
                        <SelectValue placeholder="Seleccionar talla" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="na">NA</SelectItem>
                        {TALLA_OPTIONS.map((talla) => (
                          <SelectItem key={talla} value={talla}>
                            {talla}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.talla === 'Otro' && (
                      <Input
                        value={formData.customTalla || ''}
                        onChange={(e) => setFormData({ ...formData, customTalla: e.target.value })}
                        placeholder="Especificar talla"
                        className="text-sm sm:text-base mt-2"
                        disabled={isSubmitting}
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm sm:text-base">Color</Label>
                    <Select 
                      value={formData.color} 
                      onValueChange={(value) => setFormData({ ...formData, color: value })}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="text-sm sm:text-base">
                        <SelectValue placeholder="Seleccionar color" />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="p-2">
                          <Input
                            placeholder="Buscar color..."
                            value={colorSearch}
                            onChange={(e) => setColorSearch(e.target.value)}
                            className="text-sm mb-2"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <SelectItem value="na">NA</SelectItem>
                        {filteredColorOptions.map((color) => (
                          <SelectItem key={color} value={color}>
                            {color}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.color === 'Otro' && (
                      <Input
                        value={formData.customColor || ''}
                        onChange={(e) => setFormData({ ...formData, customColor: e.target.value })}
                        placeholder="Especificar color"
                        className="text-sm sm:text-base mt-2"
                        disabled={isSubmitting}
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm sm:text-base">Precio de Compra (Bs.)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.precio_compra}
                      onChange={(e) => setFormData({ ...formData, precio_compra: e.target.value })}
                      placeholder="0.00"
                      className="text-sm sm:text-base"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm sm:text-base">Precio de Venta (Bs.) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.precio_venta}
                      onChange={(e) => setFormData({ ...formData, precio_venta: e.target.value })}
                      placeholder="0.00"
                      className="text-sm sm:text-base"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm sm:text-base">Stock Inicial</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      placeholder="0"
                      className="text-sm sm:text-base"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm sm:text-base">Stock Mínimo</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.stock_minimo}
                      onChange={(e) => setFormData({ ...formData, stock_minimo: e.target.value })}
                      placeholder="0"
                      className="text-sm sm:text-base"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-3 sm:pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setOpen(false)} 
                    className="text-sm sm:text-base w-full sm:w-auto"
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    className="text-sm sm:text-base w-full sm:w-auto"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Procesando...' : (editingProduct ? 'Actualizar' : 'Crear Producto')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Total Productos</CardTitle>
              <Package className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="text-xl sm:text-2xl font-bold">{stats.totalProducts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Stock Bajo</CardTitle>
              <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-amber-500" />
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="text-xl sm:text-2xl font-bold text-amber-600">{stats.lowStockProducts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Inversión Total</CardTitle>
              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="text-xl sm:text-2xl font-bold text-blue-600">Bs. {stats.totalInvestment.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Venta Potencial</CardTitle>
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="text-xl sm:text-2xl font-bold text-green-600">Bs. {stats.potentialRevenue.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Utilidad Potencial</CardTitle>
              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-purple-500" />
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className={`text-xl sm:text-2xl font-bold ${
                stats.potentialProfit >= 0 ? 'text-purple-600' : 'text-red-600'
              }`}>
                Bs. {stats.potentialProfit.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="w-full">
          <CardHeader className="space-y-3 sm:space-y-4 p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg lg:text-xl">Lista de Productos</CardTitle>
            
            {/* Filtros y búsqueda */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar producto..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 sm:pl-10 text-sm sm:text-base"
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Filtrar por Color</Label>
                  <Select value={colorFilter} onValueChange={setColorFilter}>
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue placeholder="Todos los colores" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los colores</SelectItem>
                      <SelectItem value="na">NA</SelectItem>
                      {uniqueColors.sort().map((color) => (
                        <SelectItem key={color} value={color}>{color}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1">
                  <Label className="text-xs">Filtrar por Talla</Label>
                  <Select value={tallaFilter} onValueChange={setTallaFilter}>
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue placeholder="Todas las tallas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las tallas</SelectItem>
                      <SelectItem value="na">NA</SelectItem>
                      {uniqueTallas.sort().map((talla) => (
                        <SelectItem key={talla} value={talla}>{talla}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1">
                  <Label className="text-xs">Ordenar por</Label>
                  <Select 
                    value={`${sortField}-${sortDirection}`} 
                    onValueChange={(value) => {
                      const [field, direction] = value.split('-') as [SortField, SortDirection];
                      setSortField(field);
                      setSortDirection(direction);
                    }}
                  >
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue placeholder="Ordenar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nombre-asc">Producto A-Z</SelectItem>
                      <SelectItem value="nombre-desc">Producto Z-A</SelectItem>
                      <SelectItem value="color-asc">Color A-Z</SelectItem>
                      <SelectItem value="color-desc">Color Z-A</SelectItem>
                      <SelectItem value="talla-asc">Talla A-Z</SelectItem>
                      <SelectItem value="talla-desc">Talla Z-A</SelectItem>
                      <SelectItem value="stock-desc">Stock (Mayor a menor)</SelectItem>
                      <SelectItem value="stock-asc">Stock (Menor a mayor)</SelectItem>
                      <SelectItem value="precio_venta-desc">Precio (Mayor a menor)</SelectItem>
                      <SelectItem value="precio_venta-asc">Precio (Menor a mayor)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0 sm:p-2 lg:p-6">
            {/* Vista móvil - Cards colapsables */}
            <div className="block md:hidden space-y-2 p-2">
              {loading ? (
                [1, 2, 3].map((i) => (
                  <div key={i} className="border rounded-lg p-3 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))
              ) : filteredAndSortedProducts.length > 0 ? (
                filteredAndSortedProducts.map((product) => {
                  const stats = calculateProductStats(product);
                  const isLowStock = product.stock <= product.stock_minimo;
                  
                  return (
                    <Collapsible 
                      key={product.idproducto}
                      open={expandedProduct === product.idproducto}
                      onOpenChange={() => {
                        if (isSubmitting) return;
                        setExpandedProduct(expandedProduct === product.idproducto ? null : product.idproducto);
                      }}
                      className="border rounded-lg"
                    >
                      <div className="p-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium text-sm break-words" title={product.nombre}>
                                {product.nombre}
                              </h3>
                              {isLowStock && (
                                <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0" />
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs">
                              <span className={`font-medium ${
                                isLowStock ? 'text-amber-600' : 'text-foreground'
                              }`}>
                                Stock: {product.stock}
                              </span>
                              <span className="text-muted-foreground">
                                Talla: {product.talla || 'NA'}
                              </span>
                              <span className="text-muted-foreground">
                                Color: {product.color || 'NA'}
                              </span>
                            </div>
                          </div>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="ml-2" disabled={isSubmitting}>
                              {expandedProduct === product.idproducto ? 
                                <ChevronUp className="h-4 w-4" /> : 
                                <ChevronDown className="h-4 w-4" />
                              }
                            </Button>
                          </CollapsibleTrigger>
                        </div>
                      </div>
                      
                      <CollapsibleContent className="px-3 pb-3 border-t">
                        <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                          <div>
                            <span className="text-muted-foreground">Compra:</span>
                            <p className="font-medium">Bs. {product.precio_compra.toFixed(2)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Venta:</span>
                            <p className="font-medium">Bs. {product.precio_venta.toFixed(2)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Stock:</span>
                            <p className={`font-medium ${
                              isLowStock ? 'text-amber-600' : 'text-foreground'
                            }`}>
                              {product.stock}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Mínimo:</span>
                            <p className="font-medium">{product.stock_minimo}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Inversión:</span>
                            <p className="font-medium">Bs. {stats.totalInvestment.toFixed(2)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Venta Potencial:</span>
                            <p className="font-medium">Bs. {stats.potentialSale.toFixed(2)}</p>
                          </div>
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Utilidad:</span>
                            <p className={`font-medium ${
                              stats.potentialProfit > 0 ? 'text-green-600' : 'text-muted-foreground'
                            }`}>
                              Bs. {stats.potentialProfit.toFixed(2)}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Margen %:</span>
                            <p className={`font-medium ${
                              stats.marginPercentage > 0 ? 'text-green-600' : 'text-muted-foreground'
                            }`}>
                              {stats.marginPercentage.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(product)}
                            className="flex-1 text-xs h-8"
                            disabled={isSubmitting}
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setAddingStockProduct(product)}
                            className="flex-1 text-xs h-8"
                            disabled={isSubmitting}
                          >
                            <PackagePlus className="h-3 w-3 mr-1" />
                            Stock
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeletingProductId(product.idproducto)}
                            className="flex-1 text-xs h-8"
                            disabled={isSubmitting}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Eliminar
                          </Button>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })
              ) : (
                <div className="text-center text-muted-foreground py-8 text-sm">
                  {searchQuery || colorFilter !== 'all' || tallaFilter !== 'all' 
                    ? 'No se encontraron productos con los filtros aplicados' 
                    : 'No hay productos registrados'}
                </div>
              )}
            </div>

            {/* Vista tablet - Tabla simplificada */}
            <div className="hidden md:block lg:hidden w-full">
              <div className="w-full overflow-x-auto">
                <Table className="w-full min-w-[800px]">
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="text-sm font-bold cursor-pointer" onClick={() => handleSort('nombre')}>
                        <div className="flex items-center">
                          Producto
                          {getSortIcon('nombre')}
                        </div>
                      </TableHead>
                      <TableHead className="text-sm font-bold">Talla/Color</TableHead>
                      <TableHead className="text-sm font-bold">Precios</TableHead>
                      <TableHead className="text-sm font-bold cursor-pointer" onClick={() => handleSort('stock')}>
                        <div className="flex items-center">
                          Stock
                          {getSortIcon('stock')}
                        </div>
                      </TableHead>
                      <TableHead className="text-sm font-bold">Finanzas</TableHead>
                      <TableHead className="text-sm font-bold text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      [1, 2, 3].map((i) => (
                        <TableRow key={i}>
                          <TableCell><div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div></TableCell>
                          <TableCell><div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div></TableCell>
                          <TableCell><div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div></TableCell>
                          <TableCell><div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div></TableCell>
                          <TableCell><div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div></TableCell>
                          <TableCell><div className="h-8 bg-gray-200 rounded w-full animate-pulse"></div></TableCell>
                        </TableRow>
                      ))
                    ) : filteredAndSortedProducts.length > 0 ? (
                      filteredAndSortedProducts.map((product) => {
                        const stats = calculateProductStats(product);
                        const isLowStock = product.stock <= product.stock_minimo;
                        
                        return (
                          <TableRow key={product.idproducto} className="hover:bg-muted/30">
                            <TableCell className="font-medium text-sm">
                              <div className="flex items-center gap-2">
                                <div className="break-words whitespace-normal max-w-[150px]">
                                  {product.nombre}
                                </div>
                                {isLowStock && (
                                  <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              <div>Talla: {product.talla || 'NA'}</div>
                              <div>Color: {product.color || 'NA'}</div>
                            </TableCell>
                            <TableCell className="text-sm">
                              <div>Compra: Bs. {product.precio_compra.toFixed(2)}</div>
                              <div>Venta: Bs. {product.precio_venta.toFixed(2)}</div>
                              <div className={`text-xs ${stats.margin > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                                Margen: Bs. {stats.margin.toFixed(2)}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              <div className={`font-medium ${
                                isLowStock ? 'text-amber-600' : 'text-foreground'
                              }`}>
                                {product.stock}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Mín: {product.stock_minimo}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              <div>Inversión: Bs. {stats.totalInvestment.toFixed(2)}</div>
                              <div>Venta: Bs. {stats.potentialSale.toFixed(2)}</div>
                              <div className={`text-xs ${stats.potentialProfit > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                                Utilidad: Bs. {stats.potentialProfit.toFixed(2)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 justify-center">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEdit(product)}
                                  className="h-8 w-8 p-0"
                                  disabled={isSubmitting}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setAddingStockProduct(product)}
                                  className="h-8 w-8 p-0"
                                  disabled={isSubmitting}
                                >
                                  <PackagePlus className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setDeletingProductId(product.idproducto)}
                                  className="h-8 w-8 p-0"
                                  disabled={isSubmitting}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-8">
                          {searchQuery || colorFilter !== 'all' || tallaFilter !== 'all' 
                            ? 'No se encontraron productos con los filtros aplicados' 
                            : 'No hay productos registrados'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Vista desktop completa - Tabla completa */}
            <div className="hidden lg:block w-full">
              <div className="w-full overflow-x-auto">
                <Table className="w-full min-w-[1200px]">
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="text-sm font-bold cursor-pointer w-[25%] min-w-[250px]" onClick={() => handleSort('nombre')}>
                        <div className="flex items-center">
                          Producto
                          {getSortIcon('nombre')}
                        </div>
                      </TableHead>
                      <TableHead className="text-sm font-bold cursor-pointer w-[8%] min-w-[80px]" onClick={() => handleSort('talla')}>
                        <div className="flex items-center">
                          Talla
                          {getSortIcon('talla')}
                        </div>
                      </TableHead>
                      <TableHead className="text-sm font-bold cursor-pointer w-[10%] min-w-[100px]" onClick={() => handleSort('color')}>
                        <div className="flex items-center">
                          Color
                          {getSortIcon('color')}
                        </div>
                      </TableHead>
                      <TableHead className="text-sm font-bold w-[8%] min-w-[90px]">Compra (Bs.)</TableHead>
                      <TableHead className="text-sm font-bold w-[8%] min-w-[90px]">Venta (Bs.)</TableHead>
                      <TableHead className="text-sm font-bold w-[8%] min-w-[90px]">Margen (Bs.)</TableHead>
                      <TableHead className="text-sm font-bold w-[8%] min-w-[80px]">Margen %</TableHead>
                      <TableHead className="text-sm font-bold cursor-pointer w-[6%] min-w-[70px]" onClick={() => handleSort('stock')}>
                        <div className="flex items-center">
                          Stock
                          {getSortIcon('stock')}
                        </div>
                      </TableHead>
                      <TableHead className="text-sm font-bold w-[6%] min-w-[70px]">Mínimo</TableHead>
                      <TableHead className="text-sm font-bold w-[9%] min-w-[100px]">Inversión (Bs.)</TableHead>
                      <TableHead className="text-sm font-bold w-[10%] min-w-[110px]">Venta Potencial (Bs.)</TableHead>
                      <TableHead className="text-sm font-bold w-[9%] min-w-[100px]">Utilidad (Bs.)</TableHead>
                      <TableHead className="text-sm font-bold w-[10%] min-w-[120px] text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      [1, 2, 3].map((i) => (
                        <TableRow key={i}>
                          <TableCell><div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div></TableCell>
                          <TableCell><div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div></TableCell>
                          <TableCell><div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div></TableCell>
                          <TableCell><div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div></TableCell>
                          <TableCell><div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div></TableCell>
                          <TableCell><div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div></TableCell>
                          <TableCell><div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div></TableCell>
                          <TableCell><div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div></TableCell>
                          <TableCell><div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div></TableCell>
                          <TableCell><div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div></TableCell>
                          <TableCell><div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div></TableCell>
                          <TableCell><div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div></TableCell>
                          <TableCell><div className="h-8 bg-gray-200 rounded w-full animate-pulse"></div></TableCell>
                        </TableRow>
                      ))
                    ) : filteredAndSortedProducts.length > 0 ? (
                      filteredAndSortedProducts.map((product) => {
                        const stats = calculateProductStats(product);
                        const isLowStock = product.stock <= product.stock_minimo;
                        
                        return (
                          <TableRow key={product.idproducto} className="hover:bg-muted/30">
                            <TableCell className="font-medium text-sm">
                              <div className="flex items-center gap-2">
                                <div className="break-words whitespace-normal">
                                  {product.nombre}
                                </div>
                                {isLowStock && (
                                  <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{product.talla || 'NA'}</TableCell>
                            <TableCell className="text-sm">{product.color || 'NA'}</TableCell>
                            <TableCell className="text-sm">Bs. {product.precio_compra.toFixed(2)}</TableCell>
                            <TableCell className="text-sm">Bs. {product.precio_venta.toFixed(2)}</TableCell>
                            <TableCell className={`text-sm ${stats.margin > 0 ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>
                              Bs. {stats.margin.toFixed(2)}
                            </TableCell>
                            <TableCell className={`text-sm ${stats.marginPercentage > 0 ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>
                              {stats.marginPercentage.toFixed(1)}%
                            </TableCell>
                            <TableCell className={`text-sm font-medium ${
                              isLowStock ? 'text-amber-600' : 'text-foreground'
                            }`}>
                              {product.stock}
                            </TableCell>
                            <TableCell className="text-sm">{product.stock_minimo}</TableCell>
                            <TableCell className="text-sm font-medium">Bs. {stats.totalInvestment.toFixed(2)}</TableCell>
                            <TableCell className="text-sm font-medium">Bs. {stats.potentialSale.toFixed(2)}</TableCell>
                            <TableCell className={`text-sm font-medium ${
                              stats.potentialProfit > 0 ? 'text-green-600' : 'text-muted-foreground'
                            }`}>
                              Bs. {stats.potentialProfit.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 justify-center">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEdit(product)}
                                  className="h-8 w-8 p-0"
                                  disabled={isSubmitting}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setAddingStockProduct(product)}
                                  className="h-8 w-8 p-0"
                                  disabled={isSubmitting}
                                >
                                  <PackagePlus className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setDeletingProductId(product.idproducto)}
                                  className="h-8 w-8 p-0"
                                  disabled={isSubmitting}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={13} className="text-center text-muted-foreground text-sm py-8">
                          {searchQuery || colorFilter !== 'all' || tallaFilter !== 'all' 
                            ? 'No se encontraron productos con los filtros aplicados' 
                            : 'No hay productos registrados'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Diálogo para agregar stock */}
        <Dialog open={!!addingStockProduct} onOpenChange={(isOpen) => {
          if (isSubmitting) return;
          if (!isOpen) {
            setAddingStockProduct(null);
            setStockToAdd('');
          }
        }}>
          <DialogContent className="max-w-[95vw] sm:max-w-md rounded-lg mx-2 sm:mx-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">Agregar Stock</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1 sm:mb-2">Producto: {addingStockProduct?.nombre}</p>
                <p className="text-sm text-muted-foreground">Stock actual: {addingStockProduct?.stock}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm sm:text-base">Cantidad a agregar</Label>
                <Input
                  type="number"
                  min="1"
                  value={stockToAdd}
                  onChange={(e) => setStockToAdd(e.target.value)}
                  placeholder="Ingrese cantidad"
                  className="text-sm sm:text-base"
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-3 sm:pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setAddingStockProduct(null);
                    setStockToAdd('');
                  }} 
                  className="text-sm sm:text-base w-full sm:w-auto"
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleAddStock} 
                  className="text-sm sm:text-base w-full sm:w-auto"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Procesando...' : 'Agregar Stock'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Diálogo de confirmación para eliminar */}
        <AlertDialog open={!!deletingProductId} onOpenChange={(isOpen) => {
          if (isSubmitting) return;
          if (!isOpen) setDeletingProductId(null);
        }}>
          <AlertDialogContent className="max-w-[95vw] sm:max-w-md rounded-lg mx-2 sm:mx-auto">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-lg sm:text-xl">¿Está seguro?</AlertDialogTitle>
              <AlertDialogDescription className="text-sm sm:text-base">
                Esta acción no se puede deshacer. El producto será eliminado permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel 
                className="text-sm sm:text-base mt-2 sm:mt-0"
                disabled={isSubmitting}
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => deletingProductId && handleDelete(deletingProductId)}
                className="text-sm sm:text-base"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Eliminando...' : 'Eliminar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}