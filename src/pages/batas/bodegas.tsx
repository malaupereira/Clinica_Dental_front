import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';

const Bodegas = () => {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Bodegas</h1>
        <p className="text-muted-foreground mt-2">
          Gestión de bodegas y almacenamiento de productos
        </p>
      </div>

      <div className="grid gap-6">
        <Card className="border-border bg-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-batas-primary/10">
                <Package className="h-6 w-6 text-batas-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Próximamente disponible</CardTitle>
                <CardDescription>
                  Estamos trabajando en esta funcionalidad
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="py-16 text-center">
              <div className="max-w-md mx-auto space-y-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-batas-primary/10">
                  <Package className="h-10 w-10 text-batas-primary" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold text-foreground">
                    Estamos trabajando en esto
                  </h2>
                  <p className="text-muted-foreground text-lg">
                    Próximamente disponible
                  </p>
                </div>
                <div className="pt-4">
                  <p className="text-sm text-muted-foreground">
                    Esta sección estará disponible pronto para gestionar tus bodegas y 
                    almacenamiento de productos de manera eficiente.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border bg-card">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Estado</div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse"></div>
                  <div className="font-medium">En desarrollo</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Sección</div>
                <div className="font-medium">Dr. Dress</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Funcionalidades</div>
                <div className="font-medium">Gestión de inventario</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Bodegas;