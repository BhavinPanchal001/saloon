'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    // 1. Seed Outlets if they don't exist
    const [existingOutlets] = await queryInterface.sequelize.query(
      `SELECT id, code FROM outlets`
    );
    let hsrOutletId, indOutletId, bnjOutletId;

    if (existingOutlets.length === 0) {
      await queryInterface.bulkInsert('outlets', [
        {
          name: 'HSR Layout',
          code: 'HSR-01',
          city: 'Bengaluru',
          address: 'Sector 2, HSR Layout, Bengaluru, Karnataka 560102',
          invoice_prefix: 'HSR-',
          manager: 'Meera Kapoor',
          phone: '+91 98765 00001',
          email: 'hsr@glowy.com',
          employee_code_prefix: 'HSR',
          status: 'active',
          created_at: now,
          updated_at: now
        },
        {
          name: 'Indiranagar',
          code: 'IND-01',
          city: 'Bengaluru',
          address: '100 Feet Road, Indiranagar, Bengaluru, Karnataka 560038',
          invoice_prefix: 'IND-',
          manager: 'Aarav Nair',
          phone: '+91 98765 00002',
          email: 'ind@glowy.com',
          employee_code_prefix: 'IND',
          status: 'active',
          created_at: now,
          updated_at: now
        },
        {
          name: 'Banjara Hills',
          code: 'BNJ-01',
          city: 'Hyderabad',
          address: 'Road No. 1, Banjara Hills, Hyderabad, Telangana 500034',
          invoice_prefix: 'BNJ-',
          manager: 'Sara Thomas',
          phone: '+91 98765 00003',
          email: 'bnj@glowy.com',
          employee_code_prefix: 'BNJ',
          status: 'active',
          created_at: now,
          updated_at: now
        }
      ]);

      const [newOutlets] = await queryInterface.sequelize.query(
        `SELECT id, code FROM outlets`
      );
      hsrOutletId = newOutlets.find(o => o.code === 'HSR-01').id;
      indOutletId = newOutlets.find(o => o.code === 'IND-01').id;
      bnjOutletId = newOutlets.find(o => o.code === 'BNJ-01').id;
    } else {
      hsrOutletId = existingOutlets.find(o => o.code === 'HSR-01')?.id || existingOutlets[0].id;
      indOutletId = existingOutlets.find(o => o.code === 'IND-01')?.id || existingOutlets[0].id;
      bnjOutletId = existingOutlets.find(o => o.code === 'BNJ-01')?.id || existingOutlets[0].id;
    }

    // 2. Roles
    await queryInterface.bulkInsert('roles', [
      { name: 'Senior Stylist', description: 'Experienced hair stylists with 5+ years', is_employee: true, is_active: true, created_at: now, updated_at: now },
      { name: 'Color Specialist', description: 'Hair coloring and treatment expert', is_employee: true, is_active: true, created_at: now, updated_at: now },
      { name: 'Reception Lead', description: 'Front desk reception and scheduling lead', is_employee: true, is_active: true, created_at: now, updated_at: now },
      { name: 'Manager', description: 'Outlet operations manager', is_employee: true, is_active: true, created_at: now, updated_at: now }
    ]);

    const [roles] = await queryInterface.sequelize.query(`SELECT id, name FROM roles`);
    const roleSeniorStylist = roles.find(r => r.name === 'Senior Stylist').id;
    const roleColorSpecialist = roles.find(r => r.name === 'Color Specialist').id;
    const roleReceptionLead = roles.find(r => r.name === 'Reception Lead').id;

    // 3. Shifts
    await queryInterface.bulkInsert('shifts', [
      { name: 'Standard Day Shift', start_time: '09:00', end_time: '18:00', break_duration: 60, grace_period: 15, is_active: true, created_at: now, updated_at: now },
      { name: 'Evening Shift', start_time: '14:00', end_time: '22:00', break_duration: 45, grace_period: 15, is_active: true, created_at: now, updated_at: now },
      { name: 'Full Day Shift', start_time: '09:00', end_time: '21:00', break_duration: 90, grace_period: 15, is_active: true, created_at: now, updated_at: now }
    ]);

    const [shifts] = await queryInterface.sequelize.query(`SELECT id, name FROM shifts`);
    const shiftStandardDay = shifts.find(s => s.name === 'Standard Day Shift').id;

    // 4. Leave Types
    await queryInterface.bulkInsert('leave_types', [
      { name: 'Annual Leave', code: 'LV-ANN', days_allowed: 12, max_monthly: 2, advance_notice_days: 7, is_paid: true, allow_anytime: true, allow_hourly: false, hourly_hours: 0, needed_document: false, created_at: now, updated_at: now },
      { name: 'Sick Leave', code: 'LV-SCK', days_allowed: 14, max_monthly: 3, advance_notice_days: 0, is_paid: true, allow_anytime: true, allow_hourly: true, hourly_hours: 4, needed_document: true, created_at: now, updated_at: now },
      { name: 'Casual Leave', code: 'LV-CAS', days_allowed: 8, max_monthly: 1, advance_notice_days: 2, is_paid: true, allow_anytime: false, allow_hourly: false, hourly_hours: 0, needed_document: false, created_at: now, updated_at: now }
    ]);

    // 5. Work Weeks
    await queryInterface.bulkInsert('work_weeks', [
      { name: 'Standard Operational Week', operational_days: 'Monday,Tuesday,Wednesday,Thursday,Friday,Saturday', is_active: true, created_at: now, updated_at: now },
      { name: 'Corporate 5-Day Week', operational_days: 'Monday,Tuesday,Wednesday,Thursday,Friday', is_active: true, created_at: now, updated_at: now }
    ]);

    const [workWeeks] = await queryInterface.sequelize.query(`SELECT id, name FROM work_weeks`);
    const wwStandard = workWeeks.find(w => w.name === 'Standard Operational Week').id;

    // 6. Contract Types
    await queryInterface.bulkInsert('contract_types', [
      { name: 'Full-Time Employment', code: 'CT-FTE', description: 'Standard full-time employment contract', is_active: true, created_at: now, updated_at: now },
      { name: 'Part-Time Employment', code: 'CT-PTE', description: 'Part-time employment contract', is_active: true, created_at: now, updated_at: now }
    ]);

    const [contractTypes] = await queryInterface.sequelize.query(`SELECT id, name FROM contract_types`);
    const ctFullTime = contractTypes.find(c => c.name === 'Full-Time Employment').id;
    const ctPartTime = contractTypes.find(c => c.name === 'Part-Time Employment').id;

    // 7. Contract Type Templates
    await queryInterface.bulkInsert('contract_type_templates', [
      {
        contract_type_id: ctFullTime,
        template_name: 'Standard Contract',
        version: '1.0',
        template_content: '<h3>Employment Agreement</h3><p>This is a standard employment contract template...</p>',
        created_at: now,
        updated_at: now
      },
      {
        contract_type_id: ctPartTime,
        template_name: 'Part-Time Contract',
        version: '1.0',
        template_content: '<h3>Part-Time Agreement</h3><p>This is a part-time employment contract template...</p>',
        created_at: now,
        updated_at: now
      }
    ]);

    const [templates] = await queryInterface.sequelize.query(`SELECT id, template_name FROM contract_type_templates`);
    const tempStandard = templates.find(t => t.template_name === 'Standard Contract').id;

    // 8. Holiday Templates
    await queryInterface.bulkInsert('holiday_templates', [
      { name: 'National Holidays 2026', type: 'National', description: 'Official gazetted public holidays', is_recurring: true, is_active: true, created_at: now, updated_at: now },
      { name: 'Company Holidays', type: 'Company', description: 'Company specific annual holidays', is_recurring: false, is_active: true, created_at: now, updated_at: now }
    ]);

    const [holidayTemplates] = await queryInterface.sequelize.query(`SELECT id, name FROM holiday_templates`);
    const htNational = holidayTemplates.find(h => h.name === 'National Holidays 2026').id;
    const htCompany = holidayTemplates.find(h => h.name === 'Company Holidays').id;

    // 9. Holiday Occasions
    await queryInterface.bulkInsert('holiday_occasions', [
      { holiday_template_id: htNational, occasion_name: "New Year's Day", start_date: '2026-01-01', end_date: '2026-01-01', occasion_type: 'National', description: 'Global new year celebration', is_active: true, created_at: now, updated_at: now },
      { holiday_template_id: htNational, occasion_name: 'Republic Day', start_date: '2026-01-26', end_date: '2026-01-26', occasion_type: 'National', description: 'National Republic day', is_active: true, created_at: now, updated_at: now },
      { holiday_template_id: htCompany, occasion_name: "Founder's Day", start_date: '2026-03-15', end_date: '2026-03-15', occasion_type: 'Company', description: 'Salon foundation day', is_active: true, created_at: now, updated_at: now }
    ]);

    // 10. Salary Component Masters
    await queryInterface.bulkInsert('salary_component_masters', [
      { name: 'Basic Salary', code: 'BASIC', description: 'Base monthly salary component', type: 'earning', calculation_type: 'fixed', default_amount: 30000.00, is_active: true, created_at: now, updated_at: now },
      { name: 'House Rent Allowance (HRA)', code: 'HRA', description: 'Housing allowance for rented accommodation', type: 'earning', calculation_type: 'percentage', default_amount: 40.00, is_active: true, created_at: now, updated_at: now },
      { name: 'Dearness Allowance', code: 'DA', description: 'Cost of living adjustment allowance', type: 'earning', calculation_type: 'percentage', default_amount: 10.00, is_active: true, created_at: now, updated_at: now },
      { name: 'Medical Allowance', code: 'MEDICAL', description: 'Medical and health-related expenses', type: 'earning', calculation_type: 'fixed', default_amount: 1500.00, is_active: true, created_at: now, updated_at: now },
      { name: 'Travel Allowance', code: 'TRAVEL', description: 'Transportation and travel expenses', type: 'earning', calculation_type: 'fixed', default_amount: 2000.00, is_active: true, created_at: now, updated_at: now },
      { name: 'Provident Fund - Employee', code: 'PF_EMP', description: 'Employee contribution to provident fund', type: 'deduction', calculation_type: 'percentage', default_amount: 12.00, is_active: true, created_at: now, updated_at: now },
      { name: 'Provident Fund - Employer', code: 'PF_EMPLOYER', description: 'Employer contribution to provident fund', type: 'deduction', calculation_type: 'percentage', default_amount: 12.00, is_active: true, created_at: now, updated_at: now },
      { name: 'Professional Tax', code: 'PROF_TAX', description: 'State professional tax deduction', type: 'deduction', calculation_type: 'fixed', default_amount: 200.00, is_active: true, created_at: now, updated_at: now },
      { name: 'Tax Deducted at Source (TDS)', code: 'TDS', description: 'Income tax deduction', type: 'deduction', calculation_type: 'percentage', default_amount: 10.00, is_active: true, created_at: now, updated_at: now },
      { name: 'Employee State Insurance', code: 'ESI', description: 'State insurance contribution', type: 'deduction', calculation_type: 'percentage', default_amount: 1.75, is_active: true, created_at: now, updated_at: now }
    ]);

    const [salaryComponents] = await queryInterface.sequelize.query(`SELECT id, code FROM salary_component_masters`);
    const salBasicId = salaryComponents.find(c => c.code === 'BASIC').id;

    // 11. Staff Members
    await queryInterface.bulkInsert('staff_members', [
      {
        employee_code: 'HSR-101',
        first_name: 'Naina',
        middle_name: '',
        last_name: 'Shah',
        phone: '+91 98765 40001',
        email: 'naina.shah@glowy.com',
        personal_email: 'naina.shah@gmail.com',
        dob: '1995-05-12',
        gender: 'Female',
        marital_status: 'Single',
        biometric_code: 'BIO-101',
        joining_date: '2026-01-01',
        role_id: roleSeniorStylist,
        assigned_outlet_id: hsrOutletId,
        onboarding_status: 'approved',
        street: 'Sector 2, HSR Layout',
        city: 'Bengaluru',
        state: 'Karnataka',
        country: 'IN',
        pincode: '560102',
        bank_holder: 'Naina Shah',
        bank_name: 'HDFC Bank',
        bank_account: '50100234567890',
        bank_ifsc: 'HDFC0000001',
        bank_branch: 'HSR Layout',
        bank_type: 'Savings',
        created_at: now,
        updated_at: now
      },
      {
        employee_code: 'IND-102',
        first_name: 'Rohan',
        middle_name: '',
        last_name: 'Iyer',
        phone: '+91 98765 40002',
        email: 'rohan.iyer@glowy.com',
        personal_email: 'rohan.iyer@gmail.com',
        dob: '1993-08-22',
        gender: 'Male',
        marital_status: 'Married',
        biometric_code: 'BIO-102',
        joining_date: '2026-02-01',
        role_id: roleColorSpecialist,
        assigned_outlet_id: indOutletId,
        onboarding_status: 'approved',
        street: '100 Feet Road, Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        country: 'IN',
        pincode: '560038',
        bank_holder: 'Rohan Iyer',
        bank_name: 'ICICI Bank',
        bank_account: '000401234567',
        bank_ifsc: 'ICIC0000004',
        bank_branch: 'Indiranagar',
        bank_type: 'Savings',
        created_at: now,
        updated_at: now
      },
      {
        employee_code: 'HSR-103',
        first_name: 'Sia',
        middle_name: '',
        last_name: 'Fernandes',
        phone: '+91 98765 40003',
        email: 'sia.fernandes@glowy.com',
        personal_email: 'sia.f@gmail.com',
        dob: '1997-11-05',
        gender: 'Female',
        marital_status: 'Single',
        biometric_code: 'BIO-103',
        joining_date: '2026-01-15',
        role_id: roleReceptionLead,
        assigned_outlet_id: hsrOutletId,
        onboarding_status: 'approved',
        street: 'Sector 3, HSR Layout',
        city: 'Bengaluru',
        state: 'Karnataka',
        country: 'IN',
        pincode: '560102',
        bank_holder: 'Sia Fernandes',
        bank_name: 'Axis Bank',
        bank_account: '915010023456789',
        bank_ifsc: 'UTIB0000010',
        bank_branch: 'HSR Layout',
        bank_type: 'Savings',
        created_at: now,
        updated_at: now
      }
    ]);

    const [staff] = await queryInterface.sequelize.query(`SELECT id, first_name FROM staff_members`);
    const nainaId = staff.find(s => s.first_name === 'Naina').id;
    const rohanId = staff.find(s => s.first_name === 'Rohan').id;
    const siaId = staff.find(s => s.first_name === 'Sia').id;

    // 12. Contract Groups
    await queryInterface.bulkInsert('contract_groups', [
      { name: 'Senior Stylists Group', duration: '12 Months', start_date: '2026-01-01', end_date: '2026-12-31', employee_id: nainaId, created_at: now, updated_at: now },
      { name: 'Support Staff Group', duration: '6 Months', start_date: '2026-01-01', end_date: '2026-06-30', employee_id: siaId, created_at: now, updated_at: now }
    ]);

    const [groups] = await queryInterface.sequelize.query(`SELECT id, name FROM contract_groups`);
    const grpSeniorId = groups.find(g => g.name === 'Senior Stylists Group').id;

    // 13. Contracts
    await queryInterface.bulkInsert('contracts', [
      {
        code: 'CON-2026-001',
        title: 'Senior Stylist Agreement',
        employee_id: nainaId,
        group_id: grpSeniorId,
        type_id: ctFullTime,
        template_id: tempStandard,
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        status: 'active',
        notes: 'Annual contract with performance review',
        shift_id: shiftStandardDay,
        work_week_id: wwStandard,
        overtime_enabled: true,
        overtime_type: '1.5x',
        overtime_calculation: 'fixed_hourly',
        overtime_rate: 200.00,
        current_version: 1,
        created_at: now,
        updated_at: now
      },
      {
        code: 'CON-2026-002',
        title: 'Color Specialist Agreement',
        employee_id: rohanId,
        group_id: grpSeniorId,
        type_id: ctFullTime,
        template_id: tempStandard,
        start_date: '2026-02-01',
        end_date: '2027-01-31',
        status: 'active',
        notes: 'Specialist role with commission structure',
        shift_id: shiftStandardDay,
        work_week_id: wwStandard,
        overtime_enabled: true,
        overtime_type: '1.5x',
        overtime_calculation: 'fixed_hourly',
        overtime_rate: 225.00,
        current_version: 1,
        created_at: now,
        updated_at: now
      },
      {
        code: 'CON-2026-003',
        title: 'Reception Lead Agreement',
        employee_id: siaId,
        group_id: null,
        type_id: ctFullTime,
        template_id: tempStandard,
        start_date: '2026-01-15',
        end_date: '2026-12-31',
        status: 'active',
        notes: 'Front desk management role',
        shift_id: shiftStandardDay,
        work_week_id: wwStandard,
        overtime_enabled: false,
        overtime_type: 'none',
        overtime_calculation: 'fixed_hourly',
        overtime_rate: 0.00,
        current_version: 1,
        created_at: now,
        updated_at: now
      }
    ]);

    const [contractsList] = await queryInterface.sequelize.query(`SELECT id, code FROM contracts`);
    const nainaContractId = contractsList.find(c => c.code === 'CON-2026-001').id;
    const rohanContractId = contractsList.find(c => c.code === 'CON-2026-002').id;
    const siaContractId = contractsList.find(c => c.code === 'CON-2026-003').id;

    // 14. Contract Salary Mappings
    await queryInterface.bulkInsert('contract_salary_mappings', [
      { contract_id: nainaContractId, salary_component_id: salBasicId, custom_amount: 32000.00, created_at: now, updated_at: now },
      { contract_id: rohanContractId, salary_component_id: salBasicId, custom_amount: 36000.00, created_at: now, updated_at: now },
      { contract_id: siaContractId, salary_component_id: salBasicId, custom_amount: 24000.00, created_at: now, updated_at: now }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('contract_salary_mappings', null, {});
    await queryInterface.bulkDelete('contracts', null, {});
    await queryInterface.bulkDelete('contract_groups', null, {});
    await queryInterface.bulkDelete('staff_members', null, {});
    await queryInterface.bulkDelete('salary_component_masters', null, {});
    await queryInterface.bulkDelete('holiday_occasions', null, {});
    await queryInterface.bulkDelete('holiday_templates', null, {});
    await queryInterface.bulkDelete('contract_type_templates', null, {});
    await queryInterface.bulkDelete('contract_types', null, {});
    await queryInterface.bulkDelete('work_weeks', null, {});
    await queryInterface.bulkDelete('leave_types', null, {});
    await queryInterface.bulkDelete('shifts', null, {});
    await queryInterface.bulkDelete('roles', null, {});
  }
};
