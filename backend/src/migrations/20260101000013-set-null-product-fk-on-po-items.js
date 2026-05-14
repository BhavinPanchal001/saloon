'use strict';

module.exports = {
  async up(queryInterface) {
    // Change product_id to nullable so it can be SET NULL when product is deleted
    await queryInterface.sequelize.query(
      'ALTER TABLE `purchase_order_items` MODIFY `product_id` INT UNSIGNED NULL'
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE `purchase_order_items` DROP FOREIGN KEY `purchase_order_items_ibfk_2`'
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL'
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE `purchase_order_items` DROP FOREIGN KEY `purchase_order_items_ibfk_2`'
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE `purchase_order_items` MODIFY `product_id` INT UNSIGNED NOT NULL'
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE'
    );
  },
};
