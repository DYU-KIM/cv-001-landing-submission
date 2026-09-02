"use client";

import type { ReactNode } from "react";
import { graphemeLength } from "@/lib/validation";
import type { Option } from "@/lib/contract";

/** 참조 시스템의 버튼 기하: 높이 56px, 라운드 16px, 17px/600. 그림자는 쓰지 않는다. */
const CONTROL =
  "flex w-full items-center gap-3 rounded-2xl border px-5 py-4 text-left transition";

export function Field({
  label,
  hint,
  error,
  optional,
  children,
}: {
  label?: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <fieldset className="mb-8 border-0 p-0">
      {label ? (
        <legend className="mb-1 text-base font-semibold">
          {label}
          {optional ? (
            <span className="ml-2 align-middle text-sm font-normal text-muted">
              선택
            </span>
          ) : null}
        </legend>
      ) : null}
      {hint ? <p className="mb-3 text-sm text-muted">{hint}</p> : null}
      <div className="mt-3">{children}</div>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

const choiceClass = (selected: boolean) =>
  [
    CONTROL,
    "items-start",
    selected
      ? "border-accent bg-weak"
      : "border-line bg-page hover:border-muted",
  ].join(" ");

export function RadioGroup({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: readonly Option[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      {options.map((option) => (
        <label key={option.value} className={choiceClass(value === option.value)}>
          <input
            type="radio"
            name={name}
            className="mt-1 h-4 w-4 shrink-0 accent-accent"
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );
}

export function CheckboxGroup({
  options,
  values,
  onChange,
  max,
}: {
  options: readonly Option[];
  values: string[];
  onChange: (values: string[]) => void;
  max?: number;
}) {
  const toggle = (value: string) => {
    if (values.includes(value)) {
      onChange(values.filter((v) => v !== value));
      return;
    }
    if (max && values.length >= max) return;
    onChange([...values, value]);
  };

  return (
    <div className="grid gap-2">
      {options.map((option) => {
        const selected = values.includes(option.value);
        const blocked = !selected && max !== undefined && values.length >= max;
        return (
          <label
            key={option.value}
            className={`${choiceClass(selected)} ${blocked ? "opacity-45" : ""}`}
          >
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 shrink-0 accent-accent"
              checked={selected}
              disabled={blocked}
              onChange={() => toggle(option.value)}
            />
            <span>{option.label}</span>
          </label>
        );
      })}
      {max ? (
        <p className="text-sm text-muted">
          최대 {max}개까지 선택할 수 있습니다. ({values.length}/{max})
        </p>
      ) : null}
    </div>
  );
}

/** 선택한 순서를 그대로 기록하는 다중 선택. (Q-SRC-02) */
export function OrderedPicker({
  options,
  values,
  onChange,
  max,
  exclusive,
}: {
  options: readonly Option[];
  values: string[];
  onChange: (values: string[]) => void;
  max: number;
  exclusive?: string;
}) {
  const toggle = (value: string) => {
    if (values.includes(value)) {
      onChange(values.filter((v) => v !== value));
      return;
    }
    if (exclusive && value === exclusive) {
      onChange([exclusive]);
      return;
    }
    const base = exclusive ? values.filter((v) => v !== exclusive) : values;
    if (base.length >= max) return;
    onChange([...base, value]);
  };

  return (
    <div className="grid gap-2">
      {options.map((option) => {
        const index = values.indexOf(option.value);
        const selected = index >= 0;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => toggle(option.value)}
            className={choiceClass(selected)}
            aria-pressed={selected}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${
                selected
                  ? "bg-accent text-accent-ink"
                  : "border border-line text-muted"
              }`}
            >
              {selected ? index + 1 : ""}
            </span>
            <span>{option.label}</span>
          </button>
        );
      })}
      <p className="text-sm text-muted">
        확인한 순서대로 눌러주세요. 최대 {max}개까지 선택할 수 있습니다.
      </p>
    </div>
  );
}

export function TextArea({
  value,
  onChange,
  max,
  placeholder,
  rows = 4,
}: {
  value: string;
  onChange: (value: string) => void;
  max: number;
  placeholder?: string;
  rows?: number;
}) {
  const used = graphemeLength(value);
  return (
    <div>
      <textarea
        className="w-full rounded-2xl border border-line bg-page px-5 py-4 outline-none focus:border-accent"
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      <p
        className={`mt-1 text-right text-sm ${used > max ? "text-danger" : "text-muted"}`}
      >
        {used} / {max}
      </p>
    </div>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  max,
  inputMode,
  min,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  max?: number;
  inputMode?: "text" | "email";
  min?: string;
}) {
  return (
    <div>
      <input
        type={type}
        inputMode={inputMode}
        min={min}
        className="h-14 w-full rounded-2xl border border-line bg-page px-5 outline-none focus:border-accent"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {max ? (
        <p
          className={`mt-1 text-right text-sm ${
            graphemeLength(value) > max ? "text-danger" : "text-muted"
          }`}
        >
          {graphemeLength(value)} / {max}
        </p>
      ) : null}
    </div>
  );
}

export function Check({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className={choiceClass(checked)}>
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 shrink-0 accent-accent"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{children}</span>
    </label>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="h-14 w-full rounded-2xl bg-accent px-5 text-[17px] font-semibold text-accent-ink transition hover:bg-accent-hover disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function QuietButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-14 w-full rounded-2xl border border-line px-5 text-[17px] font-semibold text-body transition hover:border-muted"
    >
      {children}
    </button>
  );
}

/** 저장 실패 시 입력을 유지한 채 재시도를 제공한다. (contract Error And Edge States) */
export function SaveError({
  message,
  onRetry,
  retrying,
}: {
  message: string;
  onRetry: () => void;
  retrying: boolean;
}) {
  return (
    <div role="alert" className="mb-6 rounded-2xl bg-surface p-5">
      <p className="text-sm text-danger">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className="mt-3 rounded-xl border border-danger px-4 py-2 text-sm font-semibold text-danger disabled:opacity-50"
      >
        {retrying ? "다시 저장하는 중…" : "다시 저장"}
      </button>
    </div>
  );
}

/** 개인정보 고지표. 계약서 Required privacy summary 를 그대로 렌더링한다. */
export function PrivacyTable({
  rows,
}: {
  rows: readonly { item: string; notice: string }[];
}) {
  return (
    <dl className="grid gap-3 rounded-2xl bg-surface p-5 text-sm">
      {rows.map((row) => (
        <div key={row.item} className="grid gap-1">
          <dt className="font-semibold text-ink">{row.item}</dt>
          <dd className="m-0 text-body">{row.notice}</dd>
        </div>
      ))}
    </dl>
  );
}
