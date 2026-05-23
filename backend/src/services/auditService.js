const { Op } = require('sequelize');
const InventoryAuditLog = require('../models/InventoryAuditLog');

class AuditService {
  /**
   * Log inventory changes with comprehensive tracking
   */
  static async logInventoryChange({
    entityType,
    entityId,
    operation,
    oldValues = null,
    newValues = null,
    userId = null,
    userEmail = null,
    outletId = null,
    productId = null,
    quantityChange = null,
    referenceId = null,
    referenceType = null,
    ipAddress = null,
    userAgent = null,
    sessionId = null,
    metadata = null,
    transaction = null
  }) {
    try {
      // Calculate changed fields for UPDATE operations
      let changedFields = null;
      if (operation === 'UPDATE' && oldValues && newValues) {
        changedFields = this.calculateChangedFields(oldValues, newValues);
      }

      const auditLog = {
        entity_type: entityType,
        entity_id: entityId,
        operation,
        old_values: oldValues,
        new_values: newValues,
        changed_fields: changedFields,
        user_id: userId,
        user_email: userEmail,
        outlet_id: outletId,
        product_id: productId,
        quantity_change: quantityChange,
        reference_id: referenceId,
        reference_type: referenceType,
        ip_address: ipAddress,
        user_agent: userAgent,
        session_id: sessionId,
        metadata: metadata,
      };

      const options = transaction ? { transaction } : {};
      return await InventoryAuditLog.create(auditLog, options);
    } catch (error) {
      console.error('Audit logging failed:', error);
      // Don't throw error to avoid breaking main operations
      // In production, you might want to send to a dead-letter queue
    }
  }

  /**
   * Calculate which fields changed between old and new values
   */
  static calculateChangedFields(oldValues, newValues) {
    const changedFields = [];
    
    for (const key in newValues) {
      if (oldValues[key] !== newValues[key]) {
        changedFields.push({
          field: key,
          old_value: oldValues[key],
          new_value: newValues[key]
        });
      }
    }
    
    return changedFields;
  }

  /**
   * Extract user information from request
   */
  static extractUserInfo(req) {
    return {
      userId: req.user?.id || null,
      userEmail: req.user?.email || null,
      ipAddress: req.ip || req.connection?.remoteAddress || null,
      userAgent: req.get('User-Agent') || null,
      sessionId: req.sessionID || null,
    };
  }

  /**
   * Log outlet inventory operations
   */
  static async logOutletInventoryOperation(operation, inventoryData, req, transaction = null) {
    const { userId, userEmail, ipAddress, userAgent, sessionId } = this.extractUserInfo(req);
    
    return await this.logInventoryChange({
      entityType: 'outlet_inventory',
      entityId: inventoryData.id || null,
      operation,
      oldValues: inventoryData.oldValues || null,
      newValues: inventoryData.newValues || null,
      userId,
      userEmail,
      outletId: inventoryData.outlet_id,
      productId: inventoryData.product_id,
      quantityChange: inventoryData.quantityChange || null,
      referenceId: inventoryData.referenceId || null,
      referenceType: inventoryData.referenceType || null,
      ipAddress,
      userAgent,
      sessionId,
      metadata: inventoryData.metadata || null,
      transaction
    });
  }

  /**
   * Log central stock operations
   */
  static async logCentralStockOperation(operation, productData, req, transaction = null) {
    const { userId, userEmail, ipAddress, userAgent, sessionId } = this.extractUserInfo(req);
    
    return await this.logInventoryChange({
      entityType: 'central_stock',
      entityId: productData.id,
      operation,
      oldValues: productData.oldValues || null,
      newValues: productData.newValues || null,
      userId,
      userEmail,
      productId: productData.id,
      quantityChange: productData.quantityChange || null,
      referenceId: productData.referenceId || null,
      referenceType: productData.referenceType || null,
      ipAddress,
      userAgent,
      sessionId,
      metadata: productData.metadata || null,
      transaction
    });
  }

  /**
   * Log stock issue operations
   */
  static async logStockIssue(stockIssueData, req, transaction = null) {
    const { userId, userEmail, ipAddress, userAgent, sessionId } = this.extractUserInfo(req);
    
    return await this.logInventoryChange({
      entityType: 'outlet_inventory',
      entityId: stockIssueData.outletInventoryId || null,
      operation: 'STOCK_ISSUE',
      oldValues: stockIssueData.oldValues || null,
      newValues: stockIssueData.newValues || null,
      userId,
      userEmail,
      outletId: stockIssueData.outlet_id,
      productId: stockIssueData.product_id,
      quantityChange: stockIssueData.quantityChange || null,
      referenceId: stockIssueData.stockIssueId,
      referenceType: 'stock_issue',
      ipAddress,
      userAgent,
      sessionId,
      metadata: stockIssueData.metadata || null,
      transaction
    });
  }

  /**
   * Get audit logs with filtering
   */
  static async getAuditLogs(filters = {}, options = {}) {
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
      offset = 0
    } = filters;

    const where = {};
    
    if (entityType) where.entity_type = entityType;
    if (entityId) where.entity_id = entityId;
    if (operation) where.operation = operation;
    if (userId) where.user_id = userId;
    if (outletId) where.outlet_id = outletId;
    if (productId) where.product_id = productId;
    if (referenceType) where.reference_type = referenceType;
    if (referenceId) where.reference_id = referenceId;
    
    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at[Op.gte] = startDate;
      if (endDate) where.created_at[Op.lte] = endDate;
    }

    return await InventoryAuditLog.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      ...options
    });
  }

  /**
   * Get audit trail for specific entity
   */
  static async getEntityAuditTrail(entityType, entityId, options = {}) {
    return await this.getAuditLogs({
      entityType,
      entityId,
      ...options
    });
  }
}

module.exports = AuditService;
