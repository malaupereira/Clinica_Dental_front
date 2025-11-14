// src/components/QuotationPDF.tsx
import { Document, Page, Text, View, StyleSheet, pdf, Image } from '@react-pdf/renderer';

// Estilos para el PDF usando los colores de la empresa
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#faf8f5', // hsl(30 20% 97%) convertido a hex
    padding: 25,
    fontSize: 12,
    fontFamily: 'Helvetica',
    minHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
    borderBottomWidth: 2,
    borderBottomColor: '#a8b89a', // hsl(85 18% 66%) convertido a hex
    borderBottomStyle: 'solid',
    paddingBottom: 15,
  },
  logo: {
    width: 200,
    height: 80,
    marginRight: 20,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#a8b89a', // hsl(85 18% 66%) convertido a hex
  },
  subtitle: {
    fontSize: 12,
    color: '#737373', // hsl(0 0% 45%) convertido a hex
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    backgroundColor: '#a8b89a', // hsl(85 18% 66%) convertido a hex
    padding: 8,
    color: '#ffffff',
    borderRadius: 4,
  },
  clientInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e5e5', // hsl(0 0% 90%) convertido a hex
    borderStyle: 'solid',
  },
  clientColumn: {
    flex: 1,
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 3,
    color: '#262626', // hsl(0 0% 15%) convertido a hex
    fontSize: 10,
  },
  value: {
    color: '#737373', // hsl(0 0% 45%) convertido a hex
    fontSize: 10,
  },
  table: {
    width: '100%',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderStyle: 'solid',
    borderRadius: 6,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    borderBottomStyle: 'solid',
    minHeight: 32,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#a8b89a',
    borderBottomWidth: 1,
    borderBottomColor: '#95a589',
    borderBottomStyle: 'solid',
  },
  tableColHeader: {
    flex: 1,
    padding: 10,
    borderRightWidth: 1,
    borderRightColor: '#ffffff',
    borderRightStyle: 'solid',
  },
  tableCol: {
    flex: 1,
    padding: 10,
    borderRightWidth: 1,
    borderRightColor: '#e5e5e5',
    borderRightStyle: 'solid',
  },
  tableCellHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'left',
    color: '#ffffff',
  },
  tableCell: {
    fontSize: 9,
    textAlign: 'left',
    color: '#262626',
  },
  totalBox: {
    backgroundColor: '#a8b89a',
    padding: 18,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  totalTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#ffffff',
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  footer: {
    marginTop: 'auto',
    textAlign: 'center',
    fontSize: 9,
    color: '#737373',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    borderTopStyle: 'solid',
    paddingTop: 12,
  },
  compactTableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    borderBottomStyle: 'solid',
    minHeight: 28,
  },
  compactTableCol: {
    flex: 1,
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: '#e5e5e5',
    borderRightStyle: 'solid',
  },
  compactTableCell: {
    fontSize: 8,
    textAlign: 'left',
    color: '#262626',
  },
});

interface QuotationPDFProps {
  quotation: any;
  doctors: any[];
}

// Componente PDF
const QuotationPDF = ({ quotation, doctors }: QuotationPDFProps) => {
  // Calcular si necesitamos usar diseño compacto basado en la cantidad de servicios
  const needsCompactLayout = quotation.services.length > 8;
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header con Logo */}
        <View style={styles.header}>
          <Image 
            style={styles.logo}
            src="/src/assets/logo-dental.jpg"
          />
          <View style={styles.headerText}>
            <Text style={styles.title}>COTIZACIÓN</Text>
            <Text style={styles.subtitle}>
              Fecha: {new Date(quotation.date).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Información del Cliente */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información del Cliente</Text>
          <View style={styles.clientInfo}>
            <View style={styles.clientColumn}>
              <Text style={styles.label}>Nombre:</Text>
              <Text style={styles.value}>{quotation.clientName}</Text>
            </View>
            <View style={styles.clientColumn}>
              <Text style={styles.label}>Teléfono:</Text>
              <Text style={styles.value}>{quotation.phone}</Text>
            </View>
          </View>
        </View>

        {/* Servicios Cotizados */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Servicios Cotizados</Text>
          <View style={styles.table}>
            {/* Header de la tabla */}
            <View style={styles.tableHeader}>
              <View style={styles.tableColHeader}>
                <Text style={styles.tableCellHeader}>Servicio</Text>
              </View>
              <View style={styles.tableColHeader}>
                <Text style={styles.tableCellHeader}>Precio (Bs.)</Text>
              </View>
            </View>

            {/* Filas de servicios - diseño adaptable */}
            {quotation.services.map((service: any, index: number) => (
              <View 
                style={needsCompactLayout ? styles.compactTableRow : styles.tableRow} 
                key={index}
              >
                <View style={needsCompactLayout ? styles.compactTableCol : styles.tableCol}>
                  <Text style={needsCompactLayout ? styles.compactTableCell : styles.tableCell}>
                    {service.serviceName}
                  </Text>
                </View>
                <View style={needsCompactLayout ? styles.compactTableCol : styles.tableCol}>
                  <Text style={needsCompactLayout ? styles.compactTableCell : styles.tableCell}>
                    {Number(service.price).toFixed(2)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Total */}
        <View style={styles.totalBox}>
          <Text style={styles.totalTitle}>Total</Text>
          <Text style={styles.totalAmount}>
            Bs. {Number(quotation.total).toFixed(2)}
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Documento generado el {new Date().toLocaleDateString()} - Dental App</Text>
        </View>
      </Page>
    </Document>
  );
};

// Función para generar y descargar el PDF
export const generateQuotationPDF = async (quotation: any, doctors: any[]) => {
  try {
    const blob = await pdf(<QuotationPDF quotation={quotation} doctors={doctors} />).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cotizacion-${quotation.clientName}-${new Date(quotation.date).toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Error al generar el PDF');
  }
};

export default QuotationPDF;