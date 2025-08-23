const Client = require('../models/ClientData');

exports.addClient = async (req, res) => {
  const { name, city, gender, contact, nationality } = req.body;

  if (!name || !city || !gender || !contact || !nationality) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const client = new Client({
      userId: req.user._id, 
      name,
      city,
      gender,
      contact,
      nationality,
    });

    await client.save();
    res.status(201).json({ message: 'Client added successfully', client });
  } catch (err) {
    console.error('Add client error:', err);
    res.status(500).json({ error: 'Failed to add client' });
  }
};


exports.getClients = async (req, res) => {
  try {
    const clients = await Client.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(clients);
  } catch (err) {
    console.error('Get clients error:', err);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
};
