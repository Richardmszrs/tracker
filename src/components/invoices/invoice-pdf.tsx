import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { InvoiceWithDetails } from "@/lib/queries";

// Register fonts
Font.register({
  family: "Inter",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiJ-Ek-_EeA.woff2",
      fontWeight: 600,
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiJ-Ek-_EeA.woff2",
      fontWeight: 700,
    },
  ],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 10,
    padding: 40,
    color: "#1a1a1a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: "#2563eb",
  },
  invoiceInfo: {
    textAlign: "right",
  },
  invoiceNumber: {
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 4,
  },
  invoiceDate: {
    fontSize: 9,
    color: "#6b7280",
    marginBottom: 2,
  },
  status: {
    fontSize: 9,
    fontWeight: 600,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "#dbeafe",
    color: "#1d4ed8",
    alignSelf: "flex-end",
  },
  statusPaid: {
    backgroundColor: "#dcfce7",
    color: "#15803d",
  },
  statusOverdue: {
    backgroundColor: "#fee2e2",
    color: "#dc2626",
  },
  statusSent: {
    backgroundColor: "#fef3c7",
    color: "#b45309",
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    marginVertical: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 600,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  clientName: {
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 4,
  },
  address: {
    fontSize: 9,
    color: "#6b7280",
    lineHeight: 1.5,
  },
  itemsTable: {
    marginTop: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f9fafb",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 4,
    marginBottom: 2,
  },
  tableHeaderText: {
    fontSize: 9,
    fontWeight: 600,
    color: "#6b7280",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  colDescription: {
    flex: 1,
  },
  colQty: {
    width: 60,
    textAlign: "right",
  },
  colRate: {
    width: 80,
    textAlign: "right",
  },
  colAmount: {
    width: 90,
    textAlign: "right",
  },
  descriptionText: {
    fontSize: 10,
  },
  tableCell: {
    fontSize: 10,
    color: "#4b5563",
  },
  totalsSection: {
    marginTop: 20,
    alignItems: "flex-end",
  },
  totalsTable: {
    width: 250,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  totalLabel: {
    fontSize: 10,
    color: "#6b7280",
  },
  totalValue: {
    fontSize: 10,
    fontWeight: 600,
  },
  totalRowGrand: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderTopWidth: 2,
    borderTopColor: "#1a1a1a",
    marginTop: 8,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: 700,
  },
  grandTotalValue: {
    fontSize: 12,
    fontWeight: 700,
    color: "#2563eb",
  },
  notes: {
    marginTop: 30,
    padding: 15,
    backgroundColor: "#f9fafb",
    borderRadius: 4,
  },
  notesTitle: {
    fontSize: 9,
    fontWeight: 600,
    color: "#6b7280",
    marginBottom: 6,
  },
  notesText: {
    fontSize: 9,
    color: "#4b5563",
    lineHeight: 1.5,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#9ca3af",
  },
  currencySymbol: {
    fontSize: 10,
    color: "#6b7280",
  },
});

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(amount);
}

function formatDate(date: Date | string | number): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface InvoicePDFProps {
  invoice: InvoiceWithDetails;
}

export function InvoicePDF({ invoice }: InvoicePDFProps) {
  const subtotal = invoice.items.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = subtotal * (invoice.taxRate / 100);
  const grandTotal = subtotal + taxAmount - invoice.discount;

  const getStatusStyle = () => {
    switch (invoice.status) {
      case "paid":
        return styles.statusPaid;
      case "overdue":
        return styles.statusOverdue;
      case "sent":
        return styles.statusSent;
      default:
        return {};
    }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>INVOICE</Text>
          </View>
          <View style={styles.invoiceInfo}>
            <Text style={styles.invoiceNumber}>{invoice.number}</Text>
            <Text style={styles.invoiceDate}>
              Issue Date: {formatDate(invoice.issueDate)}
            </Text>
            <Text style={styles.invoiceDate}>
              Due Date: {formatDate(invoice.dueDate)}
            </Text>
            <View style={[styles.status, getStatusStyle()]}>
              <Text>{invoice.status.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Bill To */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bill To</Text>
          {invoice.client ? (
            <>
              <Text style={styles.clientName}>{invoice.client.name}</Text>
            </>
          ) : (
            <Text style={styles.address}>No client specified</Text>
          )}
        </View>

        {/* Items Table */}
        <View style={styles.itemsTable}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colDescription]}>
              Description
            </Text>
            <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
            <Text style={[styles.tableHeaderText, styles.colRate]}>Rate</Text>
            <Text style={[styles.tableHeaderText, styles.colAmount]}>Amount</Text>
          </View>

          {invoice.items.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <View style={styles.colDescription}>
                <Text style={styles.descriptionText}>{item.description}</Text>
              </View>
              <Text style={[styles.tableCell, styles.colQty]}>
                {item.quantity.toFixed(2)}
              </Text>
              <Text style={[styles.tableCell, styles.colRate]}>
                {formatCurrency(item.unitPrice, invoice.currency)}
              </Text>
              <Text style={[styles.tableCell, styles.colAmount]}>
                {formatCurrency(item.amount, invoice.currency)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsTable}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(subtotal, invoice.currency)}
              </Text>
            </View>
            {invoice.taxRate > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  Tax ({invoice.taxRate}%)
                </Text>
                <Text style={styles.totalValue}>
                  {formatCurrency(taxAmount, invoice.currency)}
                </Text>
              </View>
            )}
            {invoice.discount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Discount</Text>
                <Text style={[styles.totalValue, { color: "#15803d" }]}>
                  -{formatCurrency(invoice.discount, invoice.currency)}
                </Text>
              </View>
            )}
            <View style={styles.totalRowGrand}>
              <Text style={styles.grandTotalLabel}>Total</Text>
              <Text style={styles.grandTotalValue}>
                {formatCurrency(grandTotal, invoice.currency)}
              </Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={styles.notes}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Thank you for your business
        </Text>
      </Page>
    </Document>
  );
}
