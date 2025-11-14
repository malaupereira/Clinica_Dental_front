import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Minus, Plus, ShoppingCart, Search, Percent } from 'lucide-react';
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
  const [searchResults, setSearchResults] = useState<any[]>([]);
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
        setSearchResults(results.filter(p => p.stock > 0));
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
    const product = [...products, ...searchResults].find(p => p.id === productId);
    if (!product || product.stock === 0) {
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

  const updateQuantity = (productId: string, delta: number) => {
    const allProducts = [...products, ...searchResults];
    const product = allProducts.find(p => p.id === productId);
    const item = cart.find(i => i.productId === productId);
    
    if (!product || !item) return;
    
    const newQuantity = item.quantity + delta;
    
    if (newQuantity <= 0) {
      setCart(cart.filter(i => i.productId !== productId));
      return;
    }
    
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
        return `${product?.name} x${item.quantity}`;
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
                  placeholder="Buscar producto..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {searchQuery ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {isSearching ? (
                    <div className="col-span-2 text-center py-8 text-muted-foreground">
                      Buscando productos...
                    </div>
                  ) : displayProducts.length > 0 ? (
                    displayProducts.map(product => (
                      <div key={product.id} className="p-4 border rounded-lg hover:border-primary transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold">{product.name}</h3>
                            <p className="text-2xl font-bold text-primary">Bs. {product.salePrice}</p>
                          </div>
                          <span className="px-2 py-1 bg-muted rounded text-sm">
                            Stock: {product.stock}
                          </span>
                        </div>
                        <Button onClick={() => addToCart(product.id)} className="w-full" size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Agregar
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 text-center py-8 text-muted-foreground">
                      No se encontraron productos que coincidan con "{searchQuery}"
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Ingrese un término de búsqueda para ver los productos</p>
                  <p className="text-sm mt-2">Busque por nombre de producto</p>
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
                      const allProducts = [...products, ...searchResults];
                      const product = allProducts.find(p => p.id === item.productId);
                      if (!product) return null;
                      return (
                        <div key={item.productId} className="p-3 bg-muted rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-sm">{product.name}</span>
                            <span className="font-bold">Bs. {(product.salePrice * item.quantity).toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="h-8 w-8"
                                onClick={() => updateQuantity(item.productId, -1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center font-medium">{item.quantity}</span>
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="h-8 w-8"
                                onClick={() => updateQuantity(item.productId, 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              Bs. {product.salePrice} c/u
                            </span>
                          </div>
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
                    disabled={cart.length === 0 || loading || isSubmitting}
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
                  const allProducts = [...products, ...searchResults];
                  const product = allProducts.find(p => p.id === item.productId);
                  return product ? (
                    <li key={item.productId}>
                      {product.name} x{item.quantity} - Bs. {(product.salePrice * item.quantity).toFixed(2)}
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