'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE `purchase_order_items` DROP FOREIGN KEY `purchase_order_items_ibfk_2`'
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE'
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE `purchase_order_items` DROP FOREIGN KEY `purchase_order_items_ibfk_2`'
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT'
    );
  },
};
