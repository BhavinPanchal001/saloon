'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Roles
    await queryInterface.createTable('roles', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      is_employee: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // 2. Shifts
    await queryInterface.createTable('shifts', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      start_time: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      end_time: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      break_duration: {
        type: Sequelize.INTEGER.UNSIGNED,
        defaultValue: 60,
      },
      grace_period: {
        type: Sequelize.INTEGER.UNSIGNED,
        defaultValue: 15,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // 3. Leave Types
    await queryInterface.createTable('leave_types', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      code: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      days_allowed: {
        type: Sequelize.INTEGER.UNSIGNED,
        defaultValue: 12,
      },
      max_monthly: {
        type: Sequelize.INTEGER.UNSIGNED,
        defaultValue: 2,
      },
      advance_notice_days: {
        type: Sequelize.INTEGER.UNSIGNED,
        defaultValue: 7,
      },
      is_paid: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      allow_anytime: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      allow_hourly: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      hourly_hours: {
        type: Sequelize.INTEGER.UNSIGNED,
        defaultValue: 0,
      },
      needed_document: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // 4. Work Weeks
    await queryInterface.createTable('work_weeks', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      operational_days: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // 5. Contract Types
    await queryInterface.createTable('contract_types', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      code: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // 6. Contract Type Templates
    await queryInterface.createTable('contract_type_templates', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      contract_type_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'contract_types',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      template_name: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      version: {
        type: Sequelize.STRING(20),
        defaultValue: '1.0',
      },
      template_content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // 7. Holiday Templates
    await queryInterface.createTable('holiday_templates', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      type: {
        type: Sequelize.STRING(100),
        defaultValue: 'National',
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      is_recurring: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // 8. Holiday Occasions
    await queryInterface.createTable('holiday_occasions', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      holiday_template_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'holiday_templates',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      occasion_name: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      start_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      end_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      occasion_type: {
        type: Sequelize.STRING(100),
        defaultValue: 'National',
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // 9. Salary Component Masters
    await queryInterface.createTable('salary_component_masters', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      code: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      type: {
        type: Sequelize.ENUM('earning', 'deduction'),
        defaultValue: 'earning',
      },
      calculation_type: {
        type: Sequelize.ENUM('fixed', 'percentage'),
        defaultValue: 'fixed',
      },
      default_amount: {
        type: Sequelize.DECIMAL(12, 2),
        defaultValue: 0.00,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // 10. Staff Members
    await queryInterface.createTable('staff_members', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      employee_code: {
        type: Sequelize.STRING(50),
        allowNull: true,
        unique: true,
      },
      first_name: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      middle_name: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },
      last_name: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      phone: {
        type: Sequelize.STRING(30),
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },
      personal_email: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      dob: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      gender: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      marital_status: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      biometric_code: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      joining_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      role_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'roles',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      assigned_outlet_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'outlets',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      onboarding_status: {
        type: Sequelize.ENUM('pending', 'contract_accepted', 'document_uploaded', 'approved'),
        defaultValue: 'pending',
      },
      street: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      city: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      state: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      country: {
        type: Sequelize.STRING(100),
        defaultValue: 'IN',
      },
      pincode: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      bank_holder: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      bank_name: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      bank_account: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      bank_ifsc: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      bank_branch: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      bank_type: {
        type: Sequelize.STRING(50),
        defaultValue: 'Savings',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // 11. Contract Groups
    await queryInterface.createTable('contract_groups', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      duration: {
        type: Sequelize.STRING(100),
        defaultValue: '12 Months',
      },
      start_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      end_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      employee_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: {
          model: 'staff_members',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // 12. Contracts
    await queryInterface.createTable('contracts', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      code: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      title: {
        type: Sequelize.STRING(250),
        allowNull: false,
      },
      employee_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'staff_members',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      group_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: {
          model: 'contract_groups',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      type_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'contract_types',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      template_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: {
          model: 'contract_type_templates',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      start_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      end_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('draft', 'active', 'terminated'),
        defaultValue: 'draft',
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      shift_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: {
          model: 'shifts',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      work_week_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: {
          model: 'work_weeks',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      overtime_enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      overtime_type: {
        type: Sequelize.STRING(50),
        defaultValue: '1.5x',
      },
      overtime_calculation: {
        type: Sequelize.STRING(100),
        defaultValue: 'fixed_hourly',
      },
      overtime_rate: {
        type: Sequelize.DECIMAL(12, 2),
        defaultValue: 0.00,
      },
      current_version: {
        type: Sequelize.INTEGER.UNSIGNED,
        defaultValue: 1,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // 13. Contract Salary Mappings
    await queryInterface.createTable('contract_salary_mappings', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      contract_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'contracts',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      salary_component_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'salary_component_masters',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      custom_amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });
  },

  async down(queryInterface, Sequelize) {
    // Drop in exact reverse order to avoid FK dependency blockages
    await queryInterface.dropTable('contract_salary_mappings');
    await queryInterface.dropTable('contracts');
    await queryInterface.dropTable('contract_groups');
    await queryInterface.dropTable('staff_members');
    await queryInterface.dropTable('salary_component_masters');
    await queryInterface.dropTable('holiday_occasions');
    await queryInterface.dropTable('holiday_templates');
    await queryInterface.dropTable('contract_type_templates');
    await queryInterface.dropTable('contract_types');
    await queryInterface.dropTable('work_weeks');
    await queryInterface.dropTable('leave_types');
    await queryInterface.dropTable('shifts');
    await queryInterface.dropTable('roles');
  },
};
