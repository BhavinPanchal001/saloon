const { Notification, Outlet, Product } = require('./src/models');

async function inspectNotifications() {
  try {
    const notifications = await Notification.findAll({
      include: [
        { model: Outlet, attributes: ['id', 'name', 'code'] },
        { model: Product, attributes: ['id', 'item_name'] },
      ],
      order: [['created_at', 'DESC']],
    });
    console.log('Total notifications in DB:', notifications.length);
    console.log(JSON.stringify(notifications, null, 2));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

inspectNotifications();
