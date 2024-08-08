"use client";
import { useLocale } from "next-intl";
import { Dropdown, DropdownChangeEvent } from "primereact/dropdown";
import React, { useState } from "react";

interface Language {
  label: string;
  code: string;
  flag: string
}

const LOCALES = [{ label: "English", code: "en", flag: "uk" }, { label: "Türkçe", code: "tr", flag: "tr" }];
const TR_LOCALE = "tr";

export default function LanguageSwitcher() {
  const locale = useLocale();
  const [item, setItem] = useState<Language>({
    label: locale === TR_LOCALE ? "Türkçe" : "English", code: locale, flag: locale === TR_LOCALE ? "tr" : "uk"
  });

  const onLocaleChange = (event: DropdownChangeEvent): void => {
    if (event) {
      setItem(event.value);
      location.href = location.href.replace(`/${locale}`, `/${event.value.code}`);
    }
  }

  const valueTemplate = (option: { label: string, code: string, flag: string }, props: any) => {
    if (option) {
      return (
        <div className="flex align-items-center">
          <img
            alt={option.label}
            src={`/app/images/flag/flag_placeholder.png`}
            className={`mr-2 flag flag-${option.flag.toLowerCase()}`}
            style={{ width: '21px' }} />
          <div>{option.label}</div>
        </div>
      );
    }

    return <span>{props.placeholder}</span>;
  };

  const itemTemplate = (option: { label: string, code: string, flag: string }) => {
    return (
      <div className="flex align-items-center">
        <img
          alt={option.label}
          src={`/app/images/flag/flag_placeholder.png`}
          className={`flag flag-${option.flag.toLowerCase()}`}
          style={{ width: "21px" }}
        />
        <span className="ml-2">{option.label}</span>
      </div>
    );
  };

  return (
    <div>
      <Dropdown id="locale" name='locale' value={item} onChange={onLocaleChange} options={LOCALES} optionLabel="label"
        valueTemplate={valueTemplate} itemTemplate={itemTemplate} className="w-full md:w-14rem" />
    </div>
  );
}