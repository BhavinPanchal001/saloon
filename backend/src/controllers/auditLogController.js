const { Op } = require('sequelize');
const { sequelize } = require('../models');
const AuditService = require('../services/auditService');
const { InventoryAuditLog, Product, Outlet } = require('../models');

// Get audit logs with filtering and pagination
const getAuditLogs = async (req, res) => {
  try {
    const {
      entityType,
      entityId,
      operation,
      userId,
      outletId,
      productId,
      referenceType,
      referenceId,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
      includeDetails = false
    } = req.query;

    const filters = {
      entityType,
      entityId: entityId ? parseInt(entityId) : undefined,
      operation,
      userId: userId ? parseInt(userId) : undefined,
      outletId: outletId ? parseInt(outletId) : undefined,
      productId: productId ? parseInt(productId) : undefined,
      referenceType,
      referenceId: referenceId ? parseInt(referenceId) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    let options = {};
    
    if (includeDetails === 'true') {
      options.include = [
        {
          model: Product,
          attributes: ['id', 'item_name'],
          required: false
        },
        {
          model: Outlet,
          attributes: ['id', 'name', 'code'],
          required: false
        }
      ];
    }

    const result = await AuditService.getAuditLogs(filters, options);

    return res.json({
      data: result.rows,
      pagination: {
        total: result.count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(result.count / parseInt(limit))
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// Get audit trail for specific entity
const getEntityAuditTrail = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { limit = 50, offset = 0, operation, startDate, endDate } = req.query;

    if (!entityType || !entityId) {
      return res.status(400).json({ message: 'entityType and entityId are required.' });
    }

    const result = await AuditService.getEntityAuditTrail(entityType, parseInt(entityId), {
      operation,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    return res.json({
      data: result.rows,
      pagination: {
        total: result.count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(result.count / parseInt(limit))
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// Get inventory audit summary for a time period
const getInventoryAuditSummary = async (req, res) => {
  try {
    const { startDate, endDate, outletId, productId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'startDate and endDate are required.' });
    }

    const where = {
      created_at: {
        [Op.gte]: new Date(startDate),
        [Op.lte]: new Date(endDate)
      }
    };

    if (outletId) where.outlet_id = parseInt(outletId);
    if (productId) where.product_id = parseInt(productId);

    // Get operation counts
    const operationCounts = await InventoryAuditLog.findAll({
      where,
      attributes: [
        'operation',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['operation'],
      raw: true
    });

    // Get entity type counts
    const entityTypeCounts = await InventoryAuditLog.findAll({
      where,
      attributes: [
        'entity_type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['entity_type'],
      raw: true
    });

    // Get total quantity changes by operation
    const quantityChanges = await InventoryAuditLog.findAll({
      where: {
        ...where,
        quantity_change: { [Op.not]: null }
      },
      attributes: [
        'operation',
        [sequelize.fn('SUM', sequelize.col('quantity_change')), 'total_change'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'transaction_count']
      ],
      group: ['operation'],
      raw: true
    });

    // Get top users by activity
    const topUsers = await InventoryAuditLog.findAll({
      where: {
        ...where,
        user_id: { [Op.not]: null }
      },
      attributes: [
        'user_id',
        'user_email',
        [sequelize.fn('COUNT', sequelize.col('id')), 'activity_count']
      ],
      group: ['user_id', 'user_email'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
      limit: 10,
      raw: true
    });

    return res.json({
      period: { startDate, endDate },
      operationCounts,
      entityTypeCounts,
      quantityChanges,
      topUsers
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// Get stock movement history for analysis
const getStockMovementHistory = async (req, res) => {
  try {
    const { startDate, endDate, outletId, productId } = req.query;

    const where = {
      quantity_change: { [Op.not]: null }
    };

    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at[Op.gte] = new Date(startDate);
      if (endDate) where.created_at[Op.lte] = new Date(endDate);
    }

    if (outletId) where.outlet_id = parseInt(outletId);
    if (productId) where.product_id = parseInt(productId);

    const movements = await InventoryAuditLog.findAll({
      where,
      include: [
        {
          model: Product,
          attributes: ['id', 'item_name'],
          required: false
        },
        {
          model: Outlet,
          attributes: ['id', 'name', 'code'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']],
      limit: 100
    });

    return res.json(movements);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = {
  getAuditLogs,
  getEntityAuditTrail,
  getInventoryAuditSummary,
  getStockMovementHistory
};
