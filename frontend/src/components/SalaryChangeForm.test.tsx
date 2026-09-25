import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ApiError, type NewSalaryRecord } from '../api';
import { SalaryChangeForm } from './SalaryChangeForm';

function renderForm(
  onSubmit: (record: NewSalaryRecord) => Promise<void> = vi.fn().mockResolvedValue(undefined),
) {
  render(
    <SalaryChangeForm currencies={['INR', 'USD']} defaultCurrency="INR" today="2026-06-30" onSubmit={onSubmit} />,
  );
  return { onSubmit, user: userEvent.setup() };
}

describe('SalaryChangeForm', () => {
  it("submits a raise, defaulting to today's date and the employee's currency", async () => {
    const { onSubmit, user } = renderForm();

    await user.type(screen.getByLabelText('New annual salary'), '2700000');
    await user.type(screen.getByLabelText('Note (optional)'), '  Promotion ');
    await user.click(screen.getByRole('button', { name: 'Record salary change' }));

    expect(onSubmit).toHaveBeenCalledWith({
      amount: 2_700_000,
      currencyCode: 'INR',
      effectiveDate: '2026-06-30',
      changeType: 'raise',
      note: 'Promotion',
    });
  });

  it('blocks a non-positive amount without calling the API', async () => {
    const { onSubmit, user } = renderForm();

    await user.type(screen.getByLabelText('New annual salary'), '0');
    await user.click(screen.getByRole('button', { name: 'Record salary change' }));

    expect(screen.getByText('Enter a positive whole number')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('blocks a future effective date', async () => {
    const { onSubmit, user } = renderForm();

    await user.type(screen.getByLabelText('New annual salary'), '100000');
    fireEvent.change(screen.getByLabelText('Effective date'), { target: { value: '2026-07-01' } });
    await user.click(screen.getByRole('button', { name: 'Record salary change' }));

    expect(screen.getByText('Cannot be in the future')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows field errors returned by the server next to the field', async () => {
    const { user } = renderForm(
      vi.fn().mockRejectedValue(
        new ApiError(400, 'Validation failed', { effectiveDate: 'cannot be before the hire date' }),
      ),
    );

    await user.type(screen.getByLabelText('New annual salary'), '100000');
    await user.click(screen.getByRole('button', { name: 'Record salary change' }));

    expect(await screen.findByText('cannot be before the hire date')).toBeInTheDocument();
  });
});
