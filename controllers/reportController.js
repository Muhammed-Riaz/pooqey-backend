const Report = require('../models/report');

exports.submitReport = async (req, res) => {
  try {
    const { listingId, listingTitle, reasons, description, reportedAt } = req.body;

    const newReport = new Report({
      listingId,
      listingTitle,
      reasons,
      description,
      reportedAt,
      reportedBy: req.user?._id // only if using auth
    });

    await newReport.save();

    res.status(200).json({ message: 'Report submitted successfully', report: newReport });
  } catch (error) {
    console.error('Error saving report:', error);
    res.status(500).json({ message: 'Server error while submitting report' });
  }
};
