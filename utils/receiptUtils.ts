
import { Receipt } from '../types';

export const generateReceiptPDF = (receipt: Receipt, currency: string, businessName: string = 'Electronics Store'): void => {
  const totalAmount = receipt.totalAmount;
  const profit = (receipt.price - (receipt.totalAmount / receipt.quantity)) * receipt.quantity;
  
  const receiptContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt #${receipt.id}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
      background: #fff;
    }
    .receipt-container {
      border: 2px solid #1e40af;
      border-radius: 20px;
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      font-size: 28px;
      font-weight: 800;
      margin-bottom: 5px;
    }
    .header p {
      font-size: 14px;
      opacity: 0.9;
    }
    .receipt-id {
      background: #f1f5f9;
      padding: 15px 30px;
      text-align: center;
      border-bottom: 1px solid #e2e8f0;
    }
    .receipt-id span {
      font-family: monospace;
      font-size: 18px;
      font-weight: 600;
      color: #1e40af;
      background: white;
      padding: 8px 16px;
      border-radius: 8px;
    }
    .details {
      padding: 30px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #f1f5f9;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      color: #64748b;
      font-size: 14px;
    }
    .detail-value {
      font-weight: 600;
      color: #1e293b;
      font-size: 14px;
    }
    .total-section {
      background: #f8fafc;
      padding: 25px 30px;
      border-top: 2px solid #1e40af;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .total-label {
      font-size: 16px;
      color: #475569;
    }
    .total-amount {
      font-size: 32px;
      font-weight: 800;
      color: #1e40af;
    }
    .customer-info {
      background: #f0fdf4;
      padding: 20px 30px;
      border-top: 1px solid #bbf7d0;
    }
    .customer-info h3 {
      font-size: 14px;
      color: #166534;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .customer-row {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
    }
    .customer-label {
      color: #15803d;
    }
    .customer-value {
      font-weight: 600;
      color: #166534;
    }
    .footer {
      background: #1e40af;
      color: white;
      padding: 25px;
      text-align: center;
    }
    .footer h2 {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 5px;
    }
    .footer p {
      font-size: 12px;
      opacity: 0.8;
    }
    .print-btn {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 24px;
      background: #1e40af;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
    }
    @media print {
      .print-btn {
        display: none;
      }
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">Print Receipt</button>
  
  <div class="receipt-container">
    <div class="header">
      <h1>${businessName}</h1>
      <p>Sales Receipt</p>
    </div>
    
    <div class="receipt-id">
      <span>#${receipt.id}</span>
    </div>
    
    <div class="details">
      <div class="detail-row">
        <span class="detail-label">Date</span>
        <span class="detail-value">${new Date(receipt.date).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Item Name</span>
        <span class="detail-value">${receipt.itemName}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Category</span>
        <span class="detail-value">${receipt.category}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Quantity</span>
        <span class="detail-value">${receipt.quantity} unit${receipt.quantity > 1 ? 's' : ''}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Unit Price</span>
        <span class="detail-value">${currency}${receipt.price.toLocaleString()}</span>
      </div>
    </div>
    
    <div class="total-section">
      <div class="total-row">
        <span class="total-label">Total Amount</span>
        <span class="total-amount">${currency}${totalAmount.toLocaleString()}</span>
      </div>
    </div>
    
    ${receipt.customerName || receipt.customerPhone ? `
    <div class="customer-info">
      <h3>Customer Information</h3>
      ${receipt.customerName ? `
      <div class="customer-row">
        <span class="customer-label">Name</span>
        <span class="customer-value">${receipt.customerName}</span>
      </div>
      ` : ''}
      ${receipt.customerPhone ? `
      <div class="customer-row">
        <span class="customer-label">Phone</span>
        <span class="customer-value">${receipt.customerPhone}</span>
      </div>
      ` : ''}
      ${receipt.sentVia ? `
      <div class="customer-row">
        <span class="customer-label">Sent Via</span>
        <span class="customer-value">${receipt.sentVia}</span>
      </div>
      ` : ''}
    </div>
    ` : ''}
    
    <div class="footer">
      <h2>Thank You for Your Purchase!</h2>
      <p>Please keep this receipt for your records.</p>
    </div>
  </div>
</body>
</html>
  `;

  // Open print dialog in new window
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(receiptContent);
    printWindow.document.close();
  }
};

export const downloadReceiptPDF = (receipt: Receipt, currency: string, businessName: string = 'Electronics Store'): void => {
  // For actual PDF download, we use the print functionality
  generateReceiptPDF(receipt, currency, businessName);
};
