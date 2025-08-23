const express = require("express");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const moment = require("moment");
const { PDFDocument, StandardFonts } = require("pdf-lib");

const Plan = require("../models/Plan");
const Purchase = require("../models/BillingRecord");
const User = require("../models/User");

const router = express.Router();

// ✅ Auth Middleware
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authorization token missing" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) return res.status(401).json({ message: "User not found" });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// ✅ Invoice Generator Controller
const generateInvoice = async (req, res) => {
  const { planId } = req.params;
  const userId = req.user.id;
  // Get purchase, plan, user
  const purchase = await Purchase.findById(planId); // planId is actually purchaseId
  if (!purchase || String(purchase.userId) !== String(userId)) {
    return res
      .status(404)
      .json({ message: "Purchase not found or not authorized" });
  }

  const plan = await Plan.findById(purchase.planId);
  const user = await User.findById(userId);
  console.log(user)
  if (!plan || !user)
    return res.status(404).json({ message: "Data not found" });

  // Load PDF template
  const templatePath = path.join(
    __dirname,
    "../assets/pooqey-invoice-template.pdf"
  );
  const templateBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const page = pdfDoc.getPages()[0];

  // Fill invoice data
  const invoiceNumber = String(purchase._id).slice(-6).padStart(6, "0");
  const date = moment(purchase.createdAt).format("DD/MM/YYYY");

  const name = user.fullName;
  const address = user.city || "123 Anywhere St, Any City";
  const email = user.email;
  const phone = user.phone || "+000-000-0000";

  const productName = plan.name;
  const price = plan.price.toFixed(2);
  const qty = 1;
  const subtotal = plan.price.toFixed(2);
  const vat = (plan.price * 0.05).toFixed(2);
  const total = (plan.price * 1.05).toFixed(2);

  // Inject text
  page.drawText(invoiceNumber, { x: 295, y: 725, size: 12, font });

  page.drawText(date, { x: 475, y: 725, size: 12, font });

  page.drawText(name, { x: 65, y: 655, size: 12, font });
  page.drawText(address, { x: 65, y: 640, size: 12, font });
  page.drawText(email, { x: 65, y: 625, size: 12, font });
  page.drawText(phone, { x: 65, y: 610, size: 12, font });


page.drawText(productName, { x: 65, y: 535, size: 12, font });
page.drawText(`$${price}`, { x: 315, y: 535, size: 12, font });
page.drawText(`${qty}`, { x: 415, y: 535, size: 12, font });
page.drawText(`$${price}`, { x: 495, y: 535, size: 12, font });


  page.drawText(`$${subtotal}`, { x: 465, y: 400, size: 12, font });
  page.drawText(`$${vat}`, { x: 465, y: 380, size: 12, font });
  page.drawText(`$${total}`, { x: 465, y: 360, size: 12, font });

  const pdfBytes = await pdfDoc.save();

  res.setHeader(
    "Content-Disposition",
    `attachment; filename=invoice-${invoiceNumber}.pdf`
  );
  res.setHeader("Content-Type", "application/pdf");
  res.send(pdfBytes);
};

// ✅ Route
router.get("/download/:planId", authMiddleware, generateInvoice);

module.exports = router;
