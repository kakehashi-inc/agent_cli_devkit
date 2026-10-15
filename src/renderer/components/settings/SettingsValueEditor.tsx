import React, { useState } from 'react';
import { Autocomplete, MenuItem, Select, TextField, Typography } from '@mui/material';
import { settingsValueProblem } from '@shared/agents/settingsValue';
import type { SettingsFieldSpec, SettingsFieldValue } from '@shared/agents/types';

interface Props {
    field: SettingsFieldSpec;
    value: SettingsFieldValue;
    unsetLabel: string;
    enabledLabel: string;
    disabledLabel: string;
    directEditLabel: string;
    unknownValueLabel: (value: string) => string;
    // type='enum' のとき: 型付き候補を i18n 解決したラベル付きで渡す。
    enumOptions?: { value: SettingsFieldValue; label: string }[];
    onChange: (value: SettingsFieldValue) => void;
}

/** enum 候補の値を Select 用の一意な文字列キーへ変換する（型を含めて識別する）。 */
const enumKey = (value: SettingsFieldValue): string => (value === undefined ? '' : JSON.stringify(value));

// 数値として受け付ける表記（符号・小数点・指数を含む 10 進数）。
const DECIMAL_TEXT = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;

/** 数値欄の文字列を値にする。空は未設定、数値として読めない文字列は NaN（形式に合わない値として扱われる）。 */
const parseNumberText = (text: string): number | undefined => {
    const trimmed = text.trim();
    if (trimmed === '') return undefined;
    return DECIMAL_TEXT.test(trimmed) ? Number(trimmed) : Number.NaN;
};

/** 値を数値欄の文字列にする。有限の数値以外は空にする。 */
const formatNumberText = (value: SettingsFieldValue): string =>
    typeof value === 'number' && Number.isFinite(value) ? String(value) : '';

/**
 * 数値項目の入力欄。入力中の文字列（「0.」「-」など数値として未完成のものを含む）をそのまま表示し、
 * 入力のたびに数値へ変換した値を onChange へ渡す。value が別の値に置き換えられたときは、その値の表記を表示する。
 * フォーカスを外すと、有効な数値は標準の表記にそろえ、受け付けない値（形式・範囲）はエラー表示にする。
 */
const NumberValueInput: React.FC<{
    field: SettingsFieldSpec;
    value: SettingsFieldValue;
    onChange: (value: SettingsFieldValue) => void;
}> = ({ field, value, onChange }) => {
    const [text, setText] = useState(() => formatNumberText(value));
    // text が表している値。value がこれと異なれば、外から置き換えられたものとして表示を作り直す。
    const [textValue, setTextValue] = useState<SettingsFieldValue>(value);
    const [focused, setFocused] = useState(false);
    if (!Object.is(value, textValue)) {
        setTextValue(value);
        setText(formatNumberText(value));
    }
    return (
        <TextField
            size='small'
            value={text}
            error={!focused && settingsValueProblem(field, value) !== null}
            onChange={event => {
                const next = parseNumberText(event.target.value);
                setText(event.target.value);
                setTextValue(next);
                onChange(next);
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => {
                setFocused(false);
                if (typeof value === 'number' && Number.isFinite(value)) setText(String(value));
            }}
            slotProps={{ htmlInput: { inputMode: field.integer ? 'numeric' : 'decimal' } }}
            sx={{ minWidth: 240 }}
        />
    );
};

/** Shared value cell for editable scalar settings and direct-edit-only structural settings. */
export const SettingsValueEditor: React.FC<Props> = ({
    field,
    value,
    unsetLabel,
    enabledLabel,
    disabledLabel,
    directEditLabel,
    unknownValueLabel,
    enumOptions,
    onChange,
}) => {
    if (field.type === 'directEdit') {
        return (
            <Typography variant='body2' color='text.secondary'>
                {directEditLabel}
            </Typography>
        );
    }

    if (field.type === 'enum') {
        const options = enumOptions ?? [];
        const currentKey = enumKey(value);
        const known = options.some(option => enumKey(option.value) === currentKey);
        return (
            <Select
                size='small'
                displayEmpty
                value={value === undefined ? '' : currentKey}
                onChange={event => {
                    const key = event.target.value;
                    if (key === '') {
                        onChange(undefined);
                        return;
                    }
                    const option = options.find(item => enumKey(item.value) === key);
                    onChange(option ? option.value : undefined);
                }}
                sx={{ minWidth: 240 }}
            >
                <MenuItem value=''>
                    <em>{unsetLabel}</em>
                </MenuItem>
                {!known && value !== undefined && (
                    <MenuItem value={currentKey}>{unknownValueLabel(String(value))}</MenuItem>
                )}
                {options.map(option => (
                    <MenuItem key={enumKey(option.value)} value={enumKey(option.value)}>
                        {option.label}
                    </MenuItem>
                ))}
            </Select>
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
        return <NumberValueInput field={field} value={value} onChange={onChange} />;
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
