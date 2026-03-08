exports.getHealth = (req, res) => {
  res.json({ service: 'AutoMax Cloud API', status: 'OK' });
};
