import { MenuItem, TextField } from '@mui/material';

interface FilterSelectProps {
  id: string;
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

/** A dropdown whose empty value means "All". */
export function FilterSelect({ id, label, value, options, onChange }: FilterSelectProps) {
  return (
    <TextField
      id={id}
      select
      size="small"
      label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      sx={{ minWidth: 160 }}
    >
      <MenuItem value="">All</MenuItem>
      {options.map((option) => (
        <MenuItem key={option} value={option}>
          {option}
        </MenuItem>
      ))}
    </TextField>
  );
}
