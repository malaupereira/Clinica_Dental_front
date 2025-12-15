import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Minus, Plus, ShoppingCart, Search, Percent, Package, Trash2 } from 'lucide-react';
import { searchProducts, createSale, SaleRequest } from '@/api/SalesApi';
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

interface CartItem {
  productId: string;
  quantity: number;
}

interface Product {
  id: string;
  name: string;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  type: 'clinic' | 'batas';
  talla?: string;
  color?: string;
  warehouseStock?: number;
}

export default function RegisterSale() {
  const { products: contextProducts, refreshProducts, refreshBatasRecords, refreshTransactions } = useApp();
  const { user } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'QR' | 'Efectivo' | 'Mixto'>('Efectivo');
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [qrAmount, setQrAmount] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [discount, setDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cartRef = useRef<HTMLDivElement>(null);

  // Filtrar solo productos con stock (todos son de tipo batas ahora)
  const products = contextProducts.filter(p => p.stock > 0);

  useEffect(() => {
    const searchProductsFromAPI = async () => {
      if (searchQuery.trim() === '') {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const results = await searchProducts(searchQuery);
        // Mostrar todos los productos encontrados, incluso con stock 0
        setSearchResults(results);
      } catch (error) {
        console.error('Error searching products:', error);
        toast.error('Error al buscar productos');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchProductsFromAPI, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const addToCart = (productId: string) => {
    const allProducts = [...products, ...searchResults];
    const product = allProducts.find(p => p.id === productId);
    if (!product) {
      toast.error('Producto no encontrado');
      return;
    }
    
    if (product.stock === 0) {
      toast.error('Producto sin stock');
      return;
    }
    
    const existingItem = cart.find(item => item.productId === productId);
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        toast.error('No hay suficiente stock');
        return;
      }
      setCart(cart.map(item => 
        item.productId === productId 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { productId, quantity: 1 }]);
    }

    setSearchQuery('');
    setSearchResults([]);

    setTimeout(() => {
      if (window.innerWidth <= 768 && cartRef.current) {
        cartRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    }, 100);
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
    toast.success('Producto eliminado del carrito');
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    const allProducts = [...products, ...searchResults];
    const product = allProducts.find(p => p.id === productId);
    
    if (!product) return;
    
    // Si la cantidad es 0, no eliminamos del carrito pero bloqueamos el botón
    if (newQuantity < 0) return;
    
    if (newQuantity > product.stock) {
      toast.error('No hay suficiente stock');
      return;
    }
    
    setCart(cart.map(i => 
      i.productId === productId 
        ? { ...i, quantity: newQuantity }
        : i
    ));
  };

  const incrementQuantity = (productId: string) => {
    const item = cart.find(i => i.productId === productId);
    if (!item) return;
    updateQuantity(productId, item.quantity + 1);
  };

  const decrementQuantity = (productId: string) => {
    const item = cart.find(i => i.productId === productId);
    if (!item) return;
    updateQuantity(productId, item.quantity - 1);
  };

  const handleQuantityInputChange = (productId: string, value: string) => {
    const numericValue = value === '' ? 0 : parseInt(value);
    
    if (isNaN(numericValue) || numericValue < 0) {
      // Si no es un número válido, establecer en 0 pero mantener en carrito
      updateQuantity(productId, 0);
      return;
    }
    
    updateQuantity(productId, numericValue);
  };

  const calculateSubtotal = () => {
    const allProducts = [...products, ...searchResults];
    return cart.reduce((sum, item) => {
      const product = allProducts.find(p => p.id === item.productId);
      return sum + (product?.salePrice || 0) * item.quantity;
    }, 0);
  };

  const calculateDiscountAmount = () => {
    if (discountType === 'percentage') {
      return (calculateSubtotal() * discount) / 100;
    } else {
      return Math.min(discount, calculateSubtotal());
    }
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discountAmount = calculateDiscountAmount();
    return Math.max(0, subtotal - discountAmount);
  };

  const subtotal = calculateSubtotal();
  const discountAmount = calculateDiscountAmount();
  const total = calculateTotal();

  const handleCashAmountChange = (value: number) => {
    setCashAmount(value);
    setQrAmount(Math.max(0, total - value));
  };

  const handleQrAmountChange = (value: number) => {
    setQrAmount(value);
    setCashAmount(Math.max(0, total - value));
  };

  const handleDiscountChange = (value: number) => {
    setDiscount(Math.max(0, value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (cart.length === 0) {
      toast.error('Agregue productos al carrito');
      return;
    }

    // Verificar si hay productos con cantidad 0
    const hasZeroQuantity = cart.some(item => item.quantity === 0);
    if (hasZeroQuantity) {
      toast.error('Hay productos con cantidad 0. Ajuste las cantidades antes de continuar.');
      return;
    }

    if (isSubmitting) {
      toast.error('La venta ya se está procesando');
      return;
    }

    // Mostrar diálogo de confirmación
    setShowConfirmation(true);
  };

  const confirmSale = async () => {
    setShowConfirmation(false);
    setIsSubmitting(true);
    setLoading(true);
    
    try {
      const currentSubtotal = calculateSubtotal();
      const currentDiscountAmount = calculateDiscountAmount();
      const currentTotal = Math.max(0, currentSubtotal - currentDiscountAmount);

      if (paymentMethod === 'Mixto' && (cashAmount + qrAmount !== currentTotal)) {
        toast.error('La suma de efectivo y QR debe ser igual al total');
        setIsSubmitting(false);
        setLoading(false);
        return;
      }

      const allProducts = [...products, ...searchResults];
      const productosData = cart.map(item => {
        const product = allProducts.find(p => p.id === item.productId);
        return {
          idproducto: parseInt(item.productId),
          cantidad: item.quantity,
          precio_unitario: product?.salePrice || 0
        };
      });

      let detalles = 'Venta de productos: ';
      detalles += cart.map(item => {
        const product = allProducts.find(p => p.id === item.productId);
        const detallesProducto = [];
        if (product?.talla) detallesProducto.push(`Talla: ${product.talla}`);
        if (product?.color) detallesProducto.push(`Color: ${product.color}`);
        const detallesStr = detallesProducto.length > 0 ? ` (${detallesProducto.join(', ')})` : '';
        return `${product?.name}${detallesStr} x${item.quantity}`;
      }).join(', ');

      if (discount > 0) {
        detalles += ` - Descuento: ${discount}${discountType === 'percentage' ? '%' : ' Bs.'}`;
      }

      const saleData: SaleRequest = {
        idusuario: user?.idUsuario || 0,
        detalles: detalles,
        metodo_pago: paymentMethod,
        monto_total: currentTotal,
        monto_efectivo: paymentMethod === 'QR' ? 0 : (paymentMethod === 'Mixto' ? cashAmount : currentTotal),
        monto_qr: paymentMethod === 'Efectivo' ? 0 : (paymentMethod === 'Mixto' ? qrAmount : currentTotal),
        productos: productosData
      };

      const result = await createSale(saleData);

      if (result.success) {
        toast.success('Venta registrada exitosamente');
        
        await Promise.all([
          refreshProducts(),
          refreshBatasRecords(),
          refreshTransactions()
        ]);

        setCart([]);
        setPaymentMethod('Efectivo');
        setCashAmount(0);
        setQrAmount(0);
        setDiscount(0);
        setDiscountType('percentage');
        setSearchQuery('');
        setSearchResults([]);
      } else {
        toast.error('Error al registrar la venta');
      }
    } catch (error) {
      console.error('Error al registrar venta:', error);
      toast.error('Error al registrar la venta');
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  const cancelSale = () => {
    setShowConfirmation(false);
  };

  const displayProducts = searchQuery ? searchResults : [];
  const allProducts = [...products, ...searchResults];
  const canCompleteSale = cart.length > 0 && !cart.some(item => item.quantity === 0);

  // Función para obtener el nombre completo del producto con talla y color
  const getFullProductName = (product: Product) => {
    let fullName = product.name;
    if (product.talla) {
      fullName += ` ${product.talla}`;
    }
    if (product.color) {
      fullName += ` ${product.color}`;
    }
    return fullName;
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Registrar Venta - Dr.Dress</h1>
        <p className="text-muted-foreground">Registre una nueva venta de productos Dr.Dress</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Productos Disponibles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar producto, talla o color..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {searchQuery ? (
                <div className="space-y-2">
                  {isSearching ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Buscando productos...
                    </div>
                  ) : displayProducts.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="grid grid-cols-12 bg-muted/50 p-3 text-sm font-medium text-muted-foreground border-b">
                        <div className="col-span-4">Producto</div>
                        <div className="col-span-2 text-center">Talla</div>
                        <div className="col-span-2 text-center">Color</div>
                        <div className="col-span-2 text-right">Precio</div>
                        <div className="col-span-2 text-right">Acción</div>
                      </div>
                      {displayProducts.map(product => {
                        const isOutOfStock = product.stock === 0;
                        return (
                          <div 
                            key={product.id} 
                            className={`grid grid-cols-12 items-center p-3 border-b hover:bg-muted/30 transition-colors ${
                              isOutOfStock ? 'bg-gray-50' : ''
                            }`}
                          >
                            <div className="col-span-4">
                              <div className="font-medium">{product.name}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  isOutOfStock 
                                    ? 'bg-red-100 text-red-800' 
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  Stock: {product.stock}
                                </span>
                                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-800 rounded flex items-center">
                                  <Package className="h-3 w-3 mr-1" />
                                  Bodega: {product.warehouseStock || 0}
                                </span>
                              </div>
                            </div>
                            <div className="col-span-2 text-center">
                              {product.talla ? (
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                                  {product.talla}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </div>
                            <div className="col-span-2 text-center">
                              {product.color ? (
                                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                                  {product.color}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </div>
                            <div className="col-span-2 text-right pr-2">
                              <div className="font-bold text-primary">Bs. {product.salePrice}</div>
                            </div>
                            <div className="col-span-2 text-right">
                              <Button 
                                onClick={() => addToCart(product.id)} 
                                size="sm"
                                disabled={isOutOfStock}
                                variant={isOutOfStock ? "outline" : "default"}
                                className="h-8 w-auto px-3" 
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Agregar
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No se encontraron productos que coincidan con "{searchQuery}"
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Ingrese un término de búsqueda para ver los productos</p>
                  <p className="text-sm mt-2">Busque por nombre, talla o color del producto</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div ref={cartRef}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ShoppingCart className="h-5 w-5 mr-2" />
                Carrito
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {cart.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Carrito vacío</p>
                ) : (
                  <div className="space-y-3">
                    {cart.map(item => {
                      const product = allProducts.find(p => p.id === item.productId);
                      if (!product) return null;
                      const totalPrice = product.salePrice * item.quantity;
                      return (
                        <div key={item.productId} className="p-3 bg-muted rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="font-medium text-sm block">{product.name}</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {product.talla && (
                                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                                        Talla: {product.talla}
                                      </span>
                                    )}
                                    {product.color && (
                                      <span className="px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-xs">
                                        Color: {product.color}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => removeFromCart(item.productId)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 mb-2">
                            <span className="font-bold">Bs. {totalPrice.toFixed(2)}</span>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs ${product.stock === 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                                Stock: {product.stock}
                              </span>
                              {product.warehouseStock !== undefined && (
                                <span className="text-xs text-gray-600 flex items-center">
                                  <Package className="h-2.5 w-2.5 mr-0.5" />
                                  Bodega: {product.warehouseStock}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="h-8 w-8"
                                onClick={() => decrementQuantity(item.productId)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input
                                type="number"
                                min="0"
                                value={item.quantity === 0 ? '' : item.quantity}
                                onChange={(e) => handleQuantityInputChange(item.productId, e.target.value)}
                                onWheel={(e) => e.currentTarget.blur()}
                                className="w-16 h-8 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                placeholder="0"
                              />
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="h-8 w-8"
                                onClick={() => incrementQuantity(item.productId)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              Bs. {product.salePrice} c/u
                            </span>
                          </div>
                          {item.quantity === 0 && (
                            <div className="mt-2 text-xs text-red-600 font-medium">
                              Cantidad en 0 - Ajuste para habilitar la venta
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {cart.length > 0 && (
                  <div className="space-y-3 pt-4 border-t">
                    <Label className="flex items-center">
                      <Percent className="h-4 w-4 mr-2" />
                      Descuento
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-1">
                        <Select value={discountType} onValueChange={(value: 'percentage' | 'fixed') => setDiscountType(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">%</SelectItem>
                            <SelectItem value="fixed">Bs.</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-2">
                        <Input
                          type="number"
                          step={discountType === 'percentage' ? 1 : 0.01}
                          min="0"
                          max={discountType === 'percentage' ? 100 : undefined}
                          value={discount || ''}
                          onChange={(e) => handleDiscountChange(parseFloat(e.target.value) || 0)}
                          placeholder={discountType === 'percentage' ? 'Porcentaje' : 'Monto fijo'}
                          onWheel={(e) => e.currentTarget.blur()}
                          className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    </div>
                    {discount > 0 && (
                      <div className="text-sm text-muted-foreground">
                        Descuento aplicado: Bs. {discountAmount.toFixed(2)}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2 pt-4 border-t">
                  <Label>Método de Pago</Label>
                  <Select value={paymentMethod} onValueChange={(value: 'QR' | 'Efectivo' | 'Mixto') => setPaymentMethod(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Efectivo">Efectivo</SelectItem>
                      <SelectItem value="QR">QR</SelectItem>
                      <SelectItem value="Mixto">Mixto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {paymentMethod === 'Mixto' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/30">
                    <div className="space-y-2">
                      <Label>Efectivo (Bs.)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={cashAmount || ''}
                        onChange={(e) => handleCashAmountChange(parseFloat(e.target.value) || 0)}
                        placeholder="Monto en efectivo"
                        onWheel={(e) => e.currentTarget.blur()}
                        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>QR (Bs.)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={qrAmount || ''}
                        onChange={(e) => handleQrAmountChange(parseFloat(e.target.value) || 0)}
                        placeholder="Monto por QR"
                        onWheel={(e) => e.currentTarget.blur()}
                        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>Bs. {subtotal.toFixed(2)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-sm text-red-600">
                        <span>Descuento:</span>
                        <span>- Bs. {discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-xl font-bold border-t pt-2">
                      <span>Total:</span>
                      <span>Bs. {total.toFixed(2)}</span>
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    size="lg" 
                    disabled={!canCompleteSale || loading || isSubmitting}
                  >
                    {loading ? 'Procesando...' : 'Completar Venta'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Diálogo de confirmación */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar venta?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de registrar una venta por <strong>Bs. {total.toFixed(2)}</strong>. 
              Esta acción no se puede deshacer.
              <br /><br />
              <strong>Productos:</strong>
              <ul className="list-disc list-inside mt-2">
                {cart.map(item => {
                  const product = allProducts.find(p => p.id === item.productId);
                  return product ? (
                    <li key={item.productId}>
                      {getFullProductName(product)} x{item.quantity} - Bs. {(product.salePrice * item.quantity).toFixed(2)}
                    </li>
                  ) : null;
                })}
              </ul>
              {discount > 0 && (
                <div className="mt-2">
                  <strong>Descuento:</strong> {discount}{discountType === 'percentage' ? '%' : ' Bs.'} 
                  (Bs. {discountAmount.toFixed(2)})
                </div>
              )}
              <div className="mt-2">
                <strong>Método de pago:</strong> {paymentMethod}
                {paymentMethod === 'Mixto' && (
                  <span> (Efectivo: Bs. {cashAmount.toFixed(2)}, QR: Bs. {qrAmount.toFixed(2)})</span>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelSale}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSale} className="bg-green-600 hover:bg-green-700">
              Sí, confirmar venta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}