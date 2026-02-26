
import { Receipt } from '../types';
import { jsPDF } from 'jspdf';

// Get current location and reverse geocode to address
const getCurrentLocationAddress = async (): Promise<string> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve('');
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Use Nominatim for reverse geocoding (free, no API key needed)
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );
          const data = await response.json();
          
          if (data.address) {
            const parts = [];
            if (data.address.road) parts.push(data.address.road);
            if (data.address.neighbourhood) parts.push(data.address.neighbourhood);
            if (data.address.suburb) parts.push(data.address.suburb);
            if (data.address.city || data.address.town || data.address.village) {
              parts.push(data.address.city || data.address.town || data.address.village);
            }
            if (data.address.county) parts.push(data.address.county);
            if (data.address.state) parts.push(data.address.state);
            if (data.address.postcode) parts.push(data.address.postcode);
            
            resolve(parts.join(', '));
          } else {
            resolve('');
          }
        } catch (error) {
          console.error('Geocoding error:', error);
          resolve('');
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        resolve('');
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  });
};

// Generate HTML receipt for print dialog
export const generateReceiptPDF = async (receipt: Receipt, currency: string, businessName: string = 'ORIONHUB (zionnent)', businessPhone: string = ''): Promise<void> => {
  // Get current location address
  const locationAddress = await getCurrentLocationAddress();
  const totalAmount = receipt.totalAmount;
  
  const receiptContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt #${receipt.id}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; background: #f1f5f9; min-height: 100vh; display: flex; justify-content: center; align-items: flex-start; }
    .receipt-container { 
      border: 2px solid #1e40af; 
      border-radius: 20px; 
      overflow: hidden; 
      width: 100%;
      max-width: 500px;
      background: white;
      display: flex;
      flex-direction: column;
      min-height: 700px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    }
    .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; flex-shrink: 0; }
    .header h1 { font-size: 28px; font-weight: 800; margin-bottom: 5px; }
    .header p { font-size: 14px; opacity: 0.9; }
    .receipt-id { background: #f1f5f9; padding: 15px 30px; text-align: center; border-bottom: 1px solid #e2e8f0; flex-shrink: 0; }
    .receipt-id span { font-family: monospace; font-size: 18px; font-weight: 600; color: #1e40af; background: white; padding: 8px 16px; border-radius: 8px; }
    .details { padding: 25px 30px; flex-shrink: 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f5f9; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { color: #64748b; font-size: 14px; }
    .detail-value { font-weight: 600; color: #1e293b; font-size: 14px; }
    .total-section { background: #f8fafc; padding: 25px 30px; border-top: 2px solid #1e40af; flex-shrink: 0; }
    .total-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .total-label { font-size: 16px; color: #475569; }
    .total-amount { font-size: 32px; font-weight: 800; color: #1e40af; }
    .customer-info { background: #f0fdf4; padding: 20px 30px; border-top: 1px solid #bbf7d0; flex-shrink: 0; }
    .customer-info h3 { font-size: 14px; color: #166534; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
    .customer-row { display: flex; justify-content: space-between; font-size: 14px; padding: 6px 0; }
    .customer-label { color: #15803d; }
    .customer-value { font-weight: 600; color: #166534; }
    .no-customer { color: #94a3b8; font-size: 13px; font-style: italic; }
    .footer { background: #1e40af; color: white; padding: 25px; text-align: center; margin-top: auto; flex-shrink: 0; }
    .footer-address { margin-bottom: 10px; font-size: 12px; }
    .footer-address p { margin: 3px 0; }
    .footer h2 { font-size: 18px; font-weight: 700; margin-bottom: 5px; }
    .footer p.thanks { font-size: 12px; opacity: 0.8; }
    .print-btn { position: fixed; top: 20px; right: 20px; padding: 12px 24px; background: #1e40af; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; z-index: 1000; }
    @media print { .print-btn { display: none; } body { padding: 0; background: white; } .receipt-container { box-shadow: none; max-width: 100%; } }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">🖨️ Print Receipt</button>
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
        <span class="detail-value">${new Date(receipt.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
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
      ${!receipt.customerName && !receipt.customerPhone ? `
        <div class="no-customer">No customer information provided</div>
      ` : ''}
      ${receipt.sentVia ? `
        <div class="customer-row">
          <span class="customer-label">Sent Via</span>
          <span class="customer-value">${receipt.sentVia}</span>
        </div>
      ` : ''}
    </div>
    <div class="footer">
      ${locationAddress || businessPhone ? `<div class="footer-address">${locationAddress ? `<p>${locationAddress}</p>` : ''}${businessPhone ? `<p>Phone: ${businessPhone}</p>` : ''}</div>` : ''}
      <h2>Thank You for Your Purchase!</h2>
      <p class="thanks">Please keep this receipt for your records.</p>
    </div>
  </div>
</body>
</html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(receiptContent);
    printWindow.document.close();
  }
};

// Download receipt as PDF file
export const downloadReceiptPDF = async (receipt: Receipt, currency: string, businessName: string = 'ORIONHUB', businessPhone: string = ''): Promise<void> => {
  // Get current location address
  const locationAddress = await getCurrentLocationAddress();
  const totalAmount = receipt.totalAmount;
  
  // Create PDF document
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header - Blue gradient background (simulated with filled rectangles)
  doc.setFillColor(30, 64, 175); // Blue-700
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(businessName, pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Sales Receipt', pageWidth / 2, 30, { align: 'center' });
  
  // Receipt ID box
  doc.setFillColor(241, 245, 249); // Slate-100
  doc.roundedRect(15, 48, pageWidth - 30, 15, 3, 3, 'F');
  doc.setTextColor(30, 64, 175); // Blue-700
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`#${receipt.id}`, pageWidth / 2, 58, { align: 'center' });
  
  // Details section
  let yPos = 75;
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const details = [
    ['Date', new Date(receipt.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })],
    ['Item Name', receipt.itemName],
    ['Category', receipt.category],
    ['Quantity', `${receipt.quantity} unit${receipt.quantity > 1 ? 's' : ''}`],
    ['Unit Price', `${currency}${receipt.price.toLocaleString()}`],
  ];
  
  details.forEach(([label, value]) => {
    doc.setTextColor(100, 116, 139);
    doc.text(label, 20, yPos);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.text(value, pageWidth - 20, yPos, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    yPos += 10;
  });
  
  // Total section
  yPos += 5;
  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(0.5);
  doc.line(20, yPos, pageWidth - 20, yPos);
  yPos += 15;
  
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(14);
  doc.text('Total Amount', 20, yPos);
  doc.setTextColor(30, 64, 175);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text(`${currency}${totalAmount.toLocaleString()}`, pageWidth - 20, yPos, { align: 'right' });
  
  // Customer Information
  if (receipt.customerName || receipt.customerPhone) {
    yPos += 20;
    doc.setFillColor(240, 253, 244); // Green-50
    doc.roundedRect(15, yPos - 5, pageWidth - 30, 25, 3, 3, 'F');
    
    doc.setTextColor(22, 101, 52); // Green-800
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('CUSTOMER INFORMATION', 20, yPos + 3);
    
    yPos += 10;
    doc.setFont('helvetica', 'normal');
    
    if (receipt.customerName) {
      doc.setTextColor(21, 128, 61); // Green-700
      doc.text('Name', 20, yPos);
      doc.setTextColor(22, 101, 52);
      doc.setFont('helvetica', 'bold');
      doc.text(receipt.customerName, pageWidth - 20, yPos, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      yPos += 8;
    }
    
    if (receipt.customerPhone) {
      doc.setTextColor(21, 128, 61);
      doc.text('Phone', 20, yPos);
      doc.setTextColor(22, 101, 52);
      doc.setFont('helvetica', 'bold');
      doc.text(receipt.customerPhone, pageWidth - 20, yPos, { align: 'right' });
      doc.setFont('helvetica', 'normal');
    }
  }
  
  // Footer with address - calculate position based on content
  const footerYPos = yPos + 20;
  doc.setFillColor(30, 64, 175);
  doc.rect(0, footerYPos, pageWidth, 50, 'F');
  
  let footerTextY = footerYPos + 15;
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  
  if (locationAddress) {
    doc.text(locationAddress, pageWidth / 2, footerTextY, { align: 'center' });
    footerTextY += 7;
  }
  
  if (businessPhone) {
    doc.text(`Phone: ${businessPhone}`, pageWidth / 2, footerTextY, { align: 'center' });
    footerTextY += 7;
  }
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Thank You for Your Purchase!', pageWidth / 2, footerTextY + 8, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('Please keep this receipt for your records.', pageWidth / 2, footerTextY + 15, { align: 'center' });
  
  // Save the PDF
  doc.save(`receipt_${receipt.id}_${new Date(receipt.date).toISOString().split('T')[0]}.pdf`);
};
