'use strict';

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert('unit_masters', [
      {
        group_name: 'Volume – Liter / Milliliter',
        primary_unit: 'Liter',
        primary_abbr: 'L',
        secondary_unit: 'Milliliter',
        secondary_abbr: 'ML',
        conversion_ratio: 1000,
        status: 'active',
        created_at: now,
        updated_at: now,
      },
      {
        group_name: 'Weight – Kilogram / Gram',
        primary_unit: 'Kilogram',
        primary_abbr: 'KG',
        secondary_unit: 'Gram',
        secondary_abbr: 'G',
        conversion_ratio: 1000,
        status: 'active',
        created_at: now,
        updated_at: now,
      },
      {
        group_name: 'Length – Meter / Centimeter',
        primary_unit: 'Meter',
        primary_abbr: 'M',
        secondary_unit: 'Centimeter',
        secondary_abbr: 'CM',
        conversion_ratio: 100,
        status: 'active',
        created_at: now,
        updated_at: now,
      },
      {
        group_name: 'Count – Piece',
        primary_unit: 'Piece',
        primary_abbr: 'PC',
        secondary_unit: 'Piece',
        secondary_abbr: 'PC',
        conversion_ratio: 1,
        status: 'active',
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('unit_masters', null, {});
  },
};
