import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, AlertTriangle, Pencil, Trash2, PackagePlus, Search, ChevronDown, ChevronUp, Package, TrendingUp, DollarSign, AlertCircle } from 'lucide-react';
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
import { getProducts, createProduct, updateProduct, deleteProduct, addStock, getProductStats, Product, ProductStats } from '@/api/InventoryApi';

interface ProductFormData {
  nombre: string;
  precio_compra: string;
  precio_venta: string;
  stock: string;
  stock_minimo: string;
}

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
  const [formData, setFormData] = useState<ProductFormData>({
    nombre: '',
    precio_compra: '',
    precio_venta: '',
    stock: '',
    stock_minimo: ''
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
      if (editingProduct) {
        await updateProduct(editingProduct.idproducto, {
          nombre: formData.nombre,
          precio_compra: Number(formData.precio_compra) || 0,
          precio_venta: Number(formData.precio_venta),
          stock: Number(formData.stock) || 0,
          stock_minimo: Number(formData.stock_minimo) || 0,
        });
        toast.success('Producto actualizado exitosamente');
        setEditingProduct(null);
      } else {
        await createProduct({
          nombre: formData.nombre,
          precio_compra: Number(formData.precio_compra) || 0,
          precio_venta: Number(formData.precio_venta),
          stock: Number(formData.stock) || 0,
          stock_minimo: Number(formData.stock_minimo) || 0,
        });
        toast.success('Producto creado exitosamente');
      }

      setOpen(false);
      setFormData({
        nombre: '',
        precio_compra: '',
        precio_venta: '',
        stock: '',
        stock_minimo: ''
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
      stock_minimo: product.stock_minimo.toString()
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

  const filteredProducts = products.filter(product => 
    product.nombre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockProducts = filteredProducts.filter(product => product.stock <= product.stock_minimo);

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

  return (
    <div className="container mx-auto p-3 sm:p-4 space-y-4 sm:space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Inventario</h1>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground">Gestione el inventario de productos</p>
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
              stock_minimo: ''
            });
          }
        }}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto text-sm sm:text-base" disabled={isSubmitting}>
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Nuevo Producto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-md rounded-lg mx-2 sm:mx-auto">
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
          <CardTitle className="text-base sm:text-lg md:text-xl">Lista de Productos</CardTitle>
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
            ) : filteredProducts.length > 0 ? (
              filteredProducts.map((product) => {
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
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-sm truncate" title={product.nombre}>
                              {product.nombre}
                            </h3>
                            {isLowStock && (
                              <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs font-medium ${
                              isLowStock ? 'text-amber-600' : 'text-foreground'
                            }`}>
                              Stock: {product.stock}
                            </span>
                            <Badge 
                              variant={stats.margin > 0 ? "default" : "secondary"}
                              className="text-xs"
                            >
                              Margen: Bs. {stats.margin.toFixed(2)}
                            </Badge>
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
                {searchQuery ? 'No se encontraron productos' : 'No hay productos registrados'}
              </div>
            )}
          </div>

          {/* Vista desktop - Tabla completa */}
          <div className="hidden sm:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-sm">Producto</TableHead>
                  <TableHead className="text-sm">Compra (Bs.)</TableHead>
                  <TableHead className="text-sm">Venta (Bs.)</TableHead>
                  <TableHead className="text-sm">Margen (Bs.)</TableHead>
                  <TableHead className="text-sm">Margen %</TableHead>
                  <TableHead className="text-sm">Stock</TableHead>
                  <TableHead className="text-sm">Mínimo</TableHead>
                  <TableHead className="text-sm">Inversión (Bs.)</TableHead>
                  <TableHead className="text-sm">Venta Potencial (Bs.)</TableHead>
                  <TableHead className="text-sm">Utilidad (Bs.)</TableHead>
                  <TableHead className="text-sm">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [1, 2, 3].map((i) => (
                    <TableRow key={i}>
                      <TableCell><div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div></TableCell>
                      <TableCell><div className="h-8 bg-gray-200 rounded w-24 animate-pulse"></div></TableCell>
                    </TableRow>
                  ))
                ) : filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => {
                    const stats = calculateProductStats(product);
                    const isLowStock = product.stock <= product.stock_minimo;
                    
                    return (
                      <TableRow key={product.idproducto}>
                        <TableCell className="font-medium text-sm max-w-[200px] truncate" title={product.nombre}>
                          <div className="flex items-center gap-2">
                            {product.nombre}
                            {isLowStock && (
                              <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0" />
                            )}
                          </div>
                        </TableCell>
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
                          <div className="flex gap-1">
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
                    <TableCell colSpan={11} className="text-center text-muted-foreground text-sm py-4">
                      {searchQuery ? 'No se encontraron productos' : 'No hay productos registrados'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
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
  );
}