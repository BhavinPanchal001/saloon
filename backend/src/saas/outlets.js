const express = require('express');
const { authenticate, wrap, select } = require('./auth');

const router = express.Router();
router.use(authenticate);

function outlets(workspace, id) {
  return select(`SELECT id, name, code, city, address, status FROM outlets WHERE organization_id = ?
    AND (? IS NULL OR id = ?) AND (? IS NULL OR id = ?) ORDER BY name, id`,
  [workspace.id, workspace.outlet_id, workspace.outlet_id, id, id]);
}

router.get('/', wrap(async (req, res) => res.json(await outlets(req.saas.workspace, null))));
router.get('/:id', wrap(async (req, res) => {
  if (!/^[1-9]\d*$/.test(req.params.id)) return res.status(404).json({ message: 'Outlet not found.' });
  const [outlet] = await outlets(req.saas.workspace, req.params.id);
  return outlet ? res.json(outlet) : res.status(404).json({ message: 'Outlet not found.' });
}));

module.exports = router;
