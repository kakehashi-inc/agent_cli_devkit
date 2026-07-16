import React from 'react';
import { Autocomplete, MenuItem, Select, TextField, Typography } from '@mui/material';
import type { SettingsFieldSpec, SettingsFieldValue } from '@shared/agents/types';

interface Props {
    field: SettingsFieldSpec;
    value: SettingsFieldValue;
    unsetLabel: string;
    enabledLabel: string;
    disabledLabel: string;
    directEditLabel: string;
    unknownValueLabel: (value: string) => string;
    onChange: (value: SettingsFieldValue) => void;
}

/** Shared value cell for editable scalar settings and direct-edit-only structural settings. */
export const SettingsValueEditor: React.FC<Props> = ({
    field,
    value,
    unsetLabel,
    enabledLabel,
    disabledLabel,
    directEditLabel,
    unknownValueLabel,
    onChange,
}) => {
    if (field.type === 'directEdit') {
        return (
            <Typography variant='body2' color='text.secondary'>
                {directEditLabel}
            </Typography>
        );
    }

    if (field.type === 'boolean') {
        const selectValue = value === true ? 'true' : value === false ? 'false' : '';
        return (
            <Select
                size='small'
                displayEmpty
                value={selectValue}
                onChange={event =>
                    onChange(event.target.value === 'true' ? true : event.target.value === 'false' ? false : undefined)
                }
                sx={{ minWidth: 240 }}
            >
                <MenuItem value=''>
                    <em>{unsetLabel}</em>
                </MenuItem>
                <MenuItem value='true'>{enabledLabel}</MenuItem>
                <MenuItem value='false'>{disabledLabel}</MenuItem>
            </Select>
        );
    }

    if (field.type === 'envFlag') {
        const savedValue = typeof value === 'string' ? value : null;
        const selectValue = value === true ? 'true' : value === false ? 'false' : '__saved__';
        return (
            <Select
                size='small'
                value={selectValue}
                onChange={event =>
                    onChange(
                        event.target.value === '__saved__' && savedValue !== null
                            ? savedValue
                            : event.target.value === 'true'
                    )
                }
                sx={{ minWidth: 240 }}
            >
                <MenuItem value='true'>{enabledLabel}</MenuItem>
                <MenuItem value='false'>{disabledLabel}</MenuItem>
                {savedValue !== null && <MenuItem value='__saved__'>{unknownValueLabel(savedValue)}</MenuItem>}
            </Select>
        );
    }

    if (field.choices && field.allowCustom) {
        const stringValue = typeof value === 'string' ? value : '';
        return (
            <Autocomplete
                freeSolo
                options={['', ...field.choices]}
                value={stringValue}
                inputValue={stringValue}
                getOptionLabel={option => option || unsetLabel}
                onChange={(_event, next) => onChange(next || undefined)}
                onInputChange={(_event, next, reason) => {
                    if (reason === 'input' || reason === 'clear') onChange(next || undefined);
                }}
                renderOption={(props, option) => <li {...props}>{option ? option : <em>{unsetLabel}</em>}</li>}
                renderInput={params => <TextField {...params} size='small' />}
                sx={{ minWidth: 300 }}
            />
        );
    }

    if (field.choices) {
        const stringValue = typeof value === 'string' ? value : '';
        const isUnknown = stringValue.length > 0 && !field.choices.includes(stringValue);
        return (
            <Select
                size='small'
                displayEmpty
                value={stringValue}
                onChange={event => onChange(event.target.value || undefined)}
                sx={{ minWidth: 240 }}
            >
                <MenuItem value=''>
                    <em>{unsetLabel}</em>
                </MenuItem>
                {isUnknown && <MenuItem value={stringValue}>{unknownValueLabel(stringValue)}</MenuItem>}
                {field.choices.map(choice => (
                    <MenuItem key={choice} value={choice}>
                        {choice}
                    </MenuItem>
                ))}
            </Select>
        );
    }

    if (field.type === 'number') {
        return (
            <TextField
                size='small'
                type='number'
                value={typeof value === 'number' ? String(value) : ''}
                onChange={event => {
                    if (event.target.value === '') {
                        onChange(undefined);
                        return;
                    }
                    const next = Number(event.target.value);
                    onChange(Number.isFinite(next) ? next : undefined);
                }}
                slotProps={{ htmlInput: { min: field.min, max: field.max, step: field.integer ? 1 : 'any' } }}
                sx={{ minWidth: 240 }}
            />
        );
    }

    return (
        <TextField
            size='small'
            value={typeof value === 'string' ? value : ''}
            onChange={event => onChange(event.target.value || undefined)}
            sx={{ minWidth: 240 }}
        />
    );
};
