const Plan = require('../models/Plan');
const Purchase = require('../models/AdPlanPurchase');
const User = require('../models/User');
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const fs = require("fs");
const path = require("path");
const moment = require("moment");

exports.generateInvoice = async (req, res) => {
  const { planId } = req.params;
  const userId = req.user.id;
  // Fetch plan, user, and purchase data
  const plan = await Plan.findById(planId);
  const purchase = await Purchase.findOne({ userId, planId });
  const user = await User.findById(userId);

  if (!purchase || !plan || !user)
    return res.status(404).json({ message: "Data not found" });

  // Load PDF template
  const templatePath = path.join(__dirname, "../assets/pooqey-invoice-template.pdf");
  const templateBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];

  // Define text values
  const invoiceNumber = String(purchase._id).slice(-6).padStart(6, "0");
  const date = moment(purchase.createdAt).format("DD/MM/YYYY");

  const name = user.fullName;
  const address = user.address || "123 Anywhere St, Any City";
  const email = user.email;
  const phone = user.phone || "+000-000-0000";

  const productName = plan.name;
  const price = plan.price.toFixed(2);
  const qty = 1;
  const subtotal = (plan.price).toFixed(2);
  const vat = (plan.price * 0.05).toFixed(2);
  const total = (plan.price * 1.05).toFixed(2);

  // Inject content into PDF (X/Y coordinates must match your template exactly)
  firstPage.drawText(invoiceNumber, { x: 420, y: 705, size: 12, font });
  firstPage.drawText(date, { x: 420, y: 685, size: 12, font });

  firstPage.drawText(name, { x: 65, y: 655, size: 12, font });
  firstPage.drawText(address, { x: 65, y: 640, size: 12, font });
  firstPage.drawText(email, { x: 65, y: 625, size: 12, font });
  firstPage.drawText(phone, { x: 65, y: 610, size: 12, font });

  firstPage.drawText(productName, { x: 65, y: 540, size: 12, font });
  firstPage.drawText(`$${price}`, { x: 270, y: 540, size: 12, font });
  firstPage.drawText(`${qty}`, { x: 370, y: 540, size: 12, font });
  firstPage.drawText(`$${price}`, { x: 460, y: 540, size: 12, font });

  firstPage.drawText(`$${subtotal}`, { x: 460, y: 400, size: 12, font });
  firstPage.drawText(`$${vat}`, { x: 460, y: 380, size: 12, font });
  firstPage.drawText(`$${total}`, { x: 460, y: 360, size: 12, font });

  const pdfBytes = await pdfDoc.save();

  res.setHeader("Content-Disposition", `attachment; filename=invoice-${invoiceNumber}.pdf`);
  res.setHeader("Content-Type", "application/pdf");
  res.send(pdfBytes);
};
