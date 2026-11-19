-- SQL Server. Run against the project's glowy_salon2 database.
-- Retains employee attendance and the newer contract's leave requests.
-- Removes the older contract, its salary mappings and any non-approved requests.
-- Removing CON-D495V also removes this employee's Jan-Sep 2026 contract coverage.
USE [glowy_salon2];
GO
SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @OldId int, @KeepId int, @StaffId int;
    DECLARE @OldStart date, @OldEnd date, @KeepEnd date;
    DECLARE @NewStart date = '20261001';

    SELECT @OldId = id, @OldStart = start_date, @OldEnd = end_date
    FROM dbo.contracts WITH (UPDLOCK, HOLDLOCK)
    WHERE code = 'CON-D495V';

    SELECT @KeepId = id, @StaffId = employee_id, @KeepEnd = end_date
    FROM dbo.contracts WITH (UPDLOCK, HOLDLOCK)
    WHERE code = 'CON-2026-A8E16037197835C7';

    IF @OldId IS NULL OR @KeepId IS NULL
        THROW 50001, 'Both specified contracts must exist. No changes were made.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.contracts WHERE id = @OldId AND employee_id = @StaffId)
        THROW 50002, 'The contracts belong to different employees.', 1;

    IF @KeepEnd IS NOT NULL AND @KeepEnd < @NewStart
        THROW 50003, 'The retained contract ends before the requested start date.', 1;

    IF EXISTS (
        SELECT 1 FROM dbo.contracts
        WHERE employee_id = @StaffId AND id NOT IN (@OldId, @KeepId)
          AND status = 'active' AND start_date <= ISNULL(@KeepEnd, '99991231')
          AND (end_date IS NULL OR end_date >= @NewStart)
    ) THROW 50004, 'Another active contract overlaps the revised period.', 1;

    IF EXISTS (SELECT 1 FROM dbo.contracts WHERE previous_contract_id = @OldId AND id <> @KeepId)
        THROW 50005, 'Another revision depends on the old contract.', 1;

    IF EXISTS (SELECT 1 FROM dbo.leave_requests WHERE contract_id = @OldId AND status = 'approved')
        THROW 50006, 'Approved leave belongs to the old contract. Reconcile that leave before deleting it.', 1;

    IF EXISTS (
        SELECT 1 FROM dbo.salary_calculations
        WHERE staff_id = @StaffId AND status = 'finalized'
          AND month_key >= CONVERT(char(7), @OldStart, 120)
          AND month_key <= CONVERT(char(7), ISNULL(@OldEnd, @NewStart), 120)
    ) THROW 50007, 'Finalized payroll depends on this contract period. No changes were made.', 1;

    -- Drafts covering the removed/revised historical period need recalculation.
    DELETE FROM dbo.salary_calculations
    WHERE staff_id = @StaffId AND status = 'draft'
      AND month_key >= CONVERT(char(7), @OldStart, 120)
      AND month_key <= CONVERT(char(7), ISNULL(@OldEnd, @NewStart), 120);

    UPDATE dbo.contracts
    SET start_date = @NewStart,
        previous_contract_id = CASE WHEN previous_contract_id = @OldId THEN NULL ELSE previous_contract_id END,
        updated_at = SYSDATETIMEOFFSET()
    WHERE id = @KeepId;

    DELETE FROM dbo.leave_requests WHERE contract_id = @OldId;
    DELETE FROM dbo.contract_salary_mappings WHERE contract_id = @OldId;
    DELETE FROM dbo.contracts WHERE id = @OldId;

    IF EXISTS (SELECT 1 FROM dbo.contract_salary_mappings WHERE contract_id = @OldId)
       OR EXISTS (SELECT 1 FROM dbo.leave_requests WHERE contract_id = @OldId)
       OR EXISTS (SELECT 1 FROM dbo.contracts WHERE id = @OldId OR previous_contract_id = @OldId)
        THROW 50008, 'An old-contract reference remains. The transaction was rolled back.', 1;

    COMMIT TRANSACTION;

    SELECT id, code, employee_id, start_date, end_date, previous_contract_id
    FROM dbo.contracts WHERE employee_id = @StaffId;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
