const { Notification, Outlet, Product } = require('../models');

const includeOptions = [
  { model: Outlet, attributes: ['id', 'name', 'code'] },
  { model: Product, attributes: ['id', 'item_name'] },
];

// GET /notifications
const getNotifications = async (req, res) => {
  try {
    const where = {};
    if (req.query.read === 'true') where.read = true;
    if (req.query.read === 'false') where.read = false;

    const notifications = await Notification.findAll({
      where,
      include: includeOptions,
      order: [['created_at', 'DESC']],
    });

    const unreadCount = await Notification.count({ where: { read: false } });

    return res.json({ notifications, unreadCount });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// PATCH /notifications/:id/read
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findByPk(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }
    await notification.update({ read: true });
    return res.json({ message: 'Notification marked as read.', notification });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// PATCH /notifications/read-all
const markAllAsRead = async (req, res) => {
  try {
    await Notification.update({ read: true }, { where: { read: false } });
    return res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// DELETE /notifications/:id
const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findByPk(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }
    await notification.destroy();
    return res.json({ message: 'Notification deleted.' });
  } catch (err) {
    console.error('Error deleting notification:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// DELETE /notifications (clear all)
const clearAllNotifications = async (req, res) => {
  try {
    await Notification.destroy({ where: {} });
    return res.json({ message: 'All notifications cleared.' });
  } catch (err) {
    console.error('Error clearing notifications:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
};
